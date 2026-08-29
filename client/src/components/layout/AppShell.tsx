import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BrandMark } from "../brand/BrandMark";
import { authUserStorage, tokenStorage } from "../../lib/auth/tokenStorage";

const baseNavigation = [
  { label: "Overview", href: "/dashboard" },
] as const;

const playerNavigation = [
  { label: "Profile", href: "/profile" },
  { label: "My Team", href: "/team" },
  { label: "Schedule", href: "/schedule" },
  { label: "Find a Team", href: "/teams/search" },
] as const;

const coachNavigation = [
  { label: "Manage Roster", href: "/coach/roster" },
  { label: "Manage Schedule", href: "/coach/schedule" },
] as const;

function OverviewIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M3 3h6v6H3V3Zm10 0h6v6h-6V3ZM3 13h6v6H3v-6Zm10 0h6v6h-6v-6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AppShell() {
  const navigate = useNavigate();
  const user = authUserStorage.get();
  const navigation =
    user?.role === "player"
      ? [...baseNavigation, ...playerNavigation]
      : user?.role === "coach"
        ? [...baseNavigation, ...coachNavigation]
        : baseNavigation;

  function logout() {
    tokenStorage.clear();
    authUserStorage.clear();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <BrandMark />
        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {navigation.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/dashboard"}
              className="nav-item"
            >
              <OverviewIcon />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="logout-button" type="button" onClick={logout}>
          <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M8 4H3v12h5m4-9 4 3-4 3m4-3H7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sign out
        </button>
      </aside>

      <div className="app-content">
        <header className="topbar">
          <div>
            <p className="topbar-kicker">Sports Team Management</p>
            <p className="topbar-team">Team workspace</p>
          </div>
          <div className="user-chip" aria-label="Signed in user">
            <span>✓</span>
            <div>
              <strong>{user?.name ?? "Authenticated"}</strong>
              <small>{user?.role ?? "Secure session"}</small>
            </div>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
