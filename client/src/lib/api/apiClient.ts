import { config } from "../config";
import { tokenStorage } from "../auth/tokenStorage";

type ApiOptions = {
  authenticated?: boolean;
};

type ApiErrorBody = {
  message?: string;
  error?:
    | string
    | {
        code?: string;
        message?: string;
      };
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: ApiOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.authenticated) {
    const token = tokenStorage.get();
    if (!token) {
      throw new ApiError("Authentication is required.", 401, "TOKEN_MISSING");
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(
      `${config.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`,
      { ...init, headers },
    );
  } catch {
    throw new ApiError(
      "The service is unavailable. Confirm the backend is running and try again.",
      0,
      "NETWORK_ERROR",
    );
  }

  const body = (await response.json().catch(() => null)) as
    | T
    | ApiErrorBody
    | null;

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null;
    // The Express API sends { error: "message" }; the documented contract
    // is { error: { code, message } }. Accept both.
    const detail =
      typeof errorBody?.error === "object" ? errorBody.error : undefined;
    const message =
      typeof errorBody?.error === "string" ? errorBody.error : detail?.message;
    throw new ApiError(
      message ?? errorBody?.message ?? "The request could not be completed.",
      response.status,
      detail?.code,
    );
  }

  return body as T;
}
