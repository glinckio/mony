import { ApiError, apiFetch, logout } from "./api-client";
import { useAuthStore } from "./auth-store";

function mockResponse(body: unknown, status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const errorBody = (path: string) => ({
  statusCode: 401,
  error: "UNAUTHORIZED",
  message: ["Unauthorized"],
  path,
  timestamp: "2026-01-01T00:00:00.000Z",
});

const testUser = {
  id: "user-1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  activeWorkspace: "PERSONAL" as const,
};

describe("apiFetch", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
    globalThis.fetch = jest.fn();
  });

  it("attaches the Bearer header when an access token is present", async () => {
    useAuthStore.setState({ accessToken: "token-123", refreshToken: "refresh-123", user: testUser });
    (globalThis.fetch as jest.Mock).mockResolvedValue(mockResponse({ ok: true }, 200));

    await apiFetch("/some/path");

    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer token-123");
  });

  it("does not attach an Authorization header when logged out", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(mockResponse({ ok: true }, 200));

    await apiFetch("/auth/login", { method: "POST" });

    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("silently refreshes once on 401 and retries the original request", async () => {
    useAuthStore.setState({ accessToken: "old-token", refreshToken: "refresh-123", user: testUser });
    const fetchMock = globalThis.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(mockResponse(errorBody("/protected"), 401))
      .mockResolvedValueOnce(
        mockResponse(
          { accessToken: "new-token", refreshToken: "new-refresh", user: testUser },
          200,
        ),
      )
      .mockResolvedValueOnce(mockResponse({ data: "ok" }, 200));

    const result = await apiFetch("/protected");

    expect(result).toEqual({ data: "ok" });
    expect(useAuthStore.getState().accessToken).toBe("new-token");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("clears the session when the refresh attempt also fails", async () => {
    useAuthStore.setState({ accessToken: "old-token", refreshToken: "refresh-123", user: testUser });
    const fetchMock = globalThis.fetch as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(mockResponse(errorBody("/protected"), 401))
      .mockResolvedValueOnce(mockResponse(errorBody("/auth/refresh"), 401));

    await expect(apiFetch("/protected")).rejects.toBeInstanceOf(ApiError);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("does not attempt a refresh for a 401 on an unauthenticated request", async () => {
    const fetchMock = globalThis.fetch as jest.Mock;
    fetchMock.mockResolvedValueOnce(mockResponse(errorBody("/auth/login"), 401));

    await expect(apiFetch("/auth/login", { method: "POST" })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("logout", () => {
  it("clears the session locally even if the API call fails", async () => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: testUser });
    globalThis.fetch = jest.fn().mockRejectedValue(new Error("network down"));

    await logout();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
