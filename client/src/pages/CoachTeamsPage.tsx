import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyManagedTeams, type ManagedTeam } from "../lib/mockPlayerData";

const ROLE_LABEL: Record<ManagedTeam["roleInTeam"], string> = {
  head_coach: "Head Coach",
  assistant_coach: "Assistant Coach",
};

export function CoachTeamsPage() {
  const [teams, setTeams] = useState<ManagedTeam[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyManagedTeams()
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
          <p className="dashboard-eyebrow">Manage</p>
          <h1>My teams</h1>
          <p>Select a team to manage its roster and schedule.</p>
        </div>
        <span className="session-badge">{teams.length} teams</span>
      </div>

      {teams.length === 0 ? (
        <p className="empty-note">You aren't coaching any teams yet.</p>
      ) : (
        <section className="card-grid" aria-label="Teams I coach">
          {teams.map((team) => (
            <Link key={team.id} to={`/coach/team/${team.id}`} className="person-card">
              <span className="person-avatar" aria-hidden="true">
                {team.name.slice(0, 2).toUpperCase()}
              </span>
              <span>
                <strong>{team.name}</strong>
                <small>{ROLE_LABEL[team.roleInTeam]}</small>
              </span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
