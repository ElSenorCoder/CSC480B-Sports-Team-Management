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

-- 8. Games Table
CREATE TABLE IF NOT EXISTS games (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  home_team_id BIGINT UNSIGNED NOT NULL,
  away_team_id BIGINT UNSIGNED NOT NULL,
  game_date DATETIME NOT NULL,
  location VARCHAR(255) NULL,
  home_team_score SMALLINT UNSIGNED DEFAULT 0,
  away_team_score SMALLINT UNSIGNED DEFAULT 0,
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

-- 9. Messages Table
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

INSERT INTO games (home_team_id, away_team_id, game_date, location, home_team_score, away_team_score) VALUES
  (1, 2, '2026-09-15 18:00:00', 'Main Arena Stadium', 84, 78), 
  (3, 4, '2026-09-20 16:00:00', 'North Field Complex', 5, 3),
  (2, 1, '2026-10-01 19:30:00', 'Eastside Sports Complex', 0, 0),
  (4, 1, '2026-10-10 17:00:00', 'Central High Gymnasium', 0, 0),
  (2, 3, '2026-10-15 15:30:00', 'West Park Turf', 0, 0);

-- ==========================================
-- 4. REFINED DATABASE VIEWS
-- ==========================================

-- 1. User Roles View
CREATE OR REPLACE VIEW view_user_roles AS
SELECT 
    u.id AS user_id,
    u.username,
    CONCAT(u.first_name, ' ', u.last_name) AS full_name,
    u.email,
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
    ht.name AS home_team,
    gt.id AS away_team_id,
    gt.name AS away_team,
    g.game_date,
    g.location,
    g.home_team_score,
    g.away_team_score,
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
    r.id AS request_id,
    t.id AS team_id,
    t.name AS team_name,
    u.id AS applicant_id,
    CONCAT(u.first_name, ' ', u.last_name) AS applicant_name,
    u.email AS applicant_email,
    'player' AS role_in_team,
    r.status,
    r.requested_at
FROM team_join_requests r
INNER JOIN teams t ON r.team_id = t.id
INNER JOIN users u ON r.user_id = u.id;

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

-- ==========================================
-- 5. FUNCTIONALITY TEST SUITE
-- ==========================================

SELECT * FROM view_user_roles;
SELECT * FROM view_parent_players;
SELECT * FROM view_teams_with_games;
SELECT * FROM view_player_team_join_requests;
SELECT * FROM view_team_statistics;
