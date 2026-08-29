import type { LoginCredentials, LoginResponse } from "../../types/auth";
import { apiRequest } from "../api/apiClient";

// Local-only demo logins so the player/coach pages can be tried without a
// running backend (the real `users` table has no `role` column wired up
// yet). Remove once login returns a real role end to end.
const DEMO_PASSWORD = "demo1234";
const DEMO_LOGINS: Record<string, LoginResponse> = {
  "player.demo": {
    token: "demo-player-token",
    expiresIn: 3600,
    user: {
      id: "demo-player",
      name: "Alex Johnson",
      email: "player.demo@example.test",
      role: "player",
    },
  },
  "player2.demo": {
    token: "demo-player-2-token",
    expiresIn: 3600,
    user: {
      id: "demo-player-2",
      name: "Jamie Rivera",
      email: "player2.demo@example.test",
      role: "player",
    },
  },
  "coach.demo": {
    token: "demo-coach-token",
    expiresIn: 3600,
    user: {
      id: "demo-coach",
      name: "Taylor Coach",
      email: "coach.demo@example.test",
      role: "coach",
    },
  },
};

export async function login(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  const demoLogin = DEMO_LOGINS[credentials.identifier.trim().toLowerCase()];
  if (demoLogin && credentials.password === DEMO_PASSWORD) {
    return demoLogin;
  }

  const body = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  if (!body?.token || !body.user) {
    throw new Error("The authentication response was incomplete.");
  }

  return body;
}
