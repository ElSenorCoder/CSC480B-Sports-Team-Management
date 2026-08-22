const TOKEN_KEY = "sports_team_auth_token";

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
