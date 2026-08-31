import { useEffect, useState } from "react";
import { getMyProfile, getTeammates, leaveMyTeam, type PlayerProfile, type Teammate } from "../lib/mockPlayerData";

export function TeamPage() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [selected, setSelected] = useState<Teammate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  function load() {
    Promise.all([getMyProfile(), getTeammates()])
      .then(([profileData, teammatesData]) => {
        setProfile(profileData);
        setTeammates(teammatesData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load team."));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleLeaveTeam() {
    setLeaving(true);
    try {
      await leaveMyTeam();
      setSelected(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave team.");
    } finally {
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

  if (!profile) {
    return (
      <main className="dashboard-main">
        <p className="empty-note">Loading team…</p>
      </main>
    );
  }

  if (!profile.teamId) {
    return (
      <main className="dashboard-main">
        <div className="dashboard-heading">
          <div>
            <p className="dashboard-eyebrow">Team</p>
            <h1>You're not on a team</h1>
            <p>Search for a team and request to join to see your roster here.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">Team</p>
          <h1>{profile.teamName} roster</h1>
          <p>See who's on your team and open a teammate's profile.</p>
        </div>
        <div className="dashboard-heading-actions">
          <span className="session-badge">{teammates.length} teammates</span>
          <button className="link-button" type="button" onClick={handleLeaveTeam} disabled={leaving}>
            {leaving ? "Leaving…" : "Leave team"}
          </button>
        </div>
      </div>

      <section className="card-grid" aria-label="Teammates">
        {teammates.map((teammate) => (
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
