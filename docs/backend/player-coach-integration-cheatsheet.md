# Player & Coach Features — Backend Integration Reference

## Purpose

This originally documented the contract needed to replace the frontend's mock data with real backend endpoints. **That work is now done** — the player and coach pages call real API endpoints against the real database. This doc now describes what was actually built, as a reference.

## Status (2026-08-30)

Fully implemented and verified end to end against a local MySQL instance:

- Auth (`server/routes/auth.js`) returns `role` on login.
- `server/routes/team.js` — `GET /`, `GET /search?name=`, `GET /:id` (includes roster), `POST /:id/join-requests`.
- `server/routes/player.js` (rewritten) — `GET /me`, `GET /me/team/roster`, `GET /me/team/schedule`, `DELETE /me/team`.
- `server/routes/coach.js` (rewritten) — `GET /me/team`, `GET /me/team/schedule`, `GET /me/team/join-requests`, `PATCH /me/team/join-requests/:id`, `DELETE /me/team/roster/:userId`, `POST /me/team/schedule`, `PATCH /me/team/schedule/:gameId`, `DELETE /me/team/schedule/:gameId`.
- New: `server/middleware/requireAuth.js` — verifies the `Authorization: Bearer <token>` header (or `sessionToken` cookie) against the `sessions` table and attaches `req.user`. Nothing was authenticated before this; every route above uses it, and `coach.js` additionally requires `req.user.role === "coach"`.
- New: `server/lib/gameFormat.js` — shared helper translating a `games` row (one row per matchup: `home_team_id`/`away_team_id`) into the frontend's per-team shape (`opponent`, `homeAway`), used by both `player.js` and `coach.js`.
- `client/src/lib/mockPlayerData.ts` — every function now calls the real API (`apiRequest`, `{ authenticated: true }`) instead of returning fixture data. Same file name/exports, so no other frontend file needed to change its imports.

## How the two schema mismatches from before were resolved

- **`Team.city`**: dropped from the frontend entirely (type, `SearchTeamsPage.tsx`'s search form, `mockPlayerData.ts`) rather than adding an unused column to `teams`.
- **`games` is per-matchup, not per-team**: `gameFormat.js` does the translation server-side — every schedule endpoint returns the frontend's `{ opponent, homeAway }` shape, derived by checking whether `home_team_id` matches the caller's team.

## Schema change: `team_memberships` gained two columns

Neither `position` nor `jersey_number` existed anywhere in the schema. Added both as nullable columns on `team_memberships` (not a new table) — see `database/sports_team_management_database.sql`. Both are `NULL` until a coach sets them, which happens at join-request approval time (see below).

## The roster-management flow ended up different from the original suggestion

The original cheat sheet suggested a freeform "add player by email" endpoint. That's not what got built — the actual (confirmed) intended flow is:

1. A player finds a team (`SearchTeamsPage`) and requests to join — `POST /api/teams/:id/join-requests`, inserts a `pending` row into `team_join_requests`. This already existed.
2. The coach sees pending requests on `CoachRosterPage` (`GET /api/coaches/me/team/join-requests`), enters a position and jersey number per request, and **approves or rejects** (`PATCH /api/coaches/me/team/join-requests/:id`, body `{ status, position, jerseyNumber }`). Approving inserts the `team_memberships` row (with position/jersey) and marks the request `approved`; rejecting just updates status.

There is no "add player" form anymore — roster additions always go through this request/approve loop. `CoachRosterPage.tsx` was rewritten accordingly.

Similarly, `CoachSchedulePage.tsx`'s "Opponent" field is now a `<select>` populated from `GET /api/teams`, not freeform text — `games.away_team_id`/`home_team_id` are foreign keys to `teams`, so the opponent has to already exist in the system.

## Known limitation (by design, not a bug)

Seed data shows some users belong to more than one team (e.g. `coach_smith` head-coaches both `Thunderbolts` and `Vipers`). The frontend data model assumes one team per user. Every "my team" / "my managed team" query picks the first `team_memberships` row (ordered by `id`) — a real coach or player with multiple teams will only ever see the first one in this UI. Fixing that would mean a team-switcher UI, which is out of scope for now.

## Bug found and fixed during this work: date/time round-tripping

`gameFormat.js` originally built the response date with `.toISOString()` (UTC) and the time with `.toTimeString()` (local) — mixing timezones shifted the date by a day whenever the server wasn't in UTC. Fixed to use local-time getters consistently for both.

## Local dev setup reminder

The local database is disposable dev data — reloading `database/sports_team_management_database.sql` (`mysql -u root < database/sports_team_management_database.sql`) wipes and reseeds everything, including any password hash changes made directly in MySQL for testing real logins. Re-apply those after every reload.
