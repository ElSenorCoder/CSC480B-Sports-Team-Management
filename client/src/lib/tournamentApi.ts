import { apiRequest } from "./api/apiClient";

export type TournamentStatus =
  | "upcoming"
  | "in_progress"
  | "completed"
  | "cancelled";

export type TournamentSummary = {
  id: string;
  name: string;
  status: TournamentStatus;
  createdBy: string;
  createdAt: string;
  teamCount: number;
};

export type TournamentGame = {
  id: string;
  round: number | null;
  description: string | null;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  date: string;
  time: string;
  location: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: "scheduled" | "completed";
  winnerTeamId: string | null;
};

export type StandingRow = {
  rank: number;
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  draws: number;
  score: number;
};

export type Tournament = Omit<TournamentSummary, "teamCount"> & {
  games: TournamentGame[];
};

export type SimulationResult = Tournament & {
  standings: StandingRow[];
  champion?: StandingRow;
};

export type CreateTournamentInput = {
  name: string;
  teamIds: string[];
  startDate: string;
  time?: string;
  location?: string;
};

const AUTH = { authenticated: true };

export function listTournaments(): Promise<TournamentSummary[]> {
  return apiRequest<TournamentSummary[]>("/tournaments", {}, AUTH);
}

export function getTournament(id: string): Promise<Tournament> {
  return apiRequest<Tournament>(`/tournaments/${id}`, {}, AUTH);
}

export function getTournamentStandings(id: string): Promise<StandingRow[]> {
  return apiRequest<StandingRow[]>(`/tournaments/${id}/standings`, {}, AUTH);
}

export function createTournament(
  input: CreateTournamentInput,
): Promise<Tournament & { standings: StandingRow[] }> {
  return apiRequest(
    "/tournaments/create",
    { method: "POST", body: JSON.stringify(input) },
    AUTH,
  );
}

// The API plays the games on a GET (it writes results), so this is a GET on
// purpose. Only call it from an explicit user action.
export function simulateTournament(id: string): Promise<SimulationResult> {
  return apiRequest<SimulationResult>(`/tournaments/${id}/simulation`, {}, AUTH);
}

export function deleteTournament(id: string): Promise<void> {
  return apiRequest<void>(`/tournaments/${id}/delete`, { method: "DELETE" }, AUTH);
}
