import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyTeams, type MyTeam } from "../lib/mockPlayerData";

const ROLE_LABEL: Record<MyTeam["roleInTeam"], string> = {
  head_coach: "Head Coach",
  assistant_coach: "Assistant Coach",
  player: "Player",
};

export function TeamPage() {
  const [teams, setTeams] = useState<MyTeam[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyTeams()
      .then(setTeams)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load your teams."));
  }, []);

  if (error) {
    return (
      <main className="dashboard-main">
        <p className="form-error">{error}</p>
      </main>
    );
  }

  if (!teams) {
    return (
      <main className="dashboard-main">
        <p className="empty-note">Loading your teams…</p>
      </main>
    );
  }

  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">Team</p>
          <h1>My teams</h1>
          <p>Select a team to see its roster and schedule.</p>
        </div>
        <span className="session-badge">{teams.length} teams</span>
      </div>

      {teams.length === 0 ? (
        <p className="empty-note">
          You're not on a team yet. Search for a team and request to join.
        </p>
      ) : (
        <section className="card-grid" aria-label="My teams">
          {teams.map((team) => (
            <Link key={team.id} to={`/team/${team.id}`} className="person-card">
              <span className="person-avatar" aria-hidden="true">
                {team.name.slice(0, 2).toUpperCase()}
              </span>
              <span>
                <strong>{team.name}</strong>
                <small>
                  {ROLE_LABEL[team.roleInTeam]}
                  {team.position ? ` · ${team.position}` : ""}
                  {team.jerseyNumber !== null ? ` · #${team.jerseyNumber}` : ""}
                </small>
              </span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
