import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authUserStorage } from "../lib/auth/tokenStorage";
import { listTournaments, type TournamentSummary } from "../lib/tournamentApi";
import { STATUS_LABEL } from "../lib/tournamentBracket";

export function TournamentsPage() {
  const [tournaments, setTournaments] = useState<TournamentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const role = authUserStorage.get()?.role;
  const canCreate = role === "coach" || role === "administrator";

  useEffect(() => {
    listTournaments()
      .then(setTournaments)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load tournaments."),
      );
  }, []);

  if (error) {
    return (
      <main className="dashboard-main">
        <p className="form-error">{error}</p>
      </main>
    );
  }

  if (!tournaments) {
    return (
      <main className="dashboard-main">
        <p className="empty-note">Loading tournaments…</p>
      </main>
    );
  }

  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">Compete</p>
          <h1>Tournaments</h1>
          <p>Single-elimination brackets: win to advance, lose and you are out.</p>
        </div>
        <div className="dashboard-heading-actions">
          <span className="session-badge">
            {tournaments.length} {tournaments.length === 1 ? "tournament" : "tournaments"}
          </span>
          {canCreate ? (
            <Link className="action-button" to="/tournaments/new">
              New tournament
            </Link>
          ) : null}
        </div>
      </div>

      {tournaments.length === 0 ? (
        <p className="empty-note tournament-empty">
          No tournaments yet.
          {canCreate ? " Create the first one to get a bracket going." : ""}
        </p>
      ) : (
        <section className="card-grid" aria-label="Tournaments">
          {tournaments.map((tournament) => (
            <Link
              key={tournament.id}
              to={`/tournaments/${tournament.id}`}
              className="person-card tournament-card"
            >
              <span className="person-avatar" aria-hidden="true">
                {tournament.name.slice(0, 2).toUpperCase()}
              </span>
              <span>
                <strong>{tournament.name}</strong>
                <small>
                  {tournament.teamCount} teams ·{" "}
                  <span className={`status-pill status-${tournament.status}`}>
                    {STATUS_LABEL[tournament.status]}
                  </span>
                </small>
              </span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
