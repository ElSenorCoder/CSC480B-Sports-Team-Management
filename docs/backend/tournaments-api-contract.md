# Tournaments API Contract

## Purpose

This document defines the single-elimination tournament API. A tournament is a bracket of games between teams: winners advance, losers are out, and the last team standing is the champion.

Implementation: `server/routes/tournaments.js` (routes), `server/lib/tournament.js` (bracket rules, unit tested with `npm test`), and the database triggers in `database/sports_team_management_database.sql` (standings and history). The React screens are described under [Frontend](#frontend).

## Base API Path

```text
/api/tournaments
```

## Authentication and Roles

Every endpoint requires a logged-in session (`Authorization: Bearer <token>` or the `sessionToken` cookie).

| Action | Who |
| --- | --- |
| List, get, standings | Any authenticated user |
| Create | Coach or administrator |
| Simulate, delete | The coach who created the tournament, or an administrator |

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/tournaments` | Get all tournaments |
| POST | `/api/tournaments/create` | Create tournament + first-round games + standings |
| GET | `/api/tournaments/:id` | Get tournament + games |
| GET | `/api/tournaments/:id/simulation` | Simulate existing games + update standings |
| DELETE | `/api/tournaments/:id/delete` | Delete tournament |
| GET | `/api/tournaments/:id/standings` | Get the standings of a tournament |

`GET /:id/simulation` changes data (it plays games and writes results). It is a GET because the API table specifies it; do not call it from anything that prefetches or retries GETs automatically.

### POST `/api/tournaments/create`

Request body:

```json
{
  "name": "Fall Championship 2026",
  "teamIds": [1, 2, 3, 4],
  "startDate": "2026-11-01",
  "time": "18:00",
  "location": "Main Arena Stadium"
}
```

- `name` (required, max 100 characters)
- `teamIds` (required): existing team ids, no duplicates. The count must be a power of two, 2 to 32. The list order is the bracket order: teams 1 and 2 play each other, 3 and 4, and so on. The first team in each pair is the home team.
- `startDate` (required, `YYYY-MM-DD`)
- `time` (optional, `HH:MM` 24-hour, default `18:00`)
- `location` (optional)

Only round 1 is created. Later rounds are created by the simulation once their participants are known. The response is `201` with the tournament, its `games`, and zeroed `standings`.

### GET `/api/tournaments`

```json
[
  { "id": "1", "name": "Fall Championship 2026", "status": "in_progress", "createdBy": "2", "createdAt": "2026-09-20T02:12:00.000Z", "teamCount": 4 }
]
```

### GET `/api/tournaments/:id`

The tournament fields plus `games`, ordered by round then game:

```json
{
  "id": "1",
  "name": "Fall Championship 2026",
  "status": "in_progress",
  "createdBy": "2",
  "createdAt": "2026-09-20T02:12:00.000Z",
  "games": [
    {
      "id": "1",
      "round": 1,
      "description": "Semi-Final Match",
      "homeTeamId": "1",
      "homeTeamName": "Thunderbolts",
      "awayTeamId": "2",
      "awayTeamName": "Vipers",
      "date": "2026-09-15",
      "time": "18:00",
      "location": "Main Arena Stadium",
      "homeScore": 84,
      "awayScore": 78,
      "status": "completed",
      "winnerTeamId": "1"
    }
  ]
}
```

A game is `completed` once its scores differ. Elimination games cannot end in a draw, so equal scores (the default `0-0`) mean the game has not been played yet.

### GET `/api/tournaments/:id/simulation`

Plays every undecided game with random scores (0 to 5 per side, re-rolled on a tie). After each round it creates the next round from the winners, scheduled 7 days after the previous round at the same time, until the final is played. It then sets the tournament status to `completed`. The API does not compute standings: database triggers recompute them whenever a game's score changes (see [Standings and history](#standings-and-history)).

The response is the tournament, its `games`, its `standings`, and the `champion` (the rank 1 standings row). Everything runs in one transaction, so a failure leaves the tournament unchanged.

`409` is returned if the tournament is already `completed` or `cancelled`, or if a round is missing games (for example, a game was deleted by hand).

### GET `/api/tournaments/:id/standings`

Ranked by wins (a deeper run through the bracket), then total points scored:

```json
[
  { "rank": 1, "teamId": "3", "teamName": "Falcons", "wins": 2, "losses": 0, "draws": 0, "score": 10 }
]
```

`draws` is always 0 in single elimination. `score` is the total points the team has scored in the tournament.

### DELETE `/api/tournaments/:id/delete`

Returns `204`. The tournament's standings, games and the tournament itself are deleted in one transaction. Games from other tournaments and regular scheduled games are not affected. The children are deleted explicitly, not left to the foreign-key cascade, so the history log records each one.

## Errors

| Status | Meaning |
| --- | --- |
| 400 | Invalid id or request body (message in `error`) |
| 401 | Not logged in |
| 403 | Wrong role, or not the tournament's creator |
| 404 | Tournament not found |
| 409 | Tournament already finished, or bracket is inconsistent |

## Database

Added to `database/sports_team_management_database.sql`:

- `tournament` (`id`, `user_id` creator, `name`, `status`, `date_created`)
- `tournament_standings` (`tournament_id`, `team_id`, `win`, `loss`, `draw`, `score`; unique per tournament and team)
- `games.round`, `games.tournament_id`, `games.descriptions` (`round` and `tournament_id` are `NULL` for regular scheduled games, whose `descriptions` is `'Friendly Game'` when added through the coach schedule route)
- `view_teams_with_games` now exposes `home_team_name`, `away_team_name`, `round`, `tournament_id` and `descriptions`

Tournament games are ordinary rows in `games`, so they also appear in each team's schedule.

### Applying it to an existing database

There are two ways to get this schema:

| | Command | Effect |
| --- | --- | --- |
| Fresh start | `mysql -u root < database/sports_team_management_database.sql` | Drops and recreates the whole database, with seed data. All existing data and history are lost. |
| Upgrade in place | `mysql -u root sports_team_management < database/migrations/001_tournaments_and_history.sql` | Keeps every existing row. Adds the tournament tables, the new `games` columns, the triggers, the history log and the views. |

Take a backup before upgrading: `mysqldump -u root --routines --triggers sports_team_management > backup.sql`. The migration is safe to run more than once, and `schema_migrations` records that it was applied. History starts when the migration runs; earlier changes are not in `audit_log`. There is no automatic rollback (it would delete tournaments and history), so undo means restoring the backup.

The migration was checked against a copy of a real database and a database built from the previous schema file: existing rows were unchanged, the result matched a fresh install of the main file table for table and trigger for trigger, and re-running it changed nothing.

## Standings and history

Both are done by the database, so they apply no matter which client changes the data: this API, MySQL Workbench, or a SQL import.

**Standings.** `sp_recalculate_tournament_standings` recomputes a tournament's wins, losses and points scored from its decided games. Triggers on `games` (`trg_games_standings_insert`, `_update`, `_delete`) call it whenever a tournament game is inserted, changed or removed. Writing a result straight into `games`, for example `UPDATE games SET home_team_score = 71, away_team_score = 88 WHERE id = 6`, updates the standings immediately.

**History.** `audit_log` is an append-only table. Triggers on `games`, `tournament`, `tournament_standings`, `teams`, `team_memberships` and `team_join_requests` write a row for every insert, delete, and update that changes a logged column: table, record id, action, old and new values (JSON), the database user, and a timestamp. Two views read it:

- `view_game_history`: schedule changes and results, with `event` (`game_scheduled`, `score_updated`, `game_updated`, `game_removed`), old and new scores, `winner_name` and `loser_name`.
- `view_player_history`: `joined_team`, `left_team`, `roster_updated`, `join_requested`, `join_approved`, `join_rejected`, with the player and team names.

```sql
SELECT * FROM view_game_history WHERE tournament_id = 1 ORDER BY log_id;
SELECT * FROM view_player_history WHERE user_id = 3 ORDER BY log_id;
```

Never logged: `users` (so no `password_hash`), `sessions` and `messages`.

## Frontend

| Route | Screen |
| --- | --- |
| `/tournaments` | List of tournaments; "New tournament" for coaches and administrators |
| `/tournaments/new` | Create form: name, date, time, location, team picker with bracket order (2, 4, 8, 16 or 32 teams) |
| `/tournaments/:id` | Bracket by round (unplayed rounds shown as placeholders), standings, champion; Simulate and Delete (with confirmation) for the creator or an administrator |

Code: `client/src/pages/Tournament*.tsx`, `client/src/lib/tournamentApi.ts`, `client/src/lib/tournamentBracket.ts`. The API layer shows the server's `error` message when a request fails.

## Known Limitations

- MySQL does not fire triggers for rows removed by a foreign-key cascade. Deleting a tournament through this API is fully logged, but deleting a tournament or team directly in SQL logs only that one row, and deleting a team leaves other teams' standings stale until their next game change.
- The history log records the database user (for example `root@localhost`), not the application user who made the change.
- The main SQL file starts with `DROP DATABASE`, so reloading it erases the history. Use the migration to upgrade a database that already holds data.
- The coach schedule routes (`PATCH`/`DELETE /api/coaches/me/teams/:teamId/schedule/:gameId`) do not know about tournaments. Deleting a tournament game there makes the simulation return `409` for that tournament.
- Fields that are not a power of two (for example 6 teams) are rejected; byes are not supported.
