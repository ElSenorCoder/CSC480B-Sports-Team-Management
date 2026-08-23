# MySQL Integration Guide — Sprint 1 Authentication

## Purpose

MySQL must give the Express service one reliable way to locate an active user,
retrieve the password hash, and identify the user's role. The browser
application never connects directly to MySQL; Express is the only layer that
queries the database.

This guide targets **MySQL 8.0** and **MySQL Workbench**.

## Sprint 1 minimum model

```text
roles 1 ───────< users
                   │
                   ├── 0..1 player_profiles
                   └── 0..1 coach_profiles
```

Only `roles` and `users` are required to complete login. Player and coach
profile tables can be added when roster development begins.

## Recommended database

- Schema name: `sports_team_management`
- Character set: `utf8mb4`
- Collation: `utf8mb4_0900_ai_ci`
- Storage engine: `InnoDB`

The recommended collation makes username and email comparisons
case-insensitive while supporting full Unicode text.

## Tables

### `roles`

| Column | MySQL type | Rules |
| --- | --- | --- |
| `id` | `SMALLINT UNSIGNED` | Primary key, auto increment |
| `name` | `VARCHAR(32)` | Unique, required, lowercase |
| `description` | `VARCHAR(255)` | Optional |

Seed values: `administrator`, `coach`, and `player`.

### `users`

| Column | MySQL type | Rules |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED` | Primary key, auto increment |
| `username` | `VARCHAR(50)` | Required, case-insensitive unique |
| `email` | `VARCHAR(255)` | Required, case-insensitive unique |
| `password_hash` | `VARCHAR(255)` | Required; never store plaintext |
| `display_name` | `VARCHAR(120)` | Required |
| `role_id` | `SMALLINT UNSIGNED` | Foreign key to `roles.id` |
| `is_active` | `TINYINT(1)` | Required, default `1` |
| `created_at` | `TIMESTAMP` | Default current timestamp |
| `updated_at` | `TIMESTAMP` | Automatically updated |

Do not create separate login columns in player or coach tables. Every person
who can sign in gets one `users` record. Role-specific information belongs in
a profile table connected to that user.

## Login lookup required by Express

```sql
SELECT
  u.id,
  u.username,
  u.email,
  u.password_hash,
  u.display_name,
  r.name AS role
FROM users AS u
INNER JOIN roles AS r ON r.id = u.role_id
WHERE u.is_active = 1
  AND (u.email = ? OR u.username = ?)
LIMIT 1;
```

The Express MySQL driver should supply the normalized identifier twice:

```text
[identifier, identifier]
```

Use prepared placeholders (`?`). Never build this query by concatenating
user-entered text.

## MySQL Workbench setup

1. Open MySQL Workbench and connect to the team's development server.
2. Select **File → Open SQL Script**.
3. Open `database/mysql-sprint1-auth.sql` from this project.
4. Review the schema name and collation with the database owner.
5. Run the script using the lightning-bolt execute button.
6. Refresh the Schemas panel and confirm that `roles` and `users` exist.
7. Confirm that the three role records were inserted.
8. Add development users through a separate seed script after their passwords
   have been securely hashed by the backend.

Do not place raw passwords in the schema script or save real credentials in a
Workbench file committed to Git.

## Password storage

- Hash passwords in Express with Argon2id or bcrypt before inserting them.
- Store only the resulting encoded hash in `password_hash`.
- Never send `password_hash` to the browser or place it in a JWT.
- Development seed accounts must use nonproduction credentials.

## Suggested Express environment variables

The Express repository—not this React project—should define values such as:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=sports_team_management
MYSQL_USER=sports_team_api
MYSQL_PASSWORD=replace-with-local-secret
```

Commit only an `.env.example` with placeholders. The actual password belongs
in the backend developer's local environment or approved secret manager.

## Seed accounts for integration testing

Create one active account for each role and one disabled account:

| Purpose | Username | Email | Role | Active |
| --- | --- | --- | --- | --- |
| Admin success | `admin.demo` | `admin@example.test` | administrator | yes |
| Coach success | `coach.demo` | `coach@example.test` | coach | yes |
| Player success | `player.demo` | `player@example.test` | player | yes |
| Disabled error | `disabled.demo` | `disabled@example.test` | player | no |

Share development passwords through the team's approved channel rather than
Git.

## Database-to-client mapping

| MySQL column | Backend response | React type |
| --- | --- | --- |
| `users.id` | `user.id` converted to a string | `AuthUser.id` |
| `users.display_name` | `user.name` | `AuthUser.name` |
| `users.email` | `user.email` | `AuthUser.email` |
| `roles.name` | `user.role` | `UserRole` |

Do not expose `password_hash`, `role_id`, database timestamps, or internal
database metadata in the login response.

## Acceptance checklist

- [ ] MySQL 8 schema opens and runs successfully in MySQL Workbench.
- [ ] All tables use `InnoDB`, `utf8mb4`, and the agreed collation.
- [ ] Role values exist exactly as agreed.
- [ ] Username and email uniqueness are database-enforced.
- [ ] Passwords are stored only as secure hashes.
- [ ] Login lookup works with either username or email.
- [ ] Disabled users cannot authenticate.
- [ ] Express uses a prepared MySQL query.
- [ ] Sample data covers administrator, coach, player, and disabled cases.
- [ ] MySQL errors are translated by Express and never returned directly to the
      browser.
