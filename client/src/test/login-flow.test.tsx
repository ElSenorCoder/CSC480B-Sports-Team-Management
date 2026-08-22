import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";

function renderAt(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <App />
    </MemoryRouter>,
  );
}

describe("Sprint 1 authentication flow", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("blocks the API request when required credentials are missing", async () => {
    renderAt("/login");

    fireEvent.click(screen.getByRole("button", { name: /sign in to workspace/i }));

    expect(await screen.findByText(/enter your username or email address/i)).toBeVisible();
    expect(screen.getByText(/enter your password/i)).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a password shorter than eight characters before the API call", async () => {
    const user = userEvent.setup();
    renderAt("/login");

    await user.type(screen.getByLabelText(/username or email/i), "coach.demo");
    await user.type(screen.getByLabelText(/^password$/i), "short");
    await user.click(screen.getByRole("button", { name: /sign in to workspace/i }));

    expect(await screen.findByText(/password must be at least 8 characters/i)).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("stores the returned JWT and displays the dashboard after success", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          token: "verified-test-token",
          expiresIn: 3600,
          user: {
            id: "user-1",
            name: "Test Coach",
            email: "coach@example.com",
            role: "coach",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    renderAt("/login");
    await user.type(screen.getByLabelText(/username or email/i), "coach@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in to workspace/i }));

    expect(await screen.findByText(/welcome to your team workspace/i)).toBeVisible();
    expect(window.sessionStorage.getItem("sports_team_auth_token")).toBe(
      "verified-test-token",
    );
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          identifier: "coach@example.com",
          password: "password123",
        }),
      }),
    );
  });

  it("shows the backend error and keeps the user on the login page", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "The username or password is incorrect.",
          },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );

    renderAt("/login");
    await user.type(screen.getByLabelText(/username or email/i), "coach@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "wrongpass");
    await user.click(screen.getByRole("button", { name: /sign in to workspace/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The username or password is incorrect.",
    );
    expect(screen.queryByText(/welcome to your team workspace/i)).not.toBeInTheDocument();
  });

  it("redirects an unauthenticated dashboard request to login", async () => {
    renderAt("/dashboard");

    expect(await screen.findByRole("heading", { name: /welcome back/i })).toBeVisible();
  });

  it("allows an authenticated user to access the protected dashboard", async () => {
    window.sessionStorage.setItem("sports_team_auth_token", "existing-token");
    renderAt("/dashboard");

    await waitFor(() => {
      expect(screen.getByText(/welcome to your team workspace/i)).toBeVisible();
    });
  });
});
