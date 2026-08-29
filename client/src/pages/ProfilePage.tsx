import { getMyProfile } from "../lib/mockPlayerData";

export function ProfilePage() {
  const profile = getMyProfile();

  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">Profile</p>
          <h1>{profile.name}</h1>
          <p>
            {profile.position} · #{profile.jerseyNumber} · {profile.teamName ?? "No team"}
          </p>
        </div>
        <span className="session-badge">{profile.role}</span>
      </div>

      <section className="session-panel" aria-labelledby="profile-title">
        <div>
          <p className="dashboard-eyebrow">Account details</p>
          <h2 id="profile-title">Your profile information</h2>
          <p>This is how your teammates and coaches see you in the workspace.</p>
        </div>
        <ul className="status-list">
          <li><span>Email</span><strong>{profile.email || "—"}</strong></li>
          <li><span>Phone</span><strong>{profile.phone}</strong></li>
          <li><span>Team</span><strong>{profile.teamName ?? "No team"}</strong></li>
          <li><span>Position</span><strong>{profile.position}</strong></li>
          <li><span>Jersey number</span><strong>#{profile.jerseyNumber}</strong></li>
        </ul>
      </section>
    </main>
  );
}
