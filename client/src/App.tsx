import { Navigate, Route, Routes } from "react-router-dom";
import { AuthGuard } from "./components/auth/AuthGuard";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { TeamPage } from "./pages/TeamPage";
import { TeamDetailPage } from "./pages/TeamDetailPage";
import { SchedulePage } from "./pages/SchedulePage";
import { SearchTeamsPage } from "./pages/SearchTeamsPage";
import { CoachRosterPage } from "./pages/CoachRosterPage";
import { CoachSchedulePage } from "./pages/CoachSchedulePage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<AuthGuard />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/team/:id" element={<TeamDetailPage />} />
          <Route path="/team/:id/schedule" element={<SchedulePage />} />
          <Route path="/teams/search" element={<SearchTeamsPage />} />
          <Route path="/coach/roster" element={<CoachRosterPage />} />
          <Route path="/coach/schedule" element={<CoachSchedulePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
