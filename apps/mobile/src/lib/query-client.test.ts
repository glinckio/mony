import type { AuthTokens } from "@mony/shared-types";

import { useAuthStore } from "./auth-store";
import { queryClient } from "./query-client";

const session = (userId: string, token = "1"): AuthTokens => ({
  accessToken: `access-${userId}-${token}`,
  refreshToken: `refresh-${userId}-${token}`,
  user: {
    id: userId,
    name: "Ada Lovelace",
    email: `${userId}@example.com`,
    activeWorkspace: "PERSONAL",
  },
});

const TRANSACTIONS_KEY = ["transactions", { typeFilter: "ALL", search: "" }];

// LGPD: the cache holds the signed-in user's financial data, so it must not
// outlive that user's session.
describe("queryClient", () => {
  beforeEach(() => {
    useAuthStore.getState().setSession(session("user-1"));
    queryClient.setQueryData(TRANSACTIONS_KEY, { pages: [{ items: ["Conta de luz"] }] });
  });

  afterAll(() => {
    useAuthStore.getState().clearSession();
    queryClient.clear();
  });

  it("keeps the cache when the same user's tokens are refreshed", () => {
    useAuthStore.getState().setSession(session("user-1", "refreshed"));

    expect(useAuthStore.getState().accessToken).toBe("access-user-1-refreshed");
    expect(queryClient.getQueryData(TRANSACTIONS_KEY)).toEqual({
      pages: [{ items: ["Conta de luz"] }],
    });
  });

  it("clears the cache on logout", () => {
    useAuthStore.getState().clearSession();

    expect(queryClient.getQueryData(TRANSACTIONS_KEY)).toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it("clears the cache when another account signs in", () => {
    useAuthStore.getState().setSession(session("user-2"));

    expect(queryClient.getQueryData(TRANSACTIONS_KEY)).toBeUndefined();
  });
});
