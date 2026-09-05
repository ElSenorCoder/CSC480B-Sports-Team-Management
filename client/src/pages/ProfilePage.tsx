import { useEffect, useState } from "react";
import { getMyProfile, type PlayerProfile } from "../lib/mockPlayerData";

export function ProfilePage() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load profile."));
  }, []);

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
        <p className="empty-note">Loading profile…</p>
      </main>
    );
  }

  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">Profile</p>
          <h1>{profile.name}</h1>
          <p>Position and team details are shown on each of your teams under My Team.</p>
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
          <li><span>Phone</span><strong>{profile.phone || "—"}</strong></li>
        </ul>
      </section>
    </main>
  );
}
