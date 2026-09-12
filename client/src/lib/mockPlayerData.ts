import { apiRequest } from "./api/apiClient";

export type PlayerProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
};

export type MyTeam = {
  id: string;
  name: string;
  description?: string | null;
  roleInTeam: "head_coach" | "assistant_coach" | "player";
  position: string | null;
  jerseyNumber: number | null;
};

export type Teammate = {
  id: string;
  name: string;
  position: string | null;
  jerseyNumber: number | null;
  email: string;
};

export type Team = {
  id: string;
  name: string;
  description?: string | null;
  roster?: Teammate[];
};

export type Game = {
  id: string;
  opponent: string;
  date: string;
  time: string;
  location: string;
  homeAway: "home" | "away";
};

export type JoinRequest = {
  id: string;
  userId: string;
  name: string;
  email: string;
  requestedAt: string;
};

const AUTH = { authenticated: true };

// =========================
// Player: profile, teams, schedule, search
// =========================

export function getMyProfile(): Promise<PlayerProfile> {
  return apiRequest<PlayerProfile>("/user/me", {}, AUTH);
}

export function getMyTeams(): Promise<MyTeam[]> {
  return apiRequest<MyTeam[]>("/teams/me", {}, AUTH);
}

export function getTeamSchedule(teamId: string): Promise<Game[]> {
  return apiRequest<Game[]>(`/teams/${teamId}/games`, {}, AUTH);
}

export async function searchTeams(query: { name?: string }): Promise<Team[]> {
  const name = query.name?.trim();
  if (!name) {
    return apiRequest<Team[]>("/teams", {}, AUTH);
  }

  try {
    return await apiRequest<Team[]>(
      `/teams/search?name=${encodeURIComponent(name)}`,
      {},
      AUTH,
    );
  } catch {
    // The search endpoint 404s when nothing matches — treat as no results.
    return [];
  }
}

export function getTeamById(teamId: string): Promise<Team> {
  return apiRequest<Team>(`/teams/${teamId}`, {}, AUTH);
}

export function requestToJoinTeam(teamId: string): Promise<void> {
  return apiRequest<void>(
    `/teams/${teamId}/join-requests`,
    { method: "POST" },
    AUTH,
  );
}

export function leaveTeam(teamId: string): Promise<void> {
  return apiRequest<void>(`/teams/${teamId}/membership`, { method: "DELETE" }, AUTH);
}

// =========================
// Coach: manage roster and schedule for the teams they coach
// =========================

export type ManagedTeam = {
  id: string;
  name: string;
  roleInTeam: "head_coach" | "assistant_coach";
};

export function getMyManagedTeams(): Promise<ManagedTeam[]> {
  return apiRequest<ManagedTeam[]>("/coaches/me/teams", {}, AUTH);
}

export function getManagedTeam(teamId: string): Promise<Team> {
  return apiRequest<Team>(`/coaches/me/teams/${teamId}`, {}, AUTH);
}

export function getManagedSchedule(teamId: string): Promise<Game[]> {
  return apiRequest<Game[]>(`/coaches/me/teams/${teamId}/schedule`, {}, AUTH);
}

export function getPendingJoinRequests(teamId: string): Promise<JoinRequest[]> {
  return apiRequest<JoinRequest[]>(`/coaches/me/teams/${teamId}/join-requests`, {}, AUTH);
}

export function approveJoinRequest(
  teamId: string,
  requestId: string,
  details: { position: string; jerseyNumber: number },
): Promise<void> {
  return apiRequest<void>(
    `/coaches/me/teams/${teamId}/join-requests/${requestId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "approved", ...details }),
    },
    AUTH,
  );
}

export function rejectJoinRequest(teamId: string, requestId: string): Promise<void> {
  return apiRequest<void>(
    `/coaches/me/teams/${teamId}/join-requests/${requestId}`,
    { method: "PATCH", body: JSON.stringify({ status: "rejected" }) },
    AUTH,
  );
}

export function removePlayerFromRoster(teamId: string, playerId: string): Promise<void> {
  return apiRequest<void>(
    `/coaches/me/teams/${teamId}/roster/${playerId}`,
    { method: "DELETE" },
    AUTH,
  );
}

export function addGame(
  teamId: string,
  input: {
    opponentTeamId: string;
    date: string;
    time: string;
    location: string;
    homeAway: Game["homeAway"];
  },
): Promise<void> {
  return apiRequest<void>(
    `/coaches/me/teams/${teamId}/schedule`,
    { method: "POST", body: JSON.stringify(input) },
    AUTH,
  );
}

export function deleteGame(teamId: string, gameId: string): Promise<void> {
  return apiRequest<void>(
    `/coaches/me/teams/${teamId}/schedule/${gameId}`,
    { method: "DELETE" },
    AUTH,
  );
}
