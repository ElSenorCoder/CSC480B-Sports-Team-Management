# Player & Coach Features — Backend Integration Cheat Sheet

## Purpose

The player and coach workspace pages are built and working in the React app against mock data in `client/src/lib/mockPlayerData.ts`. Nothing here is theoretical — every shape below is copied directly from working frontend code.

The frontend was built without a database migration or new backend routes (that work was intentionally left to whoever owns the DB/backend). This document is the contract: match these shapes and endpoints, and the only frontend change needed is rewriting the insides of the functions in `mockPlayerData.ts` — the pages themselves (`ProfilePage`, `TeamPage`, `SchedulePage`, `SearchTeamsPage`, `CoachRosterPage`, `CoachSchedulePage`) don't need to change.

## 0. Blocking fix: login must return `role`

`server/routes/auth.js`'s `/login` response currently does **not** include a role at all:

```js
// current — missing role
res.status(200).send({ user: user, token: sessionToken });
```

The frontend types (`client/src/types/auth.ts`) and every existing doc (`docs/backend/authentication-api-contract.md`, `docs/backend/BACKEND_INTEGRATION.md`) already expect:

```json
{
  "token": "session-token",
  "expiresIn": 3600,
  "user": {
    "id": "42",
    "name": "Jordan Coach",
    "email": "coach@example.com",
    "role": "coach"
  }
}
```

`role` must be lowercase `"administrator" | "coach" | "player"`. **The entire player/coach nav is gated on this field** (`client/src/components/layout/AppShell.tsx` checks `user.role === "player"` / `"coach"`). Until this is fixed, no real login can reach the new pages — only the frontend's local demo logins (`player.demo` / `coach.demo`, see §5) can.

Fix: join `users` → `roles` in the login query (already documented in `docs/database/DATABASE_INTEGRATION.md`) and add `role: r.name` (and `name: u.display_name` or `first_name + last_name`) to the response.

## 1. New tables needed

Sprint 1 only has `roles`, `users`, `sessions`. `docs/database/DATABASE_INTEGRATION.md` already earmarks `player_profiles` / `coach_profiles` for this stage. Suggested additions:

| Table | Key columns |
| --- | --- |
| `teams` | `id`, `name`, `city` |
| `player_profiles` | `user_id` FK→`users`, `team_id` FK→`teams` (nullable — a player can be teamless), `position`, `jersey_number`, `phone` |
| `coach_profiles` | `user_id` FK→`users`, `team_id` FK→`teams` (the one team this coach manages) |
| `games` | `id`, `team_id` FK→`teams`, `opponent`, `date`, `time`, `location`, `home_away` enum(`home`,`away`) |
| `join_requests` | `id`, `user_id` FK→`users`, `team_id` FK→`teams`, `status` enum(`pending`,...), `created_at` |

`join_requests` only needs to support **creating** a row right now — there's no coach-side approval UI yet (that was explicitly deferred), so no "approve/deny" endpoint is required for this pass.

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

Note the casing: `teamId`, `jerseyNumber`, `homeAway` — all camelCase, not the `snake_case`/`PascalCase` used in the existing DB columns and in `server/routes/team.js`'s raw `SELECT *`. Either alias columns in SQL (`SELECT id, name, city ...`) or map the row in the route handler before responding.

## 3. Suggested endpoints

One suggested REST shape per mock function currently in `mockPlayerData.ts`:

| Mock function | Suggested endpoint | Notes |
| --- | --- | --- |
| `getMyProfile()` | `GET /api/players/me` | auth required; join `player_profiles` + `users` + `teams` |
| `getTeammates()` | `GET /api/players/me/team/roster` | roster of the caller's own team |
| `getMySchedule()` | `GET /api/players/me/team/schedule` | games for the caller's own team |
| `searchTeams({name, city})` | `GET /api/teams/search?name=&city=` | already stubbed in `team.js` — just fix the response shape (§2) |
| `isMyTeam(teamId)` | *(no endpoint — derived client-side from `getMyProfile().teamId`)* | |
| `requestToJoinTeam(teamId)` | `POST /api/teams/:id/join-requests` | insert a `pending` row; empty body |
| `leaveMyTeam()` | `DELETE /api/players/me/team` | sets `player_profiles.team_id = NULL` |
| `getManagedTeam()` | `GET /api/coach/team` | the coach's own team + roster |
| `getManagedSchedule()` | `GET /api/coach/team/schedule` | |
| `addPlayerToRoster({name, position, jerseyNumber, email})` | `POST /api/coach/team/roster` | inserts a `player_profiles` row (and probably a `users` row, depending on whether added players need login access) |
| `removePlayerFromRoster(playerId)` | `DELETE /api/coach/team/roster/:playerId` | |
| `addGame({opponent, date, time, location, homeAway})` | `POST /api/coach/team/schedule` | |
| `updateGame(gameId, updates)` | `PATCH /api/coach/team/schedule/:gameId` | partial update |
| `deleteGame(gameId)` | `DELETE /api/coach/team/schedule/:gameId` | |

All of the above (except `searchTeams`) are authenticated — pull the acting user from the session token the same way any other protected route would.

## 4. Integration point (frontend side)

When these endpoints exist, only one file needs edits: `client/src/lib/mockPlayerData.ts`. Swap each function body from returning fixture data to calling `apiRequest` (`client/src/lib/api/apiClient.ts`, same helper `authApi.ts` already uses) against the endpoint above. Keep the function names, parameters, and return shapes identical and no page component needs to change.

Also remove the local-only demo logins in `client/src/lib/auth/authApi.ts` (`player.demo` / `player2.demo` / `coach.demo`) once real login reliably returns `role` — they're clearly commented as a temporary stand-in.

## 5. Known gaps in the existing stub routes

- `server/routes/team.js` already has `GET /`, `GET /search`, `GET /:teamNumber` — but returns raw `SELECT *` rows against a `team` table that doesn't exist yet, with different column casing (`Name`, `City`, `teamNumber`) than the frontend expects (§2).
- `server/routes/player.js` and `server/routes/coach.js` are just `SELECT * FROM player` / `SELECT * FROM coach` against tables that don't exist — they'll need the schema in §1 before they'll run at all.
