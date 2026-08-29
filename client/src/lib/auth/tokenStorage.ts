import type { AuthUser } from "../../types/auth";

const TOKEN_KEY = "sports_team_auth_token";
const USER_KEY = "sports_team_auth_user";

export const tokenStorage = {
  get() {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(TOKEN_KEY);
  },

  set(token: string) {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(TOKEN_KEY, token);
  },

  clear() {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(TOKEN_KEY);
  },
};

export const authUserStorage = {
  get(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  set(user: AuthUser) {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clear() {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(USER_KEY);
  },
};
