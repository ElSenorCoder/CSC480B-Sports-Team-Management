# Database Connection Guide

1. Open **MySQL Workbench**.
2. Create a new local connection using:
   * **Host:** `localhost` (127.0.0.1)
   * **Port:** `3306`
   * **Username:** `root`
3. Execute the schema SQL script provided by the database lead to create tables: `Users`, `Roles`, `Players`, `Coaches`, and `Teams`.
4. Update the backend `.env` variables:
   `DB_HOST=localhost`
   `DB_USER=root`
   `DB_PASSWORD=yourpassword`
   `DB_NAME=sports_team_db`