DROP DATABASE IF EXISTS sports_team_management;
CREATE DATABASE IF NOT EXISTS sports_team_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE sports_team_management;

-- ==========================================
-- 1. TABLE STRUCTURES
-- ==========================================

-- 1. Roles Table
CREATE TABLE IF NOT EXISTS roles (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(32) NOT NULL,
  description VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name),
  CONSTRAINT chk_roles_name_lowercase CHECK (name = LOWER(name))
) ENGINE = InnoDB;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  role_id SMALLINT UNSIGNED NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NULL,
  date_of_birth DATE NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_id (role_id),
  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id) REFERENCES roles (id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  CONSTRAINT chk_users_is_active CHECK (is_active IN (0, 1))
) ENGINE = InnoDB;

-- 3. Parents Table (Linking parent users to player users)
CREATE TABLE IF NOT EXISTS parents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id BIGINT UNSIGNED NOT NULL,
  player_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_parent_player (parent_id, player_id),
  KEY idx_parents_parent_id (parent_id),
  KEY idx_parents_player_id (player_id),
  CONSTRAINT fk_parents_parent
    FOREIGN KEY (parent_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_parents_player
    FOREIGN KEY (player_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- 4. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_token VARCHAR(128) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_token (session_token),
  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_expires_at (expires_at)
) ENGINE = InnoDB;

-- 5. Teams Table
CREATE TABLE IF NOT EXISTS teams (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_teams_name (name),
  KEY idx_teams_created_by (created_by),
  CONSTRAINT fk_teams_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- 6. Team Memberships Table
CREATE TABLE IF NOT EXISTS team_memberships (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  team_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role_in_team ENUM('head_coach', 'assistant_coach', 'player') NOT NULL DEFAULT 'player',
  position VARCHAR(50) NULL,
  jersey_number SMALLINT UNSIGNED NULL,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_team_user (team_id, user_id),
  KEY idx_memberships_team_id (team_id),
  KEY idx_memberships_user_id (user_id),
  CONSTRAINT fk_memberships_team
    FOREIGN KEY (team_id) REFERENCES teams (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_memberships_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- 7. Team Join Requests Table
CREATE TABLE IF NOT EXISTS team_join_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  team_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_requests_team_id (team_id),
  KEY idx_requests_user_id (user_id),
  CONSTRAINT fk_requests_team
    FOREIGN KEY (team_id) REFERENCES teams (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_requests_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- 8. Tournament Table (single-elimination; user_id is the creator)
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

-- 9. Games Table
-- Tournament games set tournament_id, round (1 = first round) and descriptions
-- (e.g. 'Semi-Final Match'); regular scheduled games have no round or
-- tournament_id, and the coach schedule route labels them 'Friendly Game'.
-- A tournament game with equal scores has not been played yet (elimination
-- games cannot end in a draw).
CREATE TABLE IF NOT EXISTS games (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  home_team_id BIGINT UNSIGNED NOT NULL,
  away_team_id BIGINT UNSIGNED NOT NULL,
  game_date DATETIME NOT NULL,
  location VARCHAR(255) NULL,
  home_team_score SMALLINT UNSIGNED DEFAULT 0,
  away_team_score SMALLINT UNSIGNED DEFAULT 0,
  round INT NULL,
  tournament_id BIGINT UNSIGNED NULL,
  descriptions VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_games_home_team (home_team_id),
  KEY idx_games_away_team (away_team_id),
  KEY idx_games_date (game_date),
  KEY idx_games_tournament_id (tournament_id),
  CONSTRAINT fk_games_home_team
    FOREIGN KEY (home_team_id) REFERENCES teams (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_games_away_team
    FOREIGN KEY (away_team_id) REFERENCES teams (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_games_tournament
    FOREIGN KEY (tournament_id) REFERENCES tournament (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- 10. Tournament Standings Table
-- win/loss count decided games; draw stays 0 in single elimination;
-- score is the total points the team has scored in the tournament.
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

-- 11. Audit Log Table (append-only history written by triggers; no foreign
-- keys on purpose, so history outlives the rows it describes)
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

-- 12. Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sender_id BIGINT UNSIGNED NOT NULL,
  receiver_id BIGINT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_messages_sender_receiver_id (sender_id, receiver_id, id),
  KEY idx_messages_receiver_sender_id (receiver_id, sender_id, id),
  CONSTRAINT fk_messages_sender
    FOREIGN KEY (sender_id) REFERENCES users (id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,
  CONSTRAINT fk_messages_receiver
    FOREIGN KEY (receiver_id) REFERENCES users (id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) ENGINE = InnoDB;

-- 13. Schema Migrations Table (which files in database/migrations/ this
-- database already includes; a fresh load of this file is fully up to date)
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(64) NOT NULL,
  description VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version)
) ENGINE = InnoDB;

-- Triggers for team validation
DELIMITER //

CREATE TRIGGER prevent_same_team_game_insert
BEFORE INSERT ON games
FOR EACH ROW
BEGIN
    IF NEW.home_team_id = NEW.away_team_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Home team and away team cannot be the same.';
    END IF;
END //

CREATE TRIGGER prevent_same_team_game_update
BEFORE UPDATE ON games
FOR EACH ROW
BEGIN
    IF NEW.home_team_id = NEW.away_team_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Home team and away team cannot be the same.';
    END IF;
END //

DELIMITER ;

-- ==========================================
-- 2. HELPER FUNCTIONS
-- ==========================================

DELIMITER //

CREATE FUNCTION IF NOT EXISTS fn_calculate_age(dob DATE)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    IF dob IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN TIMESTAMPDIFF(YEAR, dob, CURDATE());
END //

DELIMITER ;

-- ==========================================
-- 3. SEED DATA
-- ==========================================

INSERT IGNORE INTO roles (id, name, description) VALUES
  (1, 'administrator', 'Full application administration'),
  (2, 'coach', 'Team and player management'),
  (3, 'player', 'Player self-service access'),
  (4, 'parent', 'Parent/guardian view access');

INSERT INTO users (id, username, role_id, first_name, last_name, email, phone, date_of_birth, password_hash, is_active) VALUES
  (1, 'admin_user', 1, 'Mila', 'Hose', 'admin@sportsteam.org', '555-0101', '1985-04-12', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (2, 'coach_smith', 2, 'John', 'Smith', 'jsmith@sportsteam.org', '555-0102', '1980-08-22', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (3, 'player_alex', 3, 'Alex', 'Johnson', 'alex.j@example.com', '555-0103', '2010-05-14', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1), -- Minor (Under 18)
  (4, 'parent_mary', 4, 'Mary', 'Johnson', 'mary.j@example.com', '555-0104', '1982-11-03', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (5, 'inactive_player', 3, 'Jordan', 'Lee', 'jlee@example.com', '555-0105', '2002-09-18', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 0), -- Adult (Over 18)
  (6, 'coach_davis', 2, 'Sarah', 'Davis', 'sdavis@sportsteam.org', '555-0106', '1988-01-30', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (7, 'player_marcus', 3, 'Marcus', 'Wright', 'm.wright@example.com', '555-0107', '2011-03-25', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1), -- Minor (Under 18)
  (8, 'player_chloe', 3, 'Chloe', 'Bennett', 'c.bennett@example.com', '555-0108', '2001-12-01', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1), -- Adult (Over 18)
  (9, 'coach_taylor', 2, 'Robert', 'Taylor', 'rtaylor@sportsteam.org', '555-0109', '1975-06-17', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (10, 'player_sam', 3, 'Sam', 'Wilson', 'swilson@example.com', '555-0110', '2012-07-08', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1); -- Minor (Under 18)

INSERT INTO parents (parent_id, player_id) VALUES
  (4, 3); -- Mary Johnson (parent) -> Alex Johnson (player)

INSERT INTO sessions (session_token, user_id, expires_at) VALUES
  ('a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0', 1, DATE_ADD(NOW(), INTERVAL 1 DAY)),
  ('b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01', 2, DATE_ADD(NOW(), INTERVAL 1 DAY)),
  ('c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef012', 3, DATE_ADD(NOW(), INTERVAL 1 DAY));

INSERT INTO teams (id, name, description, created_by) VALUES
  (1, 'Thunderbolts', 'Varsity Basketball Team', 2),
  (2, 'Vipers', 'Club Soccer Team', 2),
  (3, 'Falcons', 'Junior Varsity Baseball Team', 6),
  (4, 'Titans', 'Track and Field Squad', 9);

INSERT INTO team_memberships (team_id, user_id, role_in_team) VALUES
  (1, 2, 'head_coach'),
  (1, 3, 'player'),
  (1, 7, 'player'),
  (2, 2, 'head_coach'),
  (2, 8, 'player'),
  (3, 6, 'head_coach'),
  (3, 10, 'player'),
  (4, 9, 'head_coach');

INSERT INTO team_join_requests (team_id, user_id, status) VALUES
  (1, 5, 'pending'),
  (2, 7, 'approved'),
  (3, 8, 'pending'),
  (4, 3, 'rejected');

-- Single-elimination tournament: two semi-finals already played, final pending.
INSERT INTO tournament (id, user_id, name, status) VALUES
  (1, 2, 'Fall Championship 2026', 'in_progress');

INSERT INTO games (home_team_id, away_team_id, game_date, location, home_team_score, away_team_score, round, tournament_id, descriptions) VALUES
  (1, 2, '2026-09-15 18:00:00', 'Main Arena Stadium', 84, 78, 1, 1, 'Semi-Final Match'),
  (3, 4, '2026-09-20 16:00:00', 'North Field Complex', 5, 3, 1, 1, 'Semi-Final Match'),
  (2, 1, '2026-10-01 19:30:00', 'Eastside Sports Complex', 0, 0, NULL, NULL, NULL),
  (4, 1, '2026-10-10 17:00:00', 'Central High Gymnasium', 0, 0, NULL, NULL, NULL),
  (2, 3, '2026-10-15 15:30:00', 'West Park Turf', 0, 0, NULL, NULL, NULL),
  (1, 3, '2026-09-27 18:00:00', 'Main Arena Stadium', 0, 0, 2, 1, 'Final Match');

INSERT INTO tournament_standings (tournament_id, team_id, win, loss, draw, score) VALUES
  (1, 1, 1, 0, 0, 84),
  (1, 2, 0, 1, 0, 78),
  (1, 3, 1, 0, 0, 5),
  (1, 4, 0, 1, 0, 3);

-- ==========================================
-- 4. REFINED DATABASE VIEWS
-- ==========================================

-- 1. User Roles View
CREATE OR REPLACE VIEW view_user_roles AS
SELECT 
    u.id,
    u.username,
    u.first_name,
    u.last_name,
    CONCAT(u.first_name, ' ', u.last_name) AS full_name,
    u.password_hash,
    u.email,
    u.phone,
    r.name AS role,
    r.description AS role_description,
    u.is_active
FROM users u
INNER JOIN roles r ON u.role_id = r.id;

-- 2. Parent-Player View (Dynamically assigns parents for minors < 18, defaults adults to N/A)
CREATE OR REPLACE VIEW view_parent_players AS
SELECT 
    p_user.id AS player_user_id,
    CONCAT(p_user.first_name, ' ', p_user.last_name) AS player_name,
    p_user.email AS player_email,
    p_user.date_of_birth AS player_dob,
    fn_calculate_age(p_user.date_of_birth) AS player_age,
    CASE 
        WHEN fn_calculate_age(p_user.date_of_birth) < 18 THEN par_user.id
        ELSE NULL
    END AS parent_user_id,
    CASE 
        WHEN fn_calculate_age(p_user.date_of_birth) < 18 THEN 
            COALESCE(CONCAT(par_user.first_name, ' ', par_user.last_name), 'Pending Parent Assignment')
        ELSE 'N/A (Adult Player)'
    END AS parent_name,
    CASE 
        WHEN fn_calculate_age(p_user.date_of_birth) < 18 THEN par_user.email
        ELSE NULL
    END AS parent_email,
    CASE 
        WHEN fn_calculate_age(p_user.date_of_birth) < 18 THEN COALESCE(par_user.phone, p_user.phone)
        ELSE p_user.phone
    END AS emergency_contact_phone,
    CASE 
        WHEN fn_calculate_age(p_user.date_of_birth) < 18 AND par_user.id IS NOT NULL THEN 'Parent/Guardian'
        WHEN fn_calculate_age(p_user.date_of_birth) < 18 THEN 'Minor (Unassigned)'
        ELSE 'Self'
    END AS relationship
FROM users p_user
INNER JOIN roles r ON p_user.role_id = r.id
LEFT JOIN parents p_link ON p_user.id = p_link.player_id
LEFT JOIN users par_user ON p_link.parent_id = par_user.id
WHERE r.name = 'player';

-- 3. Teams with Scheduled Games View
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

-- 4. Player Join Requests View
CREATE OR REPLACE VIEW view_player_team_join_requests AS
SELECT 
  r.id, 
  r.team_id, 
  r.requested_at, 
  u.id AS user_id, 
  u.first_name, 
  u.last_name, 
  u.email
FROM team_join_requests r
INNER JOIN users u ON u.id = r.user_id
WHERE r.status = 'pending'
ORDER BY r.requested_at ASC;

-- 5. Team Statistics View
CREATE OR REPLACE VIEW view_team_statistics AS
SELECT 
    t.id AS team_id,
    t.name AS team_name,
    'Active Season' AS season_name,
    (
        SELECT COUNT(DISTINCT tm.user_id) 
        FROM team_memberships tm 
        WHERE tm.team_id = t.id AND tm.role_in_team = 'player'
    ) AS total_rostered_players,
    (
        SELECT COUNT(*) 
        FROM games g 
        WHERE (g.home_team_id = t.id OR g.away_team_id = t.id) AND g.game_date <= NOW()
    ) AS total_games_played,
    (
        SELECT COUNT(*) 
        FROM games g 
        WHERE g.game_date <= NOW() AND (
            (g.home_team_id = t.id AND g.home_team_score > g.away_team_score) OR
            (g.away_team_id = t.id AND g.away_team_score > g.home_team_score)
        )
    ) AS wins,
    (
        SELECT COUNT(*) 
        FROM games g 
        WHERE g.game_date <= NOW() AND (
            (g.home_team_id = t.id AND g.home_team_score < g.away_team_score) OR
            (g.away_team_id = t.id AND g.away_team_score < g.home_team_score)
        )
    ) AS losses,
    (
        SELECT COUNT(*) 
        FROM games g 
        WHERE g.game_date <= NOW() AND (g.home_team_id = t.id OR g.away_team_id = t.id) 
          AND g.home_team_score = g.away_team_score
    ) AS ties,
    COALESCE((
        SELECT SUM(CASE WHEN g.home_team_id = t.id THEN g.home_team_score ELSE g.away_team_score END)
        FROM games g 
        WHERE (g.home_team_id = t.id OR g.away_team_id = t.id) AND g.game_date <= NOW()
    ), 0) AS points_scored,
    COALESCE((
        SELECT SUM(CASE WHEN g.home_team_id = t.id THEN g.away_team_score ELSE g.home_team_score END)
        FROM games g 
        WHERE (g.home_team_id = t.id OR g.away_team_id = t.id) AND g.game_date <= NOW()
    ), 0) AS points_allowed
FROM teams t;


-- 6. Team Games
CREATE OR REPLACE VIEW view_team_game AS
SELECT 
  g.id, 
  g.game_date, 
  g.location,
  g.home_team_id, 
  g.away_team_id,
  ht.name AS home_team_name, 
  at.name AS away_team_name
FROM games g
INNER JOIN teams ht ON ht.id = g.home_team_id
INNER JOIN teams at ON at.id = g.away_team_id
ORDER BY g.game_date DESC;


-- 7. View Team Membership
CREATE OR REPLACE VIEW view_team_membership AS
SELECT 
  t.id, 
  t.name, 
  t.description, 
  tm.role_in_team, 
  tm.user_id, 
  tm.joined_at, 
  tm.position, 
  tm.jersey_number
FROM team_memberships tm
INNER JOIN teams t ON t.id = tm.team_id
ORDER BY t.name ASC;


-- 8. View Team Membership Player List
CREATE OR REPLACE VIEW view_team_players_list AS
SELECT 
  u.id, 
  u.first_name, 
  u.last_name, 
  u.email, 
  tm.position, 
  tm.team_id, 
  tm.jersey_number
FROM team_memberships tm
INNER JOIN users u ON u.id = tm.user_id
WHERE tm.role_in_team = 'player';

-- ==========================================
-- 5. HISTORY LOGGING AND TOURNAMENT STANDINGS
-- ==========================================
-- Created after the seed data on purpose, so seeding is not logged.
-- MySQL does not fire triggers for rows removed by a foreign-key CASCADE:
-- deleting a tournament (or team) logs that one row, not the games and
-- standings rows that go with it.

DELIMITER //

-- Standings are derived from the tournament's decided games (scores differ;
-- equal scores mean "not played yet"). Recomputing from scratch means the
-- standings can never drift, whoever changed the games.
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
CREATE TRIGGER trg_games_standings_insert
AFTER INSERT ON games
FOR EACH ROW
BEGIN
    IF NEW.tournament_id IS NOT NULL THEN
        CALL sp_recalculate_tournament_standings(NEW.tournament_id);
    END IF;
END //

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

INSERT IGNORE INTO schema_migrations (version, description) VALUES
  ('001', 'Tournaments, tournament standings triggers and history logging');
