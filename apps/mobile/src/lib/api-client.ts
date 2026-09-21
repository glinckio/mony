import type { AuthTokens } from "@mony/shared-types";

import { useAuthStore } from "./auth-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string[];
  path: string;
  timestamp: string;
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message.join(" "));
    this.name = "ApiError";
  }
}

function rawFetch(path: string, init: RequestInit | undefined, accessToken: string | null) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });
}

// Coalesces concurrent 401s into a single in-flight refresh call instead
// of firing one refresh request per failed request.
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const { refreshToken, setSession, clearSession } = useAuthStore.getState();
  if (!refreshToken) return false;

  try {
    const response = await rawFetch(
      "/auth/refresh",
      { method: "POST", body: JSON.stringify({ refreshToken }) },
      null,
    );
    if (!response.ok) {
      clearSession();
      return false;
    }
    const tokens = (await response.json()) as AuthTokens;
    setSession(tokens);
    return true;
  } catch {
    clearSession();
    return false;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;
  let response = await rawFetch(path, init, accessToken);

  // Only attempt a silent refresh for requests that were actually
  // authenticated — a 401 from /auth/login (wrong password) isn't a
  // stale-token situation, it's a normal login failure the caller
  // handles directly.
  if (response.status === 401 && accessToken) {
    refreshPromise ??= refreshSession().finally(() => {
      refreshPromise = null;
    });
    const refreshed = await refreshPromise;

    if (refreshed) {
      response = await rawFetch(path, init, useAuthStore.getState().accessToken);
    }
  }

  if (!response.ok) {
    const body = (await response.json()) as ApiErrorBody;
    throw new ApiError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

// Stateless JWT: clearing the local session is what actually logs the
// user out. The API call is best-effort (204, no server session to
// revoke) — a network failure here still clears the local session so
// the user always lands back on the auth stack.
export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    // ignore — fall through to clearing the local session regardless
  }
  useAuthStore.getState().clearSession();
}
