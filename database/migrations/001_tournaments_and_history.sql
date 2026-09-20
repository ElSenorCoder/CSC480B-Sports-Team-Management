-- ==========================================================================
-- Migration 001: tournaments, tournament standings and history logging
-- ==========================================================================
-- Upgrades an EXISTING sports_team_management database in place. Unlike
-- sports_team_management_database.sql it never drops anything: every row in
-- your tables is kept.
--
-- Adds
--   * tournament and tournament_standings tables
--   * games.round, games.tournament_id, games.descriptions
--   * audit_log (history of changes) and schema_migrations (this file's record)
--   * triggers that keep tournament standings up to date and log changes to
--     games, tournament, tournament_standings, teams, team_memberships and
--     team_join_requests
--   * view_game_history, view_player_history, and a new view_teams_with_games
--     (home_team / away_team are now home_team_name / away_team_name)
--
-- Safe to run more than once. History starts when this runs: changes made
-- before it are not in audit_log.
--
-- BEFORE RUNNING, back up the database:
--   mysqldump -u root --routines --triggers sports_team_management > backup.sql
--
-- Run it (the app can stay up; the change takes a moment):
--   mysql -u root sports_team_management < database/migrations/001_tournaments_and_history.sql
--
-- To undo, restore the backup. There is deliberately no automatic rollback:
-- dropping these tables would also delete tournaments and history.
-- ==========================================================================

USE sports_team_management;

-- ==========================================
-- 1. Helper for re-runnable ALTERs (removed at the end)
-- ==========================================
-- MySQL has no "ADD COLUMN IF NOT EXISTS", so check information_schema first.

DELIMITER //

DROP PROCEDURE IF EXISTS sp_migration_alter_if_missing //

CREATE PROCEDURE sp_migration_alter_if_missing(
    IN p_table VARCHAR(64),
    IN p_kind VARCHAR(16),   -- 'column', 'index' or 'constraint'
    IN p_name VARCHAR(64),
    IN p_clause VARCHAR(1024)
)
BEGIN
    DECLARE v_found INT DEFAULT 0;

    IF p_kind = 'column' THEN
        SELECT COUNT(*) INTO v_found FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = p_table AND column_name = p_name;
    ELSEIF p_kind = 'index' THEN
        SELECT COUNT(*) INTO v_found FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = p_table AND index_name = p_name;
    ELSE
        SELECT COUNT(*) INTO v_found FROM information_schema.table_constraints
        WHERE table_schema = DATABASE() AND table_name = p_table AND constraint_name = p_name;
    END IF;

    IF v_found = 0 THEN
        SET @migration_ddl = CONCAT('ALTER TABLE `', p_table, '` ', p_clause);
        PREPARE migration_stmt FROM @migration_ddl;
        EXECUTE migration_stmt;
        DEALLOCATE PREPARE migration_stmt;
    END IF;
END //

DELIMITER ;

-- ==========================================
-- 2. Tables and columns
-- ==========================================

CREATE TABLE IF NOT EXISTS tournament (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  status ENUM('upcoming', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'upcoming',
  date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tournament_user_id (user_id),
  CONSTRAINT fk_tournament_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- Existing games keep their data; the new columns are NULL for them.
CALL sp_migration_alter_if_missing('games', 'column', 'round',
    'ADD COLUMN round INT NULL AFTER away_team_score');
CALL sp_migration_alter_if_missing('games', 'column', 'tournament_id',
    'ADD COLUMN tournament_id BIGINT UNSIGNED NULL AFTER round');
CALL sp_migration_alter_if_missing('games', 'column', 'descriptions',
    'ADD COLUMN descriptions VARCHAR(255) NULL AFTER tournament_id');
CALL sp_migration_alter_if_missing('games', 'index', 'idx_games_tournament_id',
    'ADD KEY idx_games_tournament_id (tournament_id)');
CALL sp_migration_alter_if_missing('games', 'constraint', 'fk_games_tournament',
    'ADD CONSTRAINT fk_games_tournament FOREIGN KEY (tournament_id) REFERENCES tournament (id) ON DELETE CASCADE ON UPDATE CASCADE');

CREATE TABLE IF NOT EXISTS tournament_standings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tournament_id BIGINT UNSIGNED NOT NULL,
  team_id BIGINT UNSIGNED NOT NULL,
  win INT UNSIGNED NOT NULL DEFAULT 0,
  loss INT UNSIGNED NOT NULL DEFAULT 0,
  draw INT UNSIGNED NOT NULL DEFAULT 0,
  score INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tournament_team (tournament_id, team_id),
  KEY idx_standings_tournament_id (tournament_id),
  KEY idx_standings_team_id (team_id),
  CONSTRAINT fk_standings_tournament
    FOREIGN KEY (tournament_id) REFERENCES tournament (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_standings_team
    FOREIGN KEY (team_id) REFERENCES teams (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  table_name VARCHAR(64) NOT NULL,
  record_id BIGINT UNSIGNED NOT NULL,
  action ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  changed_by VARCHAR(255) NOT NULL,
  changed_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_audit_record (table_name, record_id, id),
  KEY idx_audit_changed_at (changed_at)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(64) NOT NULL,
  description VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version)
) ENGINE = InnoDB;

-- ==========================================
-- 3. Views
-- ==========================================

-- The old view exposed home_team / away_team and had no tournament columns.
CREATE OR REPLACE VIEW view_teams_with_games AS
SELECT 
    g.id AS game_id,
    ht.id AS home_team_id,
    ht.name AS home_team_name,
    gt.id AS away_team_id,
    gt.name AS away_team_name,
    g.game_date,
    g.location,
    g.home_team_score,
    g.away_team_score,
    g.round,
    g.tournament_id,
    g.descriptions,
    CASE 
        WHEN g.game_date > NOW() THEN 'scheduled'
        ELSE 'completed'
    END AS status
FROM games g
INNER JOIN teams ht ON g.home_team_id = ht.id
INNER JOIN teams gt ON g.away_team_id = gt.id;

-- ==========================================
-- 4. HISTORY LOGGING AND TOURNAMENT STANDINGS
-- ==========================================
-- MySQL does not fire triggers for rows removed by a foreign-key CASCADE:
-- deleting a tournament (or team) logs that one row, not the games and
-- standings rows that go with it.

DELIMITER //

-- Standings are derived from the tournament's decided games (scores differ;
-- equal scores mean "not played yet"). Recomputing from scratch means the
-- standings can never drift, whoever changed the games.
DROP PROCEDURE IF EXISTS sp_recalculate_tournament_standings //

CREATE PROCEDURE sp_recalculate_tournament_standings(IN p_tournament_id BIGINT UNSIGNED)
BEGIN
    UPDATE tournament_standings s
    SET s.win = (
            SELECT COUNT(*)
            FROM games g
            WHERE g.tournament_id = s.tournament_id
              AND ((g.home_team_id = s.team_id AND g.home_team_score > g.away_team_score)
                OR (g.away_team_id = s.team_id AND g.away_team_score > g.home_team_score))
        ),
        s.loss = (
            SELECT COUNT(*)
            FROM games g
            WHERE g.tournament_id = s.tournament_id
              AND ((g.home_team_id = s.team_id AND g.home_team_score < g.away_team_score)
                OR (g.away_team_id = s.team_id AND g.away_team_score < g.home_team_score))
        ),
        s.score = (
            SELECT COALESCE(SUM(CASE WHEN g.home_team_id = s.team_id
                                     THEN g.home_team_score ELSE g.away_team_score END), 0)
            FROM games g
            WHERE g.tournament_id = s.tournament_id
              AND g.home_team_score <> g.away_team_score
              AND (g.home_team_id = s.team_id OR g.away_team_id = s.team_id)
        )
    WHERE s.tournament_id = p_tournament_id;
END //

-- History: every insert, update (only when a logged column changed) and
-- delete on these tables is recorded in audit_log, no matter which client
-- made the change. Passwords, sessions and messages are never logged.

-- games
DROP TRIGGER IF EXISTS trg_games_audit_insert //
CREATE TRIGGER trg_games_audit_insert
AFTER INSERT ON games
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, new_values, changed_by)
    VALUES ('games', NEW.id, 'INSERT', JSON_OBJECT(
            'id', NEW.id,
            'home_team_id', NEW.home_team_id,
            'away_team_id', NEW.away_team_id,
            'game_date', NEW.game_date,
            'location', NEW.location,
            'home_team_score', NEW.home_team_score,
            'away_team_score', NEW.away_team_score,
            'round', NEW.round,
            'tournament_id', NEW.tournament_id,
            'descriptions', NEW.descriptions
        ), CURRENT_USER());
END //

DROP TRIGGER IF EXISTS trg_games_audit_update //
CREATE TRIGGER trg_games_audit_update
AFTER UPDATE ON games
FOR EACH ROW
BEGIN
    DECLARE v_old JSON;
    DECLARE v_new JSON;

    SET v_old = JSON_OBJECT(
            'id', OLD.id,
            'home_team_id', OLD.home_team_id,
            'away_team_id', OLD.away_team_id,
            'game_date', OLD.game_date,
            'location', OLD.location,
            'home_team_score', OLD.home_team_score,
            'away_team_score', OLD.away_team_score,
            'round', OLD.round,
            'tournament_id', OLD.tournament_id,
            'descriptions', OLD.descriptions
        );
    SET v_new = JSON_OBJECT(
            'id', NEW.id,
            'home_team_id', NEW.home_team_id,
            'away_team_id', NEW.away_team_id,
            'game_date', NEW.game_date,
            'location', NEW.location,
            'home_team_score', NEW.home_team_score,
            'away_team_score', NEW.away_team_score,
            'round', NEW.round,
            'tournament_id', NEW.tournament_id,
            'descriptions', NEW.descriptions
        );

    IF v_old <> v_new THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('games', NEW.id, 'UPDATE', v_old, v_new, CURRENT_USER());
    END IF;
END //

DROP TRIGGER IF EXISTS trg_games_audit_delete //
CREATE TRIGGER trg_games_audit_delete
AFTER DELETE ON games
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_values, changed_by)
    VALUES ('games', OLD.id, 'DELETE', JSON_OBJECT(
            'id', OLD.id,
            'home_team_id', OLD.home_team_id,
            'away_team_id', OLD.away_team_id,
            'game_date', OLD.game_date,
            'location', OLD.location,
            'home_team_score', OLD.home_team_score,
            'away_team_score', OLD.away_team_score,
            'round', OLD.round,
            'tournament_id', OLD.tournament_id,
            'descriptions', OLD.descriptions
        ), CURRENT_USER());
END //

-- tournament
DROP TRIGGER IF EXISTS trg_tournament_audit_insert //
CREATE TRIGGER trg_tournament_audit_insert
AFTER INSERT ON tournament
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, new_values, changed_by)
    VALUES ('tournament', NEW.id, 'INSERT', JSON_OBJECT(
            'id', NEW.id,
            'user_id', NEW.user_id,
            'name', NEW.name,
            'status', NEW.status
        ), CURRENT_USER());
END //

DROP TRIGGER IF EXISTS trg_tournament_audit_update //
CREATE TRIGGER trg_tournament_audit_update
AFTER UPDATE ON tournament
FOR EACH ROW
BEGIN
    DECLARE v_old JSON;
    DECLARE v_new JSON;

    SET v_old = JSON_OBJECT(
            'id', OLD.id,
            'user_id', OLD.user_id,
            'name', OLD.name,
            'status', OLD.status
        );
    SET v_new = JSON_OBJECT(
            'id', NEW.id,
            'user_id', NEW.user_id,
            'name', NEW.name,
            'status', NEW.status
        );

    IF v_old <> v_new THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('tournament', NEW.id, 'UPDATE', v_old, v_new, CURRENT_USER());
    END IF;
END //

DROP TRIGGER IF EXISTS trg_tournament_audit_delete //
CREATE TRIGGER trg_tournament_audit_delete
AFTER DELETE ON tournament
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_values, changed_by)
    VALUES ('tournament', OLD.id, 'DELETE', JSON_OBJECT(
            'id', OLD.id,
            'user_id', OLD.user_id,
            'name', OLD.name,
            'status', OLD.status
        ), CURRENT_USER());
END //

-- tournament_standings
DROP TRIGGER IF EXISTS trg_tournament_standings_audit_insert //
CREATE TRIGGER trg_tournament_standings_audit_insert
AFTER INSERT ON tournament_standings
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, new_values, changed_by)
    VALUES ('tournament_standings', NEW.id, 'INSERT', JSON_OBJECT(
            'id', NEW.id,
            'tournament_id', NEW.tournament_id,
            'team_id', NEW.team_id,
            'win', NEW.win,
            'loss', NEW.loss,
            'draw', NEW.draw,
            'score', NEW.score
        ), CURRENT_USER());
END //

DROP TRIGGER IF EXISTS trg_tournament_standings_audit_update //
CREATE TRIGGER trg_tournament_standings_audit_update
AFTER UPDATE ON tournament_standings
FOR EACH ROW
BEGIN
    DECLARE v_old JSON;
    DECLARE v_new JSON;

    SET v_old = JSON_OBJECT(
            'id', OLD.id,
            'tournament_id', OLD.tournament_id,
            'team_id', OLD.team_id,
            'win', OLD.win,
            'loss', OLD.loss,
            'draw', OLD.draw,
            'score', OLD.score
        );
    SET v_new = JSON_OBJECT(
            'id', NEW.id,
            'tournament_id', NEW.tournament_id,
            'team_id', NEW.team_id,
            'win', NEW.win,
            'loss', NEW.loss,
            'draw', NEW.draw,
            'score', NEW.score
        );

    IF v_old <> v_new THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('tournament_standings', NEW.id, 'UPDATE', v_old, v_new, CURRENT_USER());
    END IF;
END //

DROP TRIGGER IF EXISTS trg_tournament_standings_audit_delete //
CREATE TRIGGER trg_tournament_standings_audit_delete
AFTER DELETE ON tournament_standings
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_values, changed_by)
    VALUES ('tournament_standings', OLD.id, 'DELETE', JSON_OBJECT(
            'id', OLD.id,
            'tournament_id', OLD.tournament_id,
            'team_id', OLD.team_id,
            'win', OLD.win,
            'loss', OLD.loss,
            'draw', OLD.draw,
            'score', OLD.score
        ), CURRENT_USER());
END //

-- teams
DROP TRIGGER IF EXISTS trg_teams_audit_insert //
CREATE TRIGGER trg_teams_audit_insert
AFTER INSERT ON teams
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, new_values, changed_by)
    VALUES ('teams', NEW.id, 'INSERT', JSON_OBJECT(
            'id', NEW.id,
            'name', NEW.name,
            'description', NEW.description,
            'created_by', NEW.created_by
        ), CURRENT_USER());
END //

DROP TRIGGER IF EXISTS trg_teams_audit_update //
CREATE TRIGGER trg_teams_audit_update
AFTER UPDATE ON teams
FOR EACH ROW
BEGIN
    DECLARE v_old JSON;
    DECLARE v_new JSON;

    SET v_old = JSON_OBJECT(
            'id', OLD.id,
            'name', OLD.name,
            'description', OLD.description,
            'created_by', OLD.created_by
        );
    SET v_new = JSON_OBJECT(
            'id', NEW.id,
            'name', NEW.name,
            'description', NEW.description,
            'created_by', NEW.created_by
        );

    IF v_old <> v_new THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('teams', NEW.id, 'UPDATE', v_old, v_new, CURRENT_USER());
    END IF;
END //

DROP TRIGGER IF EXISTS trg_teams_audit_delete //
CREATE TRIGGER trg_teams_audit_delete
AFTER DELETE ON teams
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_values, changed_by)
    VALUES ('teams', OLD.id, 'DELETE', JSON_OBJECT(
            'id', OLD.id,
            'name', OLD.name,
            'description', OLD.description,
            'created_by', OLD.created_by
        ), CURRENT_USER());
END //

-- team_memberships
DROP TRIGGER IF EXISTS trg_team_memberships_audit_insert //
CREATE TRIGGER trg_team_memberships_audit_insert
AFTER INSERT ON team_memberships
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, new_values, changed_by)
    VALUES ('team_memberships', NEW.id, 'INSERT', JSON_OBJECT(
            'id', NEW.id,
            'team_id', NEW.team_id,
            'user_id', NEW.user_id,
            'role_in_team', NEW.role_in_team,
            'position', NEW.position,
            'jersey_number', NEW.jersey_number
        ), CURRENT_USER());
END //

DROP TRIGGER IF EXISTS trg_team_memberships_audit_update //
CREATE TRIGGER trg_team_memberships_audit_update
AFTER UPDATE ON team_memberships
FOR EACH ROW
BEGIN
    DECLARE v_old JSON;
    DECLARE v_new JSON;

    SET v_old = JSON_OBJECT(
            'id', OLD.id,
            'team_id', OLD.team_id,
            'user_id', OLD.user_id,
            'role_in_team', OLD.role_in_team,
            'position', OLD.position,
            'jersey_number', OLD.jersey_number
        );
    SET v_new = JSON_OBJECT(
            'id', NEW.id,
            'team_id', NEW.team_id,
            'user_id', NEW.user_id,
            'role_in_team', NEW.role_in_team,
            'position', NEW.position,
            'jersey_number', NEW.jersey_number
        );

    IF v_old <> v_new THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('team_memberships', NEW.id, 'UPDATE', v_old, v_new, CURRENT_USER());
    END IF;
END //

DROP TRIGGER IF EXISTS trg_team_memberships_audit_delete //
CREATE TRIGGER trg_team_memberships_audit_delete
AFTER DELETE ON team_memberships
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_values, changed_by)
    VALUES ('team_memberships', OLD.id, 'DELETE', JSON_OBJECT(
            'id', OLD.id,
            'team_id', OLD.team_id,
            'user_id', OLD.user_id,
            'role_in_team', OLD.role_in_team,
            'position', OLD.position,
            'jersey_number', OLD.jersey_number
        ), CURRENT_USER());
END //

-- team_join_requests
DROP TRIGGER IF EXISTS trg_team_join_requests_audit_insert //
CREATE TRIGGER trg_team_join_requests_audit_insert
AFTER INSERT ON team_join_requests
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, new_values, changed_by)
    VALUES ('team_join_requests', NEW.id, 'INSERT', JSON_OBJECT(
            'id', NEW.id,
            'team_id', NEW.team_id,
            'user_id', NEW.user_id,
            'status', NEW.status
        ), CURRENT_USER());
END //

DROP TRIGGER IF EXISTS trg_team_join_requests_audit_update //
CREATE TRIGGER trg_team_join_requests_audit_update
AFTER UPDATE ON team_join_requests
FOR EACH ROW
BEGIN
    DECLARE v_old JSON;
    DECLARE v_new JSON;

    SET v_old = JSON_OBJECT(
            'id', OLD.id,
            'team_id', OLD.team_id,
            'user_id', OLD.user_id,
            'status', OLD.status
        );
    SET v_new = JSON_OBJECT(
            'id', NEW.id,
            'team_id', NEW.team_id,
            'user_id', NEW.user_id,
            'status', NEW.status
        );

    IF v_old <> v_new THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('team_join_requests', NEW.id, 'UPDATE', v_old, v_new, CURRENT_USER());
    END IF;
END //

DROP TRIGGER IF EXISTS trg_team_join_requests_audit_delete //
CREATE TRIGGER trg_team_join_requests_audit_delete
AFTER DELETE ON team_join_requests
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_values, changed_by)
    VALUES ('team_join_requests', OLD.id, 'DELETE', JSON_OBJECT(
            'id', OLD.id,
            'team_id', OLD.team_id,
            'user_id', OLD.user_id,
            'status', OLD.status
        ), CURRENT_USER());
END //

-- Standings triggers come last so, for one game change, the game's own
-- history row is written before the standings changes it causes.
DROP TRIGGER IF EXISTS trg_games_standings_insert //
CREATE TRIGGER trg_games_standings_insert
AFTER INSERT ON games
FOR EACH ROW
BEGIN
    IF NEW.tournament_id IS NOT NULL THEN
        CALL sp_recalculate_tournament_standings(NEW.tournament_id);
    END IF;
END //

DROP TRIGGER IF EXISTS trg_games_standings_update //
CREATE TRIGGER trg_games_standings_update
AFTER UPDATE ON games
FOR EACH ROW
BEGIN
    IF NEW.tournament_id IS NOT NULL THEN
        CALL sp_recalculate_tournament_standings(NEW.tournament_id);
    END IF;
    IF OLD.tournament_id IS NOT NULL AND NOT (OLD.tournament_id <=> NEW.tournament_id) THEN
        CALL sp_recalculate_tournament_standings(OLD.tournament_id);
    END IF;
END //

DROP TRIGGER IF EXISTS trg_games_standings_delete //
CREATE TRIGGER trg_games_standings_delete
AFTER DELETE ON games
FOR EACH ROW
BEGIN
    IF OLD.tournament_id IS NOT NULL THEN
        CALL sp_recalculate_tournament_standings(OLD.tournament_id);
    END IF;
END //

DELIMITER ;

-- Readable views over audit_log.

-- Game history: schedule changes and results, with winner and loser.
CREATE OR REPLACE VIEW view_game_history AS
SELECT
    h.log_id,
    h.game_id,
    h.action,
    CASE
        WHEN h.action = 'INSERT' THEN 'game_scheduled'
        WHEN h.action = 'DELETE' THEN 'game_removed'
        WHEN h.old_home_score <=> h.new_home_score
         AND h.old_away_score <=> h.new_away_score THEN 'game_updated'
        ELSE 'score_updated'
    END AS event,
    h.tournament_id,
    h.round,
    h.home_team_id,
    ht.name AS home_team_name,
    h.away_team_id,
    awt.name AS away_team_name,
    h.old_home_score,
    h.old_away_score,
    h.new_home_score,
    h.new_away_score,
    CASE
        WHEN h.action = 'DELETE' THEN NULL
        WHEN h.new_home_score > h.new_away_score THEN ht.name
        WHEN h.new_home_score < h.new_away_score THEN awt.name
    END AS winner_name,
    CASE
        WHEN h.action = 'DELETE' THEN NULL
        WHEN h.new_home_score > h.new_away_score THEN awt.name
        WHEN h.new_home_score < h.new_away_score THEN ht.name
    END AS loser_name,
    h.changed_by,
    h.changed_at
FROM (
    SELECT
        a.id AS log_id,
        a.record_id AS game_id,
        a.action,
        a.changed_by,
        a.changed_at,
        CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(COALESCE(a.new_values, a.old_values), '$.home_team_id')), 'null') AS UNSIGNED) AS home_team_id,
        CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(COALESCE(a.new_values, a.old_values), '$.away_team_id')), 'null') AS UNSIGNED) AS away_team_id,
        CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(COALESCE(a.new_values, a.old_values), '$.tournament_id')), 'null') AS UNSIGNED) AS tournament_id,
        CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(COALESCE(a.new_values, a.old_values), '$.round')), 'null') AS UNSIGNED) AS round,
        CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(a.old_values, '$.home_team_score')), 'null') AS UNSIGNED) AS old_home_score,
        CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(a.old_values, '$.away_team_score')), 'null') AS UNSIGNED) AS old_away_score,
        CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(a.new_values, '$.home_team_score')), 'null') AS UNSIGNED) AS new_home_score,
        CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(a.new_values, '$.away_team_score')), 'null') AS UNSIGNED) AS new_away_score
    FROM audit_log a
    WHERE a.table_name = 'games'
) h
LEFT JOIN teams ht ON ht.id = h.home_team_id
LEFT JOIN teams awt ON awt.id = h.away_team_id;

-- Player history: joining and leaving teams, roster changes, join requests.
CREATE OR REPLACE VIEW view_player_history AS
SELECT
    h.log_id,
    h.user_id,
    u.first_name,
    u.last_name,
    h.team_id,
    t.name AS team_name,
    CASE
        WHEN h.source = 'team_memberships' AND h.action = 'INSERT' THEN 'joined_team'
        WHEN h.source = 'team_memberships' AND h.action = 'DELETE' THEN 'left_team'
        WHEN h.source = 'team_memberships' THEN 'roster_updated'
        WHEN h.action = 'INSERT' THEN 'join_requested'
        WHEN h.action = 'DELETE' THEN 'join_request_removed'
        WHEN h.new_status = 'approved' THEN 'join_approved'
        WHEN h.new_status = 'rejected' THEN 'join_rejected'
        ELSE 'join_request_updated'
    END AS event,
    h.old_values,
    h.new_values,
    h.changed_by,
    h.changed_at
FROM (
    SELECT
        a.id AS log_id,
        a.table_name AS source,
        a.action,
        a.old_values,
        a.new_values,
        a.changed_by,
        a.changed_at,
        CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(COALESCE(a.new_values, a.old_values), '$.user_id')), 'null') AS UNSIGNED) AS user_id,
        CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(COALESCE(a.new_values, a.old_values), '$.team_id')), 'null') AS UNSIGNED) AS team_id,
        JSON_UNQUOTE(JSON_EXTRACT(a.new_values, '$.status')) AS new_status
    FROM audit_log a
    WHERE a.table_name IN ('team_memberships', 'team_join_requests')
) h
LEFT JOIN users u ON u.id = h.user_id
LEFT JOIN teams t ON t.id = h.team_id;

-- ==========================================
-- 5. Clean up and record
-- ==========================================

DROP PROCEDURE IF EXISTS sp_migration_alter_if_missing;

INSERT IGNORE INTO schema_migrations (version, description) VALUES
  ('001', 'Tournaments, tournament standings triggers and history logging');
