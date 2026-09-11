DROP DATABASE IF EXISTS sports_team_management;
CREATE DATABASE IF NOT EXISTS sports_team_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE sports_team_management;

-- ==========================================
-- 1. TABLE STRUCTURES
-- ==========================================

-- 1. Users With Roles Table
CREATE TABLE IF NOT EXISTS users_with_roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_name VARCHAR(32) NOT NULL,
  role_description VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT chk_users_is_active CHECK (is_active IN (0, 1)),
  CONSTRAINT chk_role_name_lowercase CHECK (role_name = LOWER(role_name))
) ENGINE = InnoDB;

-- 2. User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_token VARCHAR(128) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_token (session_token),
  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES users_with_roles (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_expires_at (expires_at)
) ENGINE = InnoDB;

-- 3. Seasons Table
CREATE TABLE IF NOT EXISTS seasons (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    season_name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_seasons_name (season_name),
    CONSTRAINT chk_seasons_dates CHECK (end_date >= start_date)
) ENGINE = InnoDB;

-- 4. Teams With Games Table
CREATE TABLE IF NOT EXISTS teams_with_games (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  record_type ENUM('team', 'game') NOT NULL,
  -- Team fields
  team_name VARCHAR(100) NULL,
  team_description VARCHAR(255) NULL,
  created_by BIGINT UNSIGNED NULL,
  season_id BIGINT UNSIGNED NULL,
  -- Game fields
  home_team_id BIGINT UNSIGNED NULL,
  away_team_id BIGINT UNSIGNED NULL,
  game_date DATETIME NULL,
  location VARCHAR(255) NULL,
  home_team_score SMALLINT UNSIGNED DEFAULT 0,
  away_team_score SMALLINT UNSIGNED DEFAULT 0,
  game_status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') NULL DEFAULT 'scheduled',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_teams_name (team_name),
  CONSTRAINT fk_teams_created_by
    FOREIGN KEY (created_by) REFERENCES users_with_roles (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_teams_season
    FOREIGN KEY (season_id) REFERENCES seasons (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_games_home_team
    FOREIGN KEY (home_team_id) REFERENCES teams_with_games (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_games_away_team
    FOREIGN KEY (away_team_id) REFERENCES teams_with_games (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- 5. Player Team Join Requests Table
CREATE TABLE IF NOT EXISTS player_team_join_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  team_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role_in_team ENUM('head_coach', 'assistant_coach', 'player') NOT NULL DEFAULT 'player',
  position VARCHAR(50) NULL,
  jersey_number SMALLINT UNSIGNED NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_requests_team_id (team_id),
  KEY idx_requests_user_id (user_id),
  CONSTRAINT fk_requests_team
    FOREIGN KEY (team_id) REFERENCES teams_with_games (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_requests_user
    FOREIGN KEY (user_id) REFERENCES users_with_roles (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- 6. Parents Table
CREATE TABLE IF NOT EXISTS parents (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    emergency_contact_phone VARCHAR(20) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_parents_user_id (user_id),
    CONSTRAINT fk_parents_user
        FOREIGN KEY (user_id) REFERENCES users_with_roles (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE = InnoDB;

-- 7. Parent-Players Table
CREATE TABLE IF NOT EXISTS parent_players (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    parent_id BIGINT UNSIGNED NOT NULL,
    player_id BIGINT UNSIGNED NOT NULL,
    relationship VARCHAR(50) DEFAULT 'Parent/Guardian',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_parent_player (parent_id, player_id),
    CONSTRAINT fk_parent_players_parent
        FOREIGN KEY (parent_id) REFERENCES parents (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_parent_players_player
        FOREIGN KEY (player_id) REFERENCES users_with_roles (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE = InnoDB;

-- ==========================================
-- 2. TRIGGERS
-- ==========================================

DELIMITER //

CREATE TRIGGER prevent_same_team_game_insert
BEFORE INSERT ON teams_with_games
FOR EACH ROW
BEGIN
    IF NEW.record_type = 'game' AND NEW.home_team_id = NEW.away_team_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Home team and away team cannot be the same.';
    END IF;
END //

CREATE TRIGGER prevent_same_team_game_update
BEFORE UPDATE ON teams_with_games
FOR EACH ROW
BEGIN
    IF NEW.record_type = 'game' AND NEW.home_team_id = NEW.away_team_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Home team and away team cannot be the same.';
    END IF;
END //

DELIMITER ;

-- ==========================================
-- 3. SEED DATA
-- ==========================================

-- Seed Users With Roles
INSERT INTO users_with_roles (id, username, role_name, role_description, first_name, last_name, email, phone, password_hash, is_active) VALUES
  (1, 'admin_user', 'administrator', 'Full application administration', 'Mila', 'Hose', 'admin@sportsteam.org', '555-0101', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (2, 'coach_smith', 'coach', 'Team and player management', 'John', 'Smith', 'jsmith@sportsteam.org', '555-0102', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (3, 'player_alex', 'player', 'Player self-service access', 'Alex', 'Johnson', 'alex.j@example.com', '555-0103', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (4, 'parent_mary', 'parent', 'Parent/guardian view access', 'Mary', 'Johnson', 'mary.j@example.com', '555-0104', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (5, 'inactive_player', 'player', 'Player self-service access', 'Jordan', 'Lee', 'jlee@example.com', '555-0105', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 0),
  (6, 'coach_davis', 'coach', 'Team and player management', 'Sarah', 'Davis', 'sdavis@sportsteam.org', '555-0106', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (7, 'player_marcus', 'player', 'Player self-service access', 'Marcus', 'Wright', 'm.wright@example.com', '555-0107', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (8, 'player_chloe', 'player', 'Player self-service access', 'Chloe', 'Bennett', 'c.bennett@example.com', '555-0108', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (9, 'coach_taylor', 'coach', 'Team and player management', 'Robert', 'Taylor', 'rtaylor@sportsteam.org', '555-0109', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (10, 'player_sam', 'player', 'Player self-service access', 'Sam', 'Wilson', 'swilson@example.com', '555-0110', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1);

-- Seed User Sessions
INSERT INTO user_sessions (session_token, user_id, expires_at) VALUES
  ('a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0', 1, DATE_ADD(NOW(), INTERVAL 1 DAY)),
  ('b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01', 2, DATE_ADD(NOW(), INTERVAL 1 DAY)),
  ('c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef012', 3, DATE_ADD(NOW(), INTERVAL 1 DAY));

-- Seed Seasons (Past, Current Active, and Upcoming Future)
INSERT INTO seasons (id, season_name, start_date, end_date, is_active) VALUES
    (1, 'Spring 2026', DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH), DATE_SUB(CURRENT_DATE(), INTERVAL 2 MONTH), 0),
    (2, 'Fall 2026', DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), DATE_ADD(CURRENT_DATE(), INTERVAL 2 MONTH), 1),
    (3, 'Winter 2026-2027', DATE_ADD(CURRENT_DATE(), INTERVAL 3 MONTH), DATE_ADD(CURRENT_DATE(), INTERVAL 6 MONTH), 0);

-- Seed Teams (Assigned to Current Active Season 2)
INSERT INTO teams_with_games (id, record_type, team_name, team_description, created_by, season_id) VALUES
  (1, 'team', 'Thunderbolts', 'Varsity Basketball Team', 2, 2),
  (2, 'team', 'Vipers', 'Club Soccer Team', 2, 2),
  (3, 'team', 'Falcons', 'Junior Varsity Baseball Team', 6, 2),
  (4, 'team', 'Titans', 'Track and Field Squad', 9, 2);

-- Seed Games (Mix of Completed Past Games and Scheduled Future Games)
INSERT INTO teams_with_games (id, record_type, home_team_id, away_team_id, game_date, location, home_team_score, away_team_score, game_status) VALUES
  -- Past Completed Games
  (5, 'game', 1, 2, DATE_SUB(NOW(), INTERVAL 14 DAY), 'Main Arena Stadium', 84, 78, 'completed'),
  (6, 'game', 3, 4, DATE_SUB(NOW(), INTERVAL 7 DAY), 'North Field Complex', 5, 3, 'completed'),
  -- Upcoming Scheduled Games
  (7, 'game', 2, 1, DATE_ADD(NOW(), INTERVAL 5 DAY), 'Eastside Sports Complex', 0, 0, 'scheduled'),
  (8, 'game', 4, 1, DATE_ADD(NOW(), INTERVAL 12 DAY), 'Central High Gymnasium', 0, 0, 'scheduled'),
  (9, 'game', 2, 3, DATE_ADD(NOW(), INTERVAL 20 DAY), 'West Park Turf', 0, 0, 'scheduled');

-- Seed Player Team Join Requests
INSERT INTO player_team_join_requests (team_id, user_id, role_in_team, status) VALUES
  (1, 2, 'head_coach', 'approved'),
  (1, 3, 'player', 'approved'),
  (1, 7, 'player', 'approved'),
  (2, 2, 'head_coach', 'approved'),
  (2, 8, 'player', 'approved'),
  (3, 6, 'head_coach', 'approved'),
  (3, 10, 'player', 'approved'),
  (4, 9, 'head_coach', 'approved'),
  (1, 5, 'player', 'pending'),
  (2, 7, 'player', 'approved'),
  (3, 8, 'player', 'pending'),
  (4, 3, 'player', 'rejected');

-- Seed Parents & Relationships
INSERT INTO parents (id, user_id, emergency_contact_phone) VALUES
    (1, 4, '555-0104');

INSERT INTO parent_players (parent_id, player_id, relationship) VALUES
    (1, 3, 'Mother');

-- ==========================================
-- 4. DATABASE VIEWS
-- ==========================================

-- 1. view_user_roles
CREATE OR REPLACE VIEW view_user_roles AS
SELECT 
    id AS user_id,
    username,
    CONCAT(first_name, ' ', last_name) AS full_name,
    email,
    role_name AS role,
    role_description,
    is_active
FROM users_with_roles;

-- 2. view_parent_players
CREATE OR REPLACE VIEW view_parent_players AS
SELECT 
    pp.id AS relationship_id,
    p.id AS parent_record_id,
    pu.id AS parent_user_id,
    CONCAT(pu.first_name, ' ', pu.last_name) AS parent_name,
    pu.email AS parent_email,
    p.emergency_contact_phone,
    pp.relationship,
    pl.id AS player_user_id,
    CONCAT(pl.first_name, ' ', pl.last_name) AS player_name,
    pl.email AS player_email
FROM parent_players pp
INNER JOIN parents p ON pp.parent_id = p.id
INNER JOIN users_with_roles pu ON p.user_id = pu.id
INNER JOIN users_with_roles pl ON pp.player_id = pl.id;

-- 3. view_teams_with_games
CREATE OR REPLACE VIEW view_teams_with_games AS
SELECT 
    g.id AS game_id,
    ht.id AS home_team_id,
    ht.team_name AS home_team,
    gt.id AS away_team_id,
    gt.team_name AS away_team,
    g.game_date,
    g.location,
    g.home_team_score,
    g.away_team_score,
    g.game_status AS status
FROM teams_with_games g
INNER JOIN teams_with_games ht ON g.home_team_id = ht.id
INNER JOIN teams_with_games gt ON g.away_team_id = gt.id
WHERE g.record_type = 'game';

-- 4. view_player_team_join_requests
CREATE OR REPLACE VIEW view_player_team_join_requests AS
SELECT 
    r.id AS request_id,
    t.id AS team_id,
    t.team_name,
    u.id AS applicant_id,
    CONCAT(u.first_name, ' ', u.last_name) AS applicant_name,
    u.email AS applicant_email,
    r.role_in_team,
    r.status,
    r.requested_at
FROM player_team_join_requests r
INNER JOIN teams_with_games t ON r.team_id = t.id
INNER JOIN users_with_roles u ON r.user_id = u.id;

-- 5. view_team_statistics
CREATE OR REPLACE VIEW view_team_statistics AS
SELECT 
    t.id AS team_id,
    t.team_name,
    s.season_name,
    COUNT(DISTINCT CASE WHEN r.status = 'approved' AND r.role_in_team = 'player' THEN r.user_id END) AS total_rostered_players,
    COUNT(DISTINCT g.id) AS total_games_played,
    SUM(CASE 
        WHEN g.home_team_id = t.id AND g.home_team_score > g.away_team_score THEN 1
        WHEN g.away_team_id = t.id AND g.away_team_score > g.home_team_score THEN 1
        ELSE 0 
    END) AS wins,
    SUM(CASE 
        WHEN g.home_team_id = t.id AND g.home_team_score < g.away_team_score THEN 1
        WHEN g.away_team_id = t.id AND g.away_team_score < g.home_team_score THEN 1
        ELSE 0 
    END) AS losses,
    SUM(CASE 
        WHEN g.id IS NOT NULL AND g.home_team_score = g.away_team_score THEN 1
        ELSE 0 
    END) AS ties,
    SUM(CASE WHEN g.home_team_id = t.id THEN g.home_team_score WHEN g.away_team_id = t.id THEN g.away_team_score ELSE 0 END) AS points_scored,
    SUM(CASE WHEN g.home_team_id = t.id THEN g.away_team_score WHEN g.away_team_id = t.id THEN g.home_team_score ELSE 0 END) AS points_allowed
FROM teams_with_games t
LEFT JOIN seasons s ON t.season_id = s.id
LEFT JOIN player_team_join_requests r ON t.id = r.team_id
LEFT JOIN teams_with_games g ON (g.record_type = 'game' AND g.game_status = 'completed' AND (g.home_team_id = t.id OR g.away_team_id = t.id))
WHERE t.record_type = 'team'
GROUP BY t.id, t.team_name, s.season_name;

--views functions
SELECT * FROM view_user_roles;
SELECT * FROM view_parent_players;
SELECT * FROM view_teams_with_games;
SELECT * FROM view_player_team_join_requests;
SELECT * FROM view_team_statistics;
