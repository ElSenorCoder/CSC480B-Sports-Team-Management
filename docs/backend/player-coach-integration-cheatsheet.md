# Player & Coach Features — Backend Integration Reference

## Purpose

This originally documented the contract needed to replace the frontend's mock data with real backend endpoints. **That work is now done** — the player and coach pages call real API endpoints against the real database. This doc now describes what was actually built, as a reference.

## Status (2026-09-04)

Fully implemented and verified end to end against a local MySQL instance:

- Auth (`server/routes/auth.js`) returns `role` on login.
- `server/routes/user.js` (new) — `GET /me`: profile only (`id`, `name`, `email`, `role`, `phone`). Not player- or coach-specific — every user has one.
- `server/routes/team.js` — `GET /`, `GET /search?name=`, `GET /:id` (includes roster), `GET /me` (every team the caller belongs to, see below), `GET /:id/games` (that team's schedule), `POST /:id/join-requests`, `DELETE /:id/membership` (leave a team).
- `server/routes/player.js` — **removed**. Everything it did is now covered by `/api/user/me` and the team-scoped endpoints above; there was nothing left that was actually player-specific.
- `server/routes/coach.js` (unchanged this round) — `GET /me/team`, `GET /me/team/schedule`, `GET /me/team/join-requests`, `PATCH /me/team/join-requests/:id`, `DELETE /me/team/roster/:userId`, `POST /me/team/schedule`, `PATCH /me/team/schedule/:gameId`, `DELETE /me/team/schedule/:gameId`. Still single-managed-team-scoped; the multi-team fix below only covers the player-facing "My Team" flow.
- `server/middleware/requireAuth.js` — verifies the `Authorization: Bearer <token>` header (or `sessionToken` cookie) against the `sessions` table and attaches `req.user` (now includes `phone`). Every route above uses it.
- `server/lib/gameFormat.js` — shared helper translating a `games` row (one row per matchup: `home_team_id`/`away_team_id`) into the frontend's per-team shape (`opponent`, `homeAway`), used by both `team.js` and `coach.js`.
- `client/src/lib/mockPlayerData.ts` — every function calls the real API (`apiRequest`, `{ authenticated: true }`); no fixture data left.

## Route naming and multi-team fix (2026-09-04)

A teammate reviewing the first pass flagged two real issues, both addressed:

1. **Profile and team routes were scoped under `/api/players/...`**, implying only players have a profile or a team. Fixed by moving profile to `/api/user/me` (any role) and "my teams" to `/api/teams/me` (any role, team-agnostic).
2. **The data model assumed one team per user** (previously logged below as a known limitation). This was a real gap, not just a naming issue — seed data has `coach_smith` head-coaching two teams. Fixed properly: `GET /api/teams/me` now returns **every** team the caller belongs to (as player, assistant coach, or head coach), each tagged with `roleInTeam`. The frontend's "My Team" page is now a team list; selecting one navigates to `/team/:id` (roster) and, from there, `/team/:id/schedule` (that team's games via `GET /api/teams/:id/games`). There's no more standalone top-level "Schedule" nav item.

This fix only covers the player-facing flow (`team.js`). `coach.js`'s "my managed team" endpoints still pick the first coaching membership by id — a coach managing two teams (like the seed data's `coach_smith`) still only sees one on the Manage Roster/Schedule pages. Extending the same multi-team pattern to the coach pages is the natural next step but wasn't part of this round's ask.

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

`coach.js`'s "managed team" queries still pick the first coaching `team_memberships` row (ordered by `id`) — a coach managing more than one team (e.g. `coach_smith`, who head-coaches both `Thunderbolts` and `Vipers`) only sees one on the Manage Roster/Manage Schedule pages. The player-facing side of this was fixed (see above); the coach side wasn't part of this round.

## Bug found and fixed during this work: date/time round-tripping

`gameFormat.js` originally built the response date with `.toISOString()` (UTC) and the time with `.toTimeString()` (local) — mixing timezones shifted the date by a day whenever the server wasn't in UTC. Fixed to use local-time getters consistently for both.

## Local dev setup reminder

The local database is disposable dev data — reloading `database/sports_team_management_database.sql` (`mysql -u root < database/sports_team_management_database.sql`) wipes and reseeds everything, including any password hash changes made directly in MySQL for testing real logins. Re-apply those after every reload.
