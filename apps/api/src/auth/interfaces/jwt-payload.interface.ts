import type { Role, WorkspaceType } from "@prisma/client";

// Claims embedded directly in the signed access token so `JwtStrategy`
// never needs a DB round trip to authorize a request. Short access token
// TTL (15m) keeps staleness acceptable; login/refresh re-fetch fresh
// claims from the DB, per-request auth doesn't.
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  activeWorkspace: WorkspaceType;
}
