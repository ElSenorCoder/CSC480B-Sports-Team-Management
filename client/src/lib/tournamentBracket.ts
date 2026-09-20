import type { TournamentGame, TournamentStatus } from "./tournamentApi";

export const VALID_TEAM_COUNTS = [2, 4, 8, 16, 32] as const;

export const STATUS_LABEL: Record<TournamentStatus, string> = {
  upcoming: "Upcoming",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

// A single-elimination bracket needs a power-of-two field.
export function isValidTeamCount(count: number): boolean {
  return (VALID_TEAM_COUNTS as readonly number[]).includes(count);
}

export function totalRounds(teamCount: number): number {
  return Math.max(1, Math.round(Math.log2(teamCount)));
}

export function roundLabel(round: number, rounds: number): string {
  switch (rounds - round) {
    case 0:
      return "Final";
    case 1:
      return "Semi-Final";
    case 2:
      return "Quarter-Final";
    default:
      return `Round ${round}`;
  }
}

// [a, b, c, d] -> [[a, b], [c, d]]: the order of the list is the bracket order.
export function pairUp<T>(items: T[]): [T, T][] {
  const pairs: [T, T][] = [];
  for (let i = 0; i + 1 < items.length; i += 2) {
    pairs.push([items[i], items[i + 1]]);
  }
  return pairs;
}

export type BracketRound = {
  round: number;
  label: string;
  // null = a game whose teams are not known yet (waiting on earlier winners)
  games: (TournamentGame | null)[];
};

// Lay the games out round by round. Rounds that have no games yet are shown
// as placeholders, so the whole bracket is visible before it is played.
export function buildBracket(
  games: TournamentGame[],
  teamCount: number,
): BracketRound[] {
  const rounds = totalRounds(teamCount);

  return Array.from({ length: rounds }, (_, index) => {
    const round = index + 1;
    const roundGames = games.filter((game) => game.round === round);
    const expected = Math.max(1, teamCount / 2 ** round);

    return {
      round,
      label: roundLabel(round, rounds),
      games: roundGames.length
        ? roundGames
        : Array.from({ length: expected }, () => null),
    };
  });
}
