# Player & Coach Features — Backend Integration Cheat Sheet

## Purpose

The player and coach workspace pages are built and working in the React app against mock data in `client/src/lib/mockPlayerData.ts`. Nothing here is theoretical — every shape below is copied directly from working frontend code.

The frontend was built without a database migration or new backend routes (that work was intentionally left to whoever owns the DB/backend). This document is the contract: match these shapes and endpoints, and the only frontend change needed is rewriting the insides of the functions in `mockPlayerData.ts` — the pages themselves (`ProfilePage`, `TeamPage`, `SchedulePage`, `SearchTeamsPage`, `CoachRosterPage`, `CoachSchedulePage`) don't need to change.

## Status update (2026-08-29)

A real schema landed (`database/sports_team_management_database.sql`) and was tested end-to-end against a local MySQL instance. Two things were already fixed as part of that testing — **do not redo these**:

- **`server/routes/auth.js`** — `/login` now joins `roles` and returns `{ id, name, email, role }` on `user` (plus `expiresIn`), matching §2 below. Verified: logging in as `player_alex` now returns `"role": "player"` and the frontend correctly shows the player nav.
- **`server/routes/team.js`** — now queries `teams` (plural) instead of the nonexistent `team` table. `/search` now only takes `?name=` (the real `teams` table has no `city` column, so that param was dropped). `/:teamNumber` is now `/:id` matching the real primary key.

**Still broken / not started** — see the updated §1 and §5 below, the real schema shape differs from what this doc originally suggested:

- `server/routes/player.js` and `server/routes/coach.js` still query nonexistent `player`/`coach` tables — the real schema has no such tables at all (see §1).
- None of the §3 endpoints below (profile, roster, schedule, join requests) are implemented yet — only `GET /api/teams`, `/api/teams/search`, `/api/teams/:id`, and `/api/auth/login` currently work against the real DB.

## 1. Actual schema (already built — do not redesign this)

The tables below already exist in `database/sports_team_management_database.sql` and are loaded and working. This supersedes the "suggested" table list that used to be here — **there are no separate `player_profiles`/`coach_profiles` tables**; a user's team and role-on-team come from `team_memberships` instead.

| Table | Key columns | Notes |
| --- | --- | --- |
| `teams` | `id`, `name`, `description`, `created_by` | No `city` column. |
| `team_memberships` | `id`, `team_id` FK→`teams`, `user_id` FK→`users`, `role_in_team` enum(`head_coach`,`assistant_coach`,`player`), `joined_at` | This is how you find "my team" and "my roster" — join through here, not a `team_id` column on `users`. |
| `team_join_requests` | `id`, `team_id` FK→`teams`, `user_id` FK→`users`, `status` enum(`pending`,`approved`,`rejected`), `requested_at`, `updated_at` | Only need to `INSERT` a `pending` row for now — no approval UI yet (explicitly deferred). |
| `games` | `id`, `home_team_id` FK→`teams`, `away_team_id` FK→`teams`, `game_date` (DATETIME), `location`, `home_team_score`, `away_team_score`, `status` enum(`scheduled`,`in_progress`,`completed`,`cancelled`) | Both teams in one row, not one row per team. `homeAway` (§2) and "my schedule" need to be derived by checking whether `home_team_id` or `away_team_id` matches my team. |

Also: `views` already exist — `view_active_users`, `view_team_rosters`, `view_pending_join_requests`, `view_game_schedule` — probably useful shortcuts for the endpoints in §3 instead of hand-writing the joins.

## 2. Frontend data shapes (must match exactly)

Copied from `client/src/lib/mockPlayerData.ts`:

```ts
type PlayerProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  position: string;
  jerseyNumber: number;
  teamId: string | null;
  teamName: string | null;
};

type Teammate = {
  id: string;
  name: string;
  position: string;
  jerseyNumber: number;
  email: string;
};

type Team = {
  id: string;
  name: string;
  city: string;
  roster: Teammate[];
};

type Game = {
  id: string;
  teamId: string;
  opponent: string;
  date: string;        // "YYYY-MM-DD"
  time: string;         // free text, e.g. "6:00 PM"
  location: string;
  homeAway: "home" | "away";
};
```

Note the casing: `teamId`, `jerseyNumber`, `homeAway` — all camelCase, not the `snake_case` used in the DB. Map the row in the route handler before responding (`team.js` already does this correctly — `SELECT *` as-is, since MySQL column names for `teams` happen to already be lowercase single words).

**Two shape mismatches to decide on, not yet resolved:**
- `Team.city` — the frontend type has it, the real `teams` table doesn't. Either add a `city` column to `teams`, or drop `city` from the frontend type/`SearchTeamsPage.tsx` search form and `mockPlayerData.ts`.
- `Game` — the frontend models one row per *my team's* game (`teamId`, `opponent`, `homeAway`). The real `games` table models one row per *matchup* (`home_team_id`, `away_team_id`, `game_date`, `status`, no free-text `opponent`/`time`). Whoever implements `GET /api/.../schedule` needs to derive `opponent` (the other team's name) and `homeAway` (`home` if `home_team_id` is my team, else `away`) per row — that translation has to happen somewhere, either in the SQL/route or client-side.

## 3. Suggested endpoints

One suggested REST shape per mock function currently in `mockPlayerData.ts`. None of these are implemented yet (only `GET /api/teams`, `/api/teams/search`, `/api/teams/:id` exist, per the status update above):

| Mock function | Suggested endpoint | Notes |
| --- | --- | --- |
| `getMyProfile()` | `GET /api/players/me` | join `users` + `roles` + `team_memberships` + `teams` (no more `player_profiles` — see §1) |
| `getTeammates()` | `GET /api/players/me/team/roster` | via `team_memberships` for my `team_id`; `view_team_rosters` may already do this join |
| `getMySchedule()` | `GET /api/players/me/team/schedule` | `games` where `home_team_id` or `away_team_id` = my team; see the `Game` shape note above |
| `searchTeams({name})` | `GET /api/teams/search?name=` | done — see status update |
| `isMyTeam(teamId)` | *(no endpoint — derived client-side from `getMyProfile().teamId`)* | |
| `requestToJoinTeam(teamId)` | `POST /api/teams/:id/join-requests` | insert a `pending` row into `team_join_requests`; empty body |
| `leaveMyTeam()` | `DELETE /api/players/me/team` | delete the caller's row from `team_memberships` |
| `getManagedTeam()` | `GET /api/coach/team` | the team where I have a `team_memberships` row with `role_in_team` = `head_coach`/`assistant_coach`, plus its roster |
| `getManagedSchedule()` | `GET /api/coach/team/schedule` | |
| `addPlayerToRoster({name, position, jerseyNumber, email})` | `POST /api/coach/team/roster` | there's no `position`/`jersey_number` column anywhere in the current schema — needs a decision: add columns to `team_memberships`, or a separate table |
| `removePlayerFromRoster(playerId)` | `DELETE /api/coach/team/roster/:playerId` | delete the `team_memberships` row |
| `addGame({opponent, date, time, location, homeAway})` | `POST /api/coach/team/schedule` | maps to inserting a `games` row (opponent → the other `team_id`) |
| `updateGame(gameId, updates)` | `PATCH /api/coach/team/schedule/:gameId` | partial update |
| `deleteGame(gameId)` | `DELETE /api/coach/team/schedule/:gameId` | |

All of the above (except `searchTeams`) are authenticated — pull the acting user from the session token the same way any other protected route would.

## 4. Integration point (frontend side)

When these endpoints exist, only one file needs edits: `client/src/lib/mockPlayerData.ts`. Swap each function body from returning fixture data to calling `apiRequest` (`client/src/lib/api/apiClient.ts`, same helper `authApi.ts` already uses) against the endpoint above. Keep the function names, parameters, and return shapes identical and no page component needs to change.

Also remove the local-only demo logins in `client/src/lib/auth/authApi.ts` (`player.demo` / `player2.demo` / `coach.demo`) once real login reliably returns `role` — they're clearly commented as a temporary stand-in. (It already does, as of the fix above — this can be removed now if you want the real login to be the only path.)

## 5. Known gaps in the existing stub routes

- `server/routes/team.js` — **fixed**, see status update at the top.
- `server/routes/player.js` and `server/routes/coach.js` are still just `SELECT * FROM player` / `SELECT * FROM coach` against tables that don't exist and never will under this schema — there's no `player`/`coach` table, that data now lives in `users` (filtered by `roles.name`) joined through `team_memberships`. These two files need to be rewritten against the real schema, not just have their table name fixed.
