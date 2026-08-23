import { Navigate, Outlet, useLocation } from "react-router-dom";
import { tokenStorage } from "../../lib/auth/tokenStorage";

export function AuthGuard() {
  const location = useLocation();

  if (!tokenStorage.get()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
