import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getTeamById, leaveTeam, type Team, type Teammate } from "../lib/mockPlayerData";

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [selected, setSelected] = useState<Teammate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    setTeam(null);
    setSelected(null);
    getTeamById(id).then(setTeam).catch((err) => setError(err instanceof Error ? err.message : "Failed to load team."));
  }, [id]);

  async function handleLeaveTeam() {
    if (!id) return;
    setLeaving(true);
    try {
      await leaveTeam(id);
      navigate("/team", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave team.");
      setLeaving(false);
    }
  }

  if (error) {
    return (
      <main className="dashboard-main">
        <p className="form-error">{error}</p>
      </main>
    );
  }

  if (!team) {
    return (
      <main className="dashboard-main">
        <p className="empty-note">Loading team…</p>
      </main>
    );
  }

  const roster = team.roster ?? [];

  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">Team</p>
          <h1>{team.name} roster</h1>
          <p>See who's on this team and open a teammate's profile.</p>
        </div>
        <div className="dashboard-heading-actions">
          <span className="session-badge">{roster.length} teammates</span>
          <Link className="link-button" to={`/team/${team.id}/schedule`}>
            View schedule
          </Link>
          <button className="link-button" type="button" onClick={handleLeaveTeam} disabled={leaving}>
            {leaving ? "Leaving…" : "Leave team"}
          </button>
        </div>
      </div>

      <section className="card-grid" aria-label="Teammates">
        {roster.map((teammate) => (
          <button
            key={teammate.id}
            type="button"
            className="person-card"
            onClick={() => setSelected(teammate)}
            aria-current={selected?.id === teammate.id}
          >
            <span className="person-avatar" aria-hidden="true">
              {teammate.name
                .split(" ")
                .map((part) => part[0])
                .join("")}
            </span>
            <span>
              <strong>{teammate.name}</strong>
              <small>{teammate.position ?? "Position not set"} · #{teammate.jerseyNumber ?? "—"}</small>
            </span>
          </button>
        ))}
      </section>

      {selected ? (
        <section className="session-panel" aria-labelledby="teammate-title">
          <div>
            <p className="dashboard-eyebrow">Teammate</p>
            <h2 id="teammate-title">{selected.name}</h2>
            <p>Contact your teammate directly using the details below.</p>
          </div>
          <ul className="status-list">
            <li><span>Position</span><strong>{selected.position ?? "Not set"}</strong></li>
            <li><span>Jersey number</span><strong>{selected.jerseyNumber !== null ? `#${selected.jerseyNumber}` : "Not set"}</strong></li>
            <li><span>Email</span><strong>{selected.email}</strong></li>
          </ul>
        </section>
      ) : null}
    </main>
  );
}
