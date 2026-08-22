import type { LoginCredentials, LoginResponse } from "../../types/auth";
import { apiRequest } from "../api/apiClient";

export async function login(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  const body = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  if (!body?.token || !body.user) {
    throw new Error("The authentication response was incomplete.");
  }

  return body;
}
