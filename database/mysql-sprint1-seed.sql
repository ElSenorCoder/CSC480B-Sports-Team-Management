USE sports_team_management;

-- Insert Roles (administrator, coach, player, parent)
INSERT IGNORE INTO roles (id, name, description) VALUES
(1, 'administrator', 'Full application administration'),
(2, 'coach', 'Team and player management'),
(3, 'player', 'Player self-service access'),
(4, 'parent', 'Parent/guardian view access');

-- Insert 5 Seed Users
INSERT INTO users (username, role_id, first_name, last_name, email, phone, password_hash, is_active) VALUES
('admin_user', 1, 'Mila', 'Hose', 'admin@sportsteam.org', '555-0101', '$2b$10$e7xX3N8gD4P8R4z1V0m1e.Q4V5X6Y7Z8A9B0C1D2E3F4G5H6I7J8K', 1),
('coach_smith', 2, 'John', 'Smith', 'jsmith@sportsteam.org', '555-0102', '$2b$10$k1L2M3N4O5P6Q7R8S9T0U.V1W2X3Y4Z5A6B7C8D9E0F1G2H3I4J5', 1),
('player_alex', 3, 'Alex', 'Johnson', 'alex.j@example.com', '555-0103', '$2b$10$p6Q7R8S9T0U1V2W3X4Y5Z.A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5', 1),
('parent_mary', 4, 'Mary', 'Johnson', 'mary.j@example.com', '555-0104', '$2b$10$u1V2W3X4Y5Z6A7B8C9D0E.F1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5', 1),
('inactive_player', 3, 'Jordan', 'Lee', 'jlee@example.com', '555-0105', '$2b$10$z5A6B7C8D9E0F1G2H3I4J.K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5', 0);