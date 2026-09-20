import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";

const API = "http://localhost:3001/api";

type Reply = { status?: number; body?: unknown };

// Route table keyed by "METHOD /path"; every call is recorded on `calls`.
function mockApi(routes: Record<string, Reply | (() => Reply)>) {
  const calls: { key: string; body?: string }[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const key = `${init?.method ?? "GET"} ${String(input).replace(API, "")}`;
      calls.push({ key, body: init?.body as string | undefined });

      const route = routes[key];
      if (!route) return new Response(JSON.stringify({ error: `unmocked ${key}` }), { status: 404 });

      const reply = typeof route === "function" ? route() : route;
      return new Response(
        reply.status === 204 ? null : JSON.stringify(reply.body ?? null),
        { status: reply.status ?? 200, headers: { "Content-Type": "application/json" } },
      );
    }),
  );

  return calls;
}

function signIn(role: "coach" | "player" | "administrator", id = "2") {
  window.sessionStorage.setItem("sports_team_auth_token", "test-token");
  window.sessionStorage.setItem(
    "sports_team_auth_user",
    JSON.stringify({ id, name: "Test User", email: "t@example.com", role }),
  );
}

function renderAt(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <App />
    </MemoryRouter>,
  );
}

const game = (id: string, round: number, home: [string, string], away: [string, string], scores: [number, number]) => ({
  id,
  round,
  description: null,
  homeTeamId: home[0],
  homeTeamName: home[1],
  awayTeamId: away[0],
  awayTeamName: away[1],
  date: "2026-09-15",
  time: "18:00",
  location: "Main Arena",
  homeScore: scores[0],
  awayScore: scores[1],
  status: scores[0] === scores[1] ? "scheduled" : "completed",
  winnerTeamId: scores[0] === scores[1] ? null : scores[0] > scores[1] ? home[0] : away[0],
});

const teams = [
  { id: "1", name: "Thunderbolts" },
  { id: "2", name: "Vipers" },
  { id: "3", name: "Falcons" },
  { id: "4", name: "Titans" },
];

const inProgress = {
  id: "1",
  name: "Fall Championship",
  status: "in_progress",
  createdBy: "2",
  createdAt: "2026-09-01T00:00:00.000Z",
  games: [
    game("1", 1, ["1", "Thunderbolts"], ["2", "Vipers"], [84, 78]),
    game("2", 1, ["3", "Falcons"], ["4", "Titans"], [5, 3]),
    game("6", 2, ["1", "Thunderbolts"], ["3", "Falcons"], [0, 0]),
  ],
};

const standingsRows = [
  { rank: 1, teamId: "1", teamName: "Thunderbolts", wins: 1, losses: 0, draws: 0, score: 84 },
  { rank: 2, teamId: "3", teamName: "Falcons", wins: 1, losses: 0, draws: 0, score: 5 },
  { rank: 3, teamId: "2", teamName: "Vipers", wins: 0, losses: 1, draws: 0, score: 78 },
  { rank: 4, teamId: "4", teamName: "Titans", wins: 0, losses: 1, draws: 0, score: 3 },
];

describe("tournaments", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("lists tournaments and offers 'New tournament' only to coaches and admins", async () => {
    const list = [{ id: "1", name: "Fall Championship", status: "in_progress", createdBy: "2", createdAt: "", teamCount: 4 }];

    signIn("coach");
    mockApi({ "GET /tournaments": { body: list } });
    const { unmount } = renderAt("/tournaments");
    expect(await screen.findByText("Fall Championship")).toBeVisible();
    expect(screen.getByText(/4 teams/)).toBeVisible();
    expect(screen.getByRole("link", { name: /new tournament/i })).toBeVisible();
    unmount();

    window.sessionStorage.clear();
    signIn("player", "3");
    mockApi({ "GET /tournaments": { body: list } });
    renderAt("/tournaments");
    expect(await screen.findByText("Fall Championship")).toBeVisible();
    expect(screen.queryByRole("link", { name: /new tournament/i })).not.toBeInTheDocument();
  });

  it("shows the bracket with results, upcoming rounds and standings", async () => {
    signIn("player", "3");
    mockApi({
      "GET /tournaments/1": { body: inProgress },
      "GET /tournaments/1/standings": { body: standingsRows },
    });
    renderAt("/tournaments/1");

    expect(await screen.findByRole("heading", { name: "Fall Championship" })).toBeVisible();

    const bracket = screen.getByRole("region", { name: /tournament bracket/i });
    expect(within(bracket).getByRole("heading", { name: "Semi-Final" })).toBeVisible();
    expect(within(bracket).getByRole("heading", { name: "Final" })).toBeVisible();
    expect(within(bracket).getAllByText("Thunderbolts")).toHaveLength(2);
    expect(within(bracket).getByLabelText("Score 84")).toBeVisible();

    const table = screen.getByRole("table");
    expect(within(table).getByRole("rowheader", { name: "Thunderbolts" })).toBeVisible();
    expect(within(table).getAllByRole("row")).toHaveLength(5);

    // players can look, not touch
    expect(screen.queryByRole("button", { name: /simulate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("lets the creator simulate and then shows the champion", async () => {
    signIn("coach", "2");
    const completed = {
      ...inProgress,
      status: "completed",
      games: [...inProgress.games.slice(0, 2), game("6", 2, ["1", "Thunderbolts"], ["3", "Falcons"], [1, 5])],
    };
    const finalStandings = [
      { rank: 1, teamId: "3", teamName: "Falcons", wins: 2, losses: 0, draws: 0, score: 10 },
      { rank: 2, teamId: "1", teamName: "Thunderbolts", wins: 1, losses: 1, draws: 0, score: 85 },
      standingsRows[2],
      standingsRows[3],
    ];
    const calls = mockApi({
      "GET /tournaments/1": { body: inProgress },
      "GET /tournaments/1/standings": { body: standingsRows },
      "GET /tournaments/1/simulation": { body: { ...completed, standings: finalStandings, champion: finalStandings[0] } },
    });

    const user = userEvent.setup();
    renderAt("/tournaments/1");
    await user.click(await screen.findByRole("button", { name: /simulate tournament/i }));

    expect(await screen.findByRole("status")).toHaveTextContent("Champion: Falcons");
    expect(calls.some((c) => c.key === "GET /tournaments/1/simulation")).toBe(true);
    expect(screen.getByRole("button", { name: /simulate tournament/i })).toBeDisabled();
  });

  it("hides management buttons from a coach who did not create the tournament", async () => {
    signIn("coach", "6");
    mockApi({
      "GET /tournaments/1": { body: inProgress },
      "GET /tournaments/1/standings": { body: standingsRows },
    });
    renderAt("/tournaments/1");

    await screen.findByRole("heading", { name: "Fall Championship" });
    expect(screen.queryByRole("button", { name: /simulate/i })).not.toBeInTheDocument();
  });

  it("asks for confirmation before deleting, then returns to the list", async () => {
    signIn("administrator", "1");
    const calls = mockApi({
      "GET /tournaments/1": { body: inProgress },
      "GET /tournaments/1/standings": { body: standingsRows },
      "DELETE /tournaments/1/delete": { status: 204 },
      "GET /tournaments": { body: [] },
    });

    const user = userEvent.setup();
    renderAt("/tournaments/1");
    await user.click(await screen.findByRole("button", { name: /^delete$/i }));
    expect(calls.some((c) => c.key.startsWith("DELETE"))).toBe(false);

    await user.click(screen.getByRole("button", { name: /confirm delete/i }));
    expect(await screen.findByText(/no tournaments yet/i)).toBeVisible();
    expect(calls.some((c) => c.key === "DELETE /tournaments/1/delete")).toBe(true);
  });

  it("only allows a power-of-two field, then creates the tournament in bracket order", async () => {
    signIn("coach", "2");
    const calls = mockApi({
      "GET /teams": { body: teams },
      "POST /tournaments/create": { status: 201, body: { ...inProgress, id: "9", standings: standingsRows } },
      "GET /tournaments/9": { body: { ...inProgress, id: "9", name: "Spring Cup" } },
      "GET /tournaments/9/standings": { body: standingsRows },
    });

    const user = userEvent.setup();
    renderAt("/tournaments/new");
    await screen.findByLabelText("Thunderbolts");

    await user.type(screen.getByLabelText(/tournament name/i), "Spring Cup");
    await user.type(screen.getByLabelText(/first round date/i), "2026-11-01");

    const submit = screen.getByRole("button", { name: /create tournament/i });
    await user.click(screen.getByLabelText("Thunderbolts"));
    await user.click(screen.getByLabelText("Vipers"));
    await user.click(screen.getByLabelText("Falcons"));
    expect(screen.getByText(/3 selected\. choose 2, 4, 8, 16, 32 teams/i)).toBeVisible();
    expect(submit).toBeDisabled();

    await user.click(screen.getByLabelText("Titans"));
    expect(screen.getByText("4 teams selected")).toBeVisible();
    expect(submit).toBeEnabled();

    // move Titans up so the first round is Thunderbolts vs Vipers, Titans vs Falcons
    await user.click(screen.getByRole("button", { name: /move titans up/i }));
    expect(screen.getByText(/thunderbolts vs vipers · titans vs falcons/i)).toBeVisible();

    await user.click(submit);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Spring Cup" })).toBeVisible());

    const post = calls.find((c) => c.key === "POST /tournaments/create");
    expect(JSON.parse(post!.body!)).toEqual({
      name: "Spring Cup",
      teamIds: ["1", "2", "4", "3"],
      startDate: "2026-11-01",
      time: "18:00",
    });
  });

  it("shows the server's message when creating fails", async () => {
    signIn("coach", "2");
    mockApi({
      "GET /teams": { body: teams },
      "POST /tournaments/create": { status: 400, body: { error: "One or more teams do not exist" } },
    });

    const user = userEvent.setup();
    renderAt("/tournaments/new");
    await screen.findByLabelText("Thunderbolts");
    await user.type(screen.getByLabelText(/tournament name/i), "Cup");
    await user.type(screen.getByLabelText(/first round date/i), "2026-11-01");
    await user.click(screen.getByLabelText("Thunderbolts"));
    await user.click(screen.getByLabelText("Vipers"));
    await user.click(screen.getByRole("button", { name: /create tournament/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("One or more teams do not exist");
  });

  it("keeps players out of the create form", async () => {
    signIn("player", "3");
    mockApi({ "GET /teams": { body: teams } });
    renderAt("/tournaments/new");

    expect(await screen.findByText(/only coaches and administrators can create tournaments/i)).toBeVisible();
  });
});
