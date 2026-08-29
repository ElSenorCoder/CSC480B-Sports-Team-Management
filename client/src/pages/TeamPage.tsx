import { useState } from "react";
import { getMyProfile, getTeammates, leaveMyTeam, type Teammate } from "../lib/mockPlayerData";

export function TeamPage() {
  const [profile, setProfile] = useState(getMyProfile());
  const teammates = getTeammates();
  const [selected, setSelected] = useState<Teammate | null>(null);

  function handleLeaveTeam() {
    leaveMyTeam();
    setProfile(getMyProfile());
    setSelected(null);
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
          <button className="link-button" type="button" onClick={handleLeaveTeam}>
            Leave team
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
              <small>{teammate.position} · #{teammate.jerseyNumber}</small>
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
            <li><span>Position</span><strong>{selected.position}</strong></li>
            <li><span>Jersey number</span><strong>#{selected.jerseyNumber}</strong></li>
            <li><span>Email</span><strong>{selected.email}</strong></li>
          </ul>
        </section>
      ) : null}
    </main>
  );
}
