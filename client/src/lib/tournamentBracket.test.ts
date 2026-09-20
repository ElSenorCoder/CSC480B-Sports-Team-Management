import { describe, expect, it } from "vitest";
import type { TournamentGame } from "./tournamentApi";
import { buildBracket, isValidTeamCount, pairUp, roundLabel, totalRounds } from "./tournamentBracket";

function game(id: string, round: number): TournamentGame {
  return {
    id,
    round,
    description: null,
    homeTeamId: "1",
    homeTeamName: "A",
    awayTeamId: "2",
    awayTeamName: "B",
    date: "2026-09-15",
    time: "18:00",
    location: null,
    homeScore: 0,
    awayScore: 0,
    status: "scheduled",
    winnerTeamId: null,
  };
}

describe("tournament bracket helpers", () => {
  it("accepts only power-of-two fields from 2 to 32", () => {
    for (const count of [2, 4, 8, 16, 32]) expect(isValidTeamCount(count)).toBe(true);
    for (const count of [0, 1, 3, 6, 12, 64]) expect(isValidTeamCount(count)).toBe(false);
  });

  it("names rounds counting back from the final", () => {
    expect(totalRounds(8)).toBe(3);
    expect(roundLabel(3, 3)).toBe("Final");
    expect(roundLabel(2, 3)).toBe("Semi-Final");
    expect(roundLabel(1, 3)).toBe("Quarter-Final");
    expect(roundLabel(1, 4)).toBe("Round 1");
  });

  it("pairs neighbouring teams in bracket order", () => {
    expect(pairUp(["a", "b", "c", "d"])).toEqual([["a", "b"], ["c", "d"]]);
    expect(pairUp(["a", "b", "c"])).toEqual([["a", "b"]]);
  });

  it("shows unplayed rounds as placeholders so the whole bracket is visible", () => {
    const bracket = buildBracket([game("1", 1), game("2", 1)], 4);

    expect(bracket.map((round) => round.label)).toEqual(["Semi-Final", "Final"]);
    expect(bracket[0].games).toHaveLength(2);
    expect(bracket[1].games).toEqual([null]);

    const big = buildBracket([], 8);
    expect(big.map((round) => round.games.length)).toEqual([4, 2, 1]);
  });
});
