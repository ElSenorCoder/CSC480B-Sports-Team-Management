import { LoginForm } from "../components/auth/LoginForm";
import { BrandMark } from "../components/brand/BrandMark";

export function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-brand-panel" aria-labelledby="welcome-title">
        <BrandMark />
        <div className="brand-copy">
          <p className="eyebrow">Team operations, simplified</p>
          <h1 id="welcome-title">Lead every play.</h1>
          <p>
            One focused workspace for rosters, schedules, attendance, and the
            decisions that keep your team moving forward.
          </p>
        </div>
        <p className="brand-footer">
          <span className="status-dot" aria-hidden="true" />
          Sports Team Management · Secure team workspace
        </p>
      </section>

      <section className="auth-form-panel" aria-label="Account access">
        <div className="login-card">
          <header className="login-heading">
            <p className="section-label">Secure access</p>
            <h2>Welcome back</h2>
            <p>Enter your account details to access your team workspace.</p>
          </header>
          <LoginForm />
          <p className="login-note">Account access is managed by your team administrator.</p>
        </div>
      </section>
    </main>
  );
}
