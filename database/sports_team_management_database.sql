DROP DATABASE IF EXISTS sports_team_management;
CREATE DATABASE IF NOT EXISTS sports_team_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE sports_team_management;

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
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    INDEX idx_sessions_user_id (user_id),
    INDEX idx_sessions_expires_at (expires_at)
) ENGINE = InnoDB;

-- Insert Roles
INSERT IGNORE INTO roles (id, name, description) VALUES
(1, 'administrator', 'Full application administration'),
(2, 'coach', 'Team and player management'),
(3, 'player', 'Player self-service access'),
(4, 'parent', 'Parent/guardian view access');

-- Insert Seed Users (Plaintext passwords to be processed by backend hashing service)
INSERT INTO users (username, role_id, first_name, last_name, email, phone, password_hash, is_active) VALUES
('admin_user', 1, 'Mila', 'Hose', 'admin@sportsteam.org', '555-0101', 'Password123!', 1),
('coach_smith', 2, 'John', 'Smith', 'jsmith@sportsteam.org', '555-0102', 'Password123!', 1),
('player_alex', 3, 'Alex', 'Johnson', 'alex.j@example.com', '555-0103', 'Password123!', 1),
('parent_mary', 4, 'Mary', 'Johnson', 'mary.j@example.com', '555-0104', 'Password123!', 1),
('inactive_player', 3, 'Jordan', 'Lee', 'jlee@example.com', '555-0105', 'Password123!', 0);