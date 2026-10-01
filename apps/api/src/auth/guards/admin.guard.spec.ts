import { ForbiddenException, type ExecutionContext } from "@nestjs/common";

import type { PrismaService } from "../../prisma/prisma.service";

import { AdminGuard } from "./admin.guard";

const contextFor = (user?: { sub: string }) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe("AdminGuard", () => {
  const findUnique = jest.fn();
  const guard = new AdminGuard({ user: { findUnique } } as unknown as PrismaService);

  beforeEach(() => findUnique.mockReset());

  it("lets an active admin through, by the role and status in the database", async () => {
    findUnique.mockResolvedValue({ role: "ADMIN", status: "ACTIVE" });
    await expect(guard.canActivate(contextFor({ sub: "admin-1" }))).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "admin-1" },
      select: { role: true, status: true },
    });
  });

  it("refuses users, unknown users and anonymous requests", async () => {
    findUnique.mockResolvedValue({ role: "USER", status: "ACTIVE" });
    await expect(guard.canActivate(contextFor({ sub: "user-1" }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(contextFor({ sub: "gone" }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(guard.canActivate(contextFor())).rejects.toBeInstanceOf(ForbiddenException);
    // No caller id: the database isn't even asked.
    expect(findUnique).toHaveBeenCalledTimes(2);
  });

  it("refuses a suspended admin whose access token is still valid", async () => {
    findUnique.mockResolvedValue({ role: "ADMIN", status: "INACTIVE" });
    await expect(guard.canActivate(contextFor({ sub: "admin-2" }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
