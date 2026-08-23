export function DashboardPage() {
  return (
    <main className="dashboard-main">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">Dashboard</p>
          <h1>Welcome to your team workspace.</h1>
          <p>
            You have successfully signed in. This page is available only while
            your authenticated session is active.
          </p>
        </div>
        <span className="session-badge">Signed in</span>
      </div>

      <section className="session-panel" aria-labelledby="session-title">
        <div>
          <p className="dashboard-eyebrow">Account access</p>
          <h2 id="session-title">Protected page access confirmed</h2>
          <p>
            Your session is active for this browser tab. Use the Sign out
            button when you are finished.
          </p>
        </div>
        <ul className="status-list">
          <li><span>Session</span><strong>Active</strong></li>
          <li><span>Access</span><strong>Authenticated</strong></li>
        </ul>
      </section>
    </main>
  );
}
