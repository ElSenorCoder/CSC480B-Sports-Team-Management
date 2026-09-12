# Player & Coach Features — Backend Integration Reference

## Purpose

This originally documented the contract needed to replace the frontend's mock data with real backend endpoints. **That work is now done** — the player and coach pages call real API endpoints against the real database. This doc now describes what was actually built, as a reference.

## Status (2026-09-11)

Fully implemented and verified end to end against a local MySQL instance:

- Auth (`server/routes/auth.js`) returns `role` on login.
- `server/routes/user.js` (new) — `GET /me`: profile only (`id`, `name`, `email`, `role`, `phone`). Not player- or coach-specific — every user has one.
- `server/routes/team.js` — `GET /`, `GET /search?name=`, `GET /:id` (includes roster), `GET /me` (every team the caller belongs to), `GET /:id/games` (that team's schedule), `POST /:id/join-requests`, `DELETE /:id/membership` (leave a team).
- `server/routes/player.js` — **removed**. Everything it did is now covered by `/api/user/me` and the team-scoped endpoints above; there was nothing left that was actually player-specific.
- `server/routes/coach.js` (rewritten to be multi-team, see below) — `GET /me/teams` (every team the caller coaches), `GET /me/teams/:teamId`, `GET /me/teams/:teamId/schedule`, `GET /me/teams/:teamId/join-requests`, `PATCH /me/teams/:teamId/join-requests/:id`, `DELETE /me/teams/:teamId/roster/:userId`, `POST /me/teams/:teamId/schedule`, `PATCH /me/teams/:teamId/schedule/:gameId`, `DELETE /me/teams/:teamId/schedule/:gameId`. Every route checks the caller actually coaches `:teamId` (403 otherwise) rather than assuming "the" managed team.
- `server/middleware/requireAuth.js` — verifies the `Authorization: Bearer <token>` header (or `sessionToken` cookie) against the `sessions` table and attaches `req.user` (includes `phone`). Every route above uses it.
- `server/lib/gameFormat.js` — shared helper translating a `games` row (one row per matchup: `home_team_id`/`away_team_id`) into the frontend's per-team shape (`opponent`, `homeAway`), used by both `team.js` and `coach.js`.
- `client/src/lib/mockPlayerData.ts` — every function calls the real API (`apiRequest`, `{ authenticated: true }`); no fixture data left.

## Route naming and multi-team fix (2026-09-04, extended 2026-09-11)

A teammate reviewing the first pass flagged two real issues:

1. **Profile and team routes were scoped under `/api/players/...`**, implying only players have a profile or a team. Fixed by moving profile to `/api/user/me` (any role) and "my teams" to `/api/teams/me` (any role, team-agnostic).
2. **The data model assumed one team per user.** Fixed for players on 2026-09-04: `GET /api/teams/me` returns every team the caller belongs to, tagged with `roleInTeam`; the frontend's "My Team" page is a team list, selecting one navigates to `/team/:id` (roster) and `/team/:id/schedule`.

On 2026-09-11 this was extended to the coach side, which had the identical gap: `coach.js` used to resolve "the" managed team by picking the first coaching `team_memberships` row, so `coach_smith` (who head-coaches both `Thunderbolts` and `Vipers` in seed data) could only ever reach one of them. Fixed the same way as the player side: `GET /api/coaches/me/teams` lists every team the caller coaches, the frontend's coach nav is now a single "My Teams" entry (`CoachTeamsPage.tsx`, mirroring `TeamPage.tsx`) leading to `/coach/team/:id` (roster) and `/coach/team/:id/schedule`. Also added "Profile" to the coach nav — the route already worked for any role, it just wasn't linked.

## How the two schema mismatches from before were resolved

- **`Team.city`**: dropped from the frontend entirely (type, `SearchTeamsPage.tsx`'s search form, `mockPlayerData.ts`) rather than adding an unused column to `teams`.
- **`games` is per-matchup, not per-team**: `gameFormat.js` does the translation server-side — every schedule endpoint returns the frontend's `{ opponent, homeAway }` shape, derived by checking whether `home_team_id` matches the caller's team.

## Schema change: `team_memberships` gained two columns

Neither `position` nor `jersey_number` existed anywhere in the schema. Added both as nullable columns on `team_memberships` (not a new table) — see `database/sports_team_management_database.sql`. Both are `NULL` until a coach sets them, which happens at join-request approval time (see below).

## The roster-management flow ended up different from the original suggestion

The original cheat sheet suggested a freeform "add player by email" endpoint. That's not what got built — the actual (confirmed) intended flow is:

1. A player finds a team (`SearchTeamsPage`) and requests to join — `POST /api/teams/:id/join-requests`, inserts a `pending` row into `team_join_requests`. This already existed.
2. The coach sees pending requests on `CoachRosterPage` (`GET /api/coaches/me/teams/:teamId/join-requests`), enters a position and jersey number per request, and **approves or rejects** (`PATCH /api/coaches/me/teams/:teamId/join-requests/:id`, body `{ status, position, jerseyNumber }`). Approving inserts the `team_memberships` row (with position/jersey) and marks the request `approved`; rejecting just updates status.

There is no "add player" form anymore — roster additions always go through this request/approve loop. `CoachRosterPage.tsx` was rewritten accordingly.

Similarly, `CoachSchedulePage.tsx`'s "Opponent" field is now a `<select>` populated from `GET /api/teams`, not freeform text — `games.away_team_id`/`home_team_id` are foreign keys to `teams`, so the opponent has to already exist in the system.

## Bugs found and fixed during this work

- **Date/time round-tripping**: `gameFormat.js` originally built the response date with `.toISOString()` (UTC) and the time with `.toTimeString()` (local) — mixing timezones shifted the date by a day whenever the server wasn't in UTC. Fixed to use local-time getters consistently for both.
- **`games.status` removed by a teammate's schema update** broke two queries that still selected it directly (`team.js`'s `GET /:id/games`, `coach.js`'s schedule query) — both would 500. Neither actually used the value (status is now computed in `view_game_schedule`, not read by the frontend), so this was just removing stale column references.
- **Jersey number `0` was rejected on approval** — `CoachRosterPage.tsx` validated with `!jerseyNumber`, which is `true` for the number `0`. Fixed to check the raw input string is non-empty and parses to a finite number, rather than truthiness of the parsed value.
- **Stale error messages persisted across actions** on `CoachRosterPage`, `CoachSchedulePage`, and `SearchTeamsPage` — an error from one action (e.g. a rejected approval) stayed on screen even after a later action succeeded, since only the failure path ever called `setError`. All three now clear the error on success.
- **Out-of-order team-detail responses on `SearchTeamsPage`** — clicking a team card fetched its roster, but clicking a second card before the first request resolved could let the slower response overwrite the faster one. Fixed with a ref tracking the most recently requested team id; a response is only applied if it's still the latest one requested.

## Local dev setup reminder

The local database is disposable dev data — reloading `database/sports_team_management_database.sql` (`mysql -u root < database/sports_team_management_database.sql`) wipes and reseeds everything, including any password hash changes made directly in MySQL for testing real logins. Re-apply those after every reload.
