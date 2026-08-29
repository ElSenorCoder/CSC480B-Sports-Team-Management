import { authUserStorage } from "./auth/tokenStorage";

export type PlayerProfile = {
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

export type Teammate = {
  id: string;
  name: string;
  position: string;
  jerseyNumber: number;
  email: string;
};

export type Team = {
  id: string;
  name: string;
  city: string;
  roster: Teammate[];
};

export type Game = {
  id: string;
  teamId: string;
  opponent: string;
  date: string;
  time: string;
  location: string;
  homeAway: "home" | "away";
};

const teams: Team[] = [
  {
    id: "hawks",
    name: "Hawks",
    city: "Chicago",
    roster: [
      { id: "t1", name: "Jordan Reyes", position: "Midfielder", jerseyNumber: 8, email: "jordan.reyes@example.com" },
      { id: "t2", name: "Priya Nair", position: "Forward", jerseyNumber: 11, email: "priya.nair@example.com" },
      { id: "t3", name: "Marcus Webb", position: "Goalkeeper", jerseyNumber: 1, email: "marcus.webb@example.com" },
      { id: "t4", name: "Lena Fischer", position: "Defender", jerseyNumber: 4, email: "lena.fischer@example.com" },
    ],
  },
  {
    id: "bears",
    name: "Bears",
    city: "Chicago",
    roster: [
      { id: "b1", name: "Sam Okafor", position: "Forward", jerseyNumber: 9, email: "sam.okafor@example.com" },
      { id: "b2", name: "Ana Cruz", position: "Defender", jerseyNumber: 3, email: "ana.cruz@example.com" },
    ],
  },
  {
    id: "falcons",
    name: "Falcons",
    city: "Denver",
    roster: [
      { id: "f1", name: "Dev Patel", position: "Midfielder", jerseyNumber: 7, email: "dev.patel@example.com" },
      { id: "f2", name: "Ruth Kim", position: "Goalkeeper", jerseyNumber: 1, email: "ruth.kim@example.com" },
    ],
  },
  {
    id: "wolves",
    name: "Wolves",
    city: "Austin",
    roster: [
      { id: "w1", name: "Ellis Moore", position: "Forward", jerseyNumber: 10, email: "ellis.moore@example.com" },
    ],
  },
];

const games: Game[] = [
  { id: "g1", teamId: "hawks", opponent: "Bears", date: "2026-07-12", time: "6:00 PM", location: "Riverside Field", homeAway: "home" },
  { id: "g2", teamId: "hawks", opponent: "Falcons", date: "2026-08-02", time: "4:30 PM", location: "Denver Sports Complex", homeAway: "away" },
  { id: "g3", teamId: "hawks", opponent: "Wolves", date: "2026-09-05", time: "7:00 PM", location: "Riverside Field", homeAway: "home" },
  { id: "g4", teamId: "hawks", opponent: "Bears", date: "2026-06-01", time: "5:00 PM", location: "Bears Municipal Stadium", homeAway: "away" },
  { id: "g5", teamId: "bears", opponent: "Hawks", date: "2026-07-12", time: "6:00 PM", location: "Riverside Field", homeAway: "away" },
  { id: "g6", teamId: "bears", opponent: "Wolves", date: "2026-09-20", time: "3:00 PM", location: "Bears Municipal Stadium", homeAway: "home" },
];

// Demo accounts are keyed by AuthUser.id (see lib/auth/authApi.ts). Real
// backend accounts fall back to the Hawks so the pages still render.
const DEFAULT_TEAM_ID = "hawks";
const playerTeamAssignments: Record<string, string | null> = {
  "demo-player": "hawks",
  "demo-player-2": "bears",
};

const coachTeamAssignments: Record<string, string> = {
  "demo-coach": "hawks",
};

const requestedTeamIds: string[] = [];

function currentUserId(): string {
  return authUserStorage.get()?.id ?? "guest";
}

function findTeam(teamId: string): Team | undefined {
  return teams.find((team) => team.id === teamId);
}

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// =========================
// Player: profile, team, schedule, search
// =========================

export function getMyProfile(): PlayerProfile {
  const user = authUserStorage.get();
  const userId = user?.id ?? "guest";
  const teamId = userId in playerTeamAssignments ? playerTeamAssignments[userId] : DEFAULT_TEAM_ID;
  const team = teamId ? findTeam(teamId) : undefined;

  return {
    id: userId,
    name: user?.name ?? "Signed-in player",
    email: user?.email ?? "",
    role: user?.role ?? "player",
    phone: "555-0142",
    position: "Forward",
    jerseyNumber: 23,
    teamId: team?.id ?? null,
    teamName: team?.name ?? null,
  };
}

export function getTeammates(): Teammate[] {
  const { teamId } = getMyProfile();
  return teamId ? (findTeam(teamId)?.roster ?? []) : [];
}

export function getMySchedule(): Game[] {
  const { teamId } = getMyProfile();
  if (!teamId) return [];
  return games.filter((game) => game.teamId === teamId).sort((a, b) => a.date.localeCompare(b.date));
}

export function searchTeams(query: { name?: string; city?: string }): Team[] {
  const name = query.name?.trim().toLowerCase();
  const city = query.city?.trim().toLowerCase();

  return teams.filter((team) => {
    const matchesName = !name || team.name.toLowerCase().includes(name);
    const matchesCity = !city || team.city.toLowerCase().includes(city);
    return matchesName && matchesCity;
  });
}

export function isMyTeam(teamId: string): boolean {
  return getMyProfile().teamId === teamId;
}

export function requestToJoinTeam(teamId: string): void {
  if (!requestedTeamIds.includes(teamId)) {
    requestedTeamIds.push(teamId);
  }
}

export function leaveMyTeam(): void {
  playerTeamAssignments[currentUserId()] = null;
}

// =========================
// Coach: manage roster and schedule for one team
// =========================

function getManagedTeamId(): string {
  return coachTeamAssignments[currentUserId()] ?? DEFAULT_TEAM_ID;
}

export function getManagedTeam(): Team {
  return findTeam(getManagedTeamId())!;
}

export function getManagedSchedule(): Game[] {
  const teamId = getManagedTeamId();
  return games.filter((game) => game.teamId === teamId).sort((a, b) => a.date.localeCompare(b.date));
}

export function addPlayerToRoster(input: Omit<Teammate, "id">): void {
  getManagedTeam().roster.push({ ...input, id: generateId("p") });
}

export function removePlayerFromRoster(playerId: string): void {
  const team = getManagedTeam();
  const index = team.roster.findIndex((player) => player.id === playerId);
  if (index !== -1) team.roster.splice(index, 1);
}

export function addGame(input: Omit<Game, "id" | "teamId">): void {
  games.push({ ...input, id: generateId("g"), teamId: getManagedTeamId() });
}

export function updateGame(gameId: string, updates: Partial<Omit<Game, "id" | "teamId">>): void {
  const game = games.find((g) => g.id === gameId);
  if (game) Object.assign(game, updates);
}

export function deleteGame(gameId: string): void {
  const index = games.findIndex((g) => g.id === gameId);
  if (index !== -1) games.splice(index, 1);
}
