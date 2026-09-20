import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { authUserStorage } from "../lib/auth/tokenStorage";
import {
  deleteTournament,
  getTournament,
  getTournamentStandings,
  simulateTournament,
  type StandingRow,
  type Tournament,
  type TournamentGame,
} from "../lib/tournamentApi";
import { STATUS_LABEL, buildBracket } from "../lib/tournamentBracket";

function BracketGame({ game }: { game: TournamentGame | null }) {
  if (!game) {
    return (
      <li className="bracket-game bracket-game-tbd">
        <div className="bracket-team"><span>To be decided</span></div>
        <div className="bracket-team"><span>To be decided</span></div>
        <small>Waiting for earlier rounds</small>
      </li>
    );
  }

  const played = game.status === "completed";
  const sides = [
    { teamId: game.homeTeamId, name: game.homeTeamName, score: game.homeScore },
    { teamId: game.awayTeamId, name: game.awayTeamName, score: game.awayScore },
  ];

  return (
    <li className="bracket-game">
      {sides.map((side) => {
        const outcome = !played
          ? ""
          : side.teamId === game.winnerTeamId
            ? " is-winner"
            : " is-loser";
        return (
          <div key={side.teamId} className={`bracket-team${outcome}`}>
            <span>{side.name}</span>
            <strong aria-label={played ? `Score ${side.score}` : "Not played"}>
              {played ? side.score : "–"}
            </strong>
          </div>
        );
      })}
      <small>
        {game.date} · {game.time}
        {game.location ? ` · ${game.location}` : ""}
      </small>
    </li>
  );
}

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = authUserStorage.get();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setTournament(null);
    setLoadError(null);
    Promise.all([getTournament(id), getTournamentStandings(id)])
      .then(([tournamentData, standingsData]) => {
        setTournament(tournamentData);
        setStandings(standingsData);
      })
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : "Failed to load tournament."),
      );
  }, [id]);

  if (loadError) {
    return (
      <main className="dashboard-main">
        <p className="form-error">{loadError}</p>
        <p>
          <Link className="link-button muted-link" to="/tournaments">
            Back to tournaments
          </Link>
        </p>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="dashboard-main">
        <p className="empty-note">Loading tournament…</p>
      </main>
    );
  }

  const canManage =
    user?.role === "administrator" ||
    (user?.role === "coach" && user.id === tournament.createdBy);
  const finished = tournament.status === "completed" || tournament.status === "cancelled";
  const champion = tournament.status === "completed" ? standings[0] : undefined;
  const bracket = buildBracket(tournament.games, standings.length);

  async function handleSimulate() {
    if (!id) return;
    setSimulating(true);
    setActionError(null);
    try {
      const result = await simulateTournament(id);
      setTournament({
        id: result.id,
        name: result.name,
        status: result.status,
        createdBy: result.createdBy,
        createdAt: result.createdAt,
        games: result.games,
      });
      setStandings(result.standings);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to simulate tournament.");
    } finally {
      setSimulating(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteTournament(id);
      navigate("/tournaments", { replace: true });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete tournament.");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">Tournament</p>
          <h1>{tournament.name}</h1>
          <p>
            <span className={`status-pill status-${tournament.status}`}>
              {STATUS_LABEL[tournament.status]}
            </span>{" "}
            · {standings.length} teams · single elimination
          </p>
        </div>
        <div className="dashboard-heading-actions">
          <Link className="link-button muted-link" to="/tournaments">
            All tournaments
          </Link>
          {canManage ? (
            <div className="action-row">
              <button
                className="action-button"
                type="button"
                onClick={handleSimulate}
                disabled={simulating || finished || deleting}
              >
                {simulating ? "Simulating…" : "Simulate tournament"}
              </button>
              {confirmingDelete ? (
                <>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting…" : "Confirm delete"}
                  </button>
                  <button
                    className="link-button muted-link"
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleting}
                  >
                    Keep it
                  </button>
                </>
              ) : (
                <button
                  className="link-button"
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  disabled={simulating}
                >
                  Delete
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {actionError ? <p className="form-error" role="alert">{actionError}</p> : null}

      {champion ? (
        <p className="champion-banner" role="status">
          <span aria-hidden="true">🏆</span> Champion: <strong>{champion.teamName}</strong>
        </p>
      ) : null}

      <h2 className="section-heading">Bracket</h2>
      <div className="bracket-scroll" tabIndex={0} role="region" aria-label="Tournament bracket">
        <ol className="bracket">
          {bracket.map((round) => (
            <li key={round.round} className="bracket-round">
              <h3>{round.label}</h3>
              <ul className="bracket-games">
                {round.games.map((game, index) => (
                  <BracketGame key={game?.id ?? `tbd-${round.round}-${index}`} game={game} />
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>

      <h2 className="section-heading">Standings</h2>
      <div className="table-scroll">
        <table className="standings-table">
          <caption className="sr-only">Tournament standings</caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Team</th>
              <th scope="col">W</th>
              <th scope="col">L</th>
              <th scope="col">Points scored</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => (
              <tr key={row.teamId} className={champion?.teamId === row.teamId ? "is-champion" : undefined}>
                <td>{row.rank}</td>
                <th scope="row">{row.teamName}</th>
                <td>{row.wins}</td>
                <td>{row.losses}</td>
                <td>{row.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
