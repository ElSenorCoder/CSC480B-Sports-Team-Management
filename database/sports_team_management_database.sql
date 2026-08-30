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

-- 3. Sessions Table
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

-- 4. Teams Table
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

-- 5. Team Memberships Table
CREATE TABLE IF NOT EXISTS team_memberships (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  team_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role_in_team ENUM('head_coach', 'assistant_coach', 'player') NOT NULL DEFAULT 'player',
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

-- 6. Team Join Requests Table
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

-- 7. Games Table
CREATE TABLE IF NOT EXISTS games (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  home_team_id BIGINT UNSIGNED NOT NULL,
  away_team_id BIGINT UNSIGNED NOT NULL,
  game_date DATETIME NOT NULL,
  location VARCHAR(255) NULL,
  home_team_score SMALLINT UNSIGNED DEFAULT 0,
  away_team_score SMALLINT UNSIGNED DEFAULT 0,
  status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_games_home_team (home_team_id),
  KEY idx_games_away_team (away_team_id),
  KEY idx_games_date (game_date),
  CONSTRAINT fk_games_home_team
    FOREIGN KEY (home_team_id) REFERENCES teams (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_games_away_team
    FOREIGN KEY (away_team_id) REFERENCES teams (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- Enforce different teams rule via Triggers
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

INSERT IGNORE INTO roles (name, description)
VALUES
  ('administrator', 'Full application administration'),
  ('coach', 'Team and player management'),
  ('player', 'Player self-service access');

-- Express login lookup using mysql2 placeholders:
-- SELECT
--   u.id,
--   u.username,
--   u.email,
--   u.password_hash,
--   u.display_name,
--   r.name AS role
-- FROM users AS u
-- INNER JOIN roles AS r ON r.id = u.role_id
-- WHERE u.is_active = 1
--   AND (u.email = ? OR u.username = ?)
-- LIMIT 1;

-- ==========================================
-- 2. SEED DATA
-- ==========================================

-- Seed Data: Roles
INSERT IGNORE INTO roles (id, name, description) VALUES
  (1, 'administrator', 'Full application administration'),
  (2, 'coach', 'Team and player management'),
  (3, 'player', 'Player self-service access'),
  (4, 'parent', 'Parent/guardian view access');

-- Seed Data: Users
INSERT INTO users (id, username, role_id, first_name, last_name, email, phone, password_hash, is_active) VALUES
  (1, 'admin_user', 1, 'Mila', 'Hose', 'admin@sportsteam.org', '555-0101', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (2, 'coach_smith', 2, 'John', 'Smith', 'jsmith@sportsteam.org', '555-0102', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (3, 'player_alex', 3, 'Alex', 'Johnson', 'alex.j@example.com', '555-0103', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (4, 'parent_mary', 4, 'Mary', 'Johnson', 'mary.j@example.com', '555-0104', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (5, 'inactive_player', 3, 'Jordan', 'Lee', 'jlee@example.com', '555-0105', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 0),
  (6, 'coach_davis', 2, 'Sarah', 'Davis', 'sdavis@sportsteam.org', '555-0106', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (7, 'player_marcus', 3, 'Marcus', 'Wright', 'm.wright@example.com', '555-0107', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (8, 'player_chloe', 3, 'Chloe', 'Bennett', 'c.bennett@example.com', '555-0108', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (9, 'coach_taylor', 2, 'Robert', 'Taylor', 'rtaylor@sportsteam.org', '555-0109', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1),
  (10, 'player_sam', 3, 'Sam', 'Wilson', 'swilson@example.com', '555-0110', '89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8', 1);

-- Seed Data: Sessions
INSERT INTO sessions (session_token, user_id, expires_at) VALUES
  ('a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0', 1, DATE_ADD(NOW(), INTERVAL 1 DAY)),
  ('b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01', 2, DATE_ADD(NOW(), INTERVAL 1 DAY)),
  ('c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef012', 3, DATE_ADD(NOW(), INTERVAL 1 DAY));

-- Seed Data: Teams
INSERT INTO teams (id, name, description, created_by) VALUES
  (1, 'Thunderbolts', 'Varsity Basketball Team', 2),
  (2, 'Vipers', 'Club Soccer Team', 2),
  (3, 'Falcons', 'Junior Varsity Baseball Team', 6),
  (4, 'Titans', 'Track and Field Squad', 9);

-- Seed Data: Team Memberships
INSERT INTO team_memberships (team_id, user_id, role_in_team) VALUES
  (1, 2, 'head_coach'),
  (1, 3, 'player'),
  (1, 7, 'player'),
  (2, 2, 'head_coach'),
  (2, 8, 'player'),
  (3, 6, 'head_coach'),
  (3, 10, 'player'),
  (4, 9, 'head_coach');

-- Seed Data: Team Join Requests
INSERT INTO team_join_requests (team_id, user_id, status) VALUES
  (1, 5, 'pending'),
  (2, 7, 'approved'),
  (3, 8, 'pending'),
  (4, 3, 'rejected');

-- Seed Data: Games
INSERT INTO games (home_team_id, away_team_id, game_date, location, home_team_score, away_team_score, status) VALUES
  (1, 2, '2026-09-15 18:00:00', 'Main Arena Stadium', 84, 78, 'completed'),
  (3, 4, '2026-09-20 16:00:00', 'North Field Complex', 5, 3, 'completed'),
  (2, 1, '2026-10-01 19:30:00', 'Eastside Sports Complex', 0, 0, 'scheduled'),
  (4, 1, '2026-10-10 17:00:00', 'Central High Gymnasium', 0, 0, 'scheduled'),
  (2, 3, '2026-10-15 15:30:00', 'West Park Turf', 0, 0, 'scheduled');
  
  -- ==========================================
-- 3. VIEWS
-- ==========================================

-- 1. Active Users View
CREATE OR REPLACE VIEW view_active_users AS
SELECT 
    u.id AS user_id,
    u.username,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    r.name AS role_name,
    u.created_at
FROM users u
INNER JOIN roles r ON u.role_id = r.id
WHERE u.is_active = 1;

-- 2. Team Rosters View
CREATE OR REPLACE VIEW view_team_rosters AS
SELECT 
    t.id AS team_id,
    t.name AS team_name,
    u.id AS user_id,
    CONCAT(u.first_name, ' ', u.last_name) AS member_name,
    u.email AS member_email,
    tm.role_in_team,
    tm.joined_at
FROM team_memberships tm
INNER JOIN teams t ON tm.team_id = t.id
INNER JOIN users u ON tm.user_id = u.id
WHERE u.is_active = 1;

-- 3. Pending Join Requests View
CREATE OR REPLACE VIEW view_pending_join_requests AS
SELECT 
    r.id AS request_id,
    t.id AS team_id,
    t.name AS team_name,
    u.id AS applicant_id,
    CONCAT(u.first_name, ' ', u.last_name) AS applicant_name,
    u.email AS applicant_email,
    r.requested_at
FROM team_join_requests r
INNER JOIN teams t ON r.team_id = t.id
INNER JOIN users u ON r.user_id = u.id
WHERE r.status = 'pending';

-- 4. Game Schedule View
CREATE OR REPLACE VIEW view_game_schedule AS
SELECT 
    g.id AS game_id,
    ht.name AS home_team,
    gt.name AS away_team,
    g.game_date,
    g.location,
    g.home_team_score,
    g.away_team_score,
    g.status
FROM games g
INNER JOIN teams ht ON g.home_team_id = ht.id
INNER JOIN teams gt ON g.away_team_id = gt.id;
