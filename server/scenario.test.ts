import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user-open-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
  return { ctx };
}

describe("scenario.upload", () => {
  it("rejects unauthenticated users", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.scenario.upload({
        fileName: "test.pdf",
        fileBase64: "dGVzdA==",
        contentType: "application/pdf",
      })
    ).rejects.toThrow();
  });

  it("rejects unsupported file formats", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.scenario.upload({
        fileName: "test.txt",
        fileBase64: "dGVzdA==",
        contentType: "text/plain",
      })
    ).rejects.toThrow(/Format non supporté/);
  });
});

describe("scenario.list", () => {
  it("rejects unauthenticated users", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.scenario.list()).rejects.toThrow();
  });

  it("returns an array for authenticated users", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scenario.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("scenario.get", () => {
  it("rejects unauthenticated users", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.scenario.get({ id: 1 })).rejects.toThrow();
  });

  it("returns NOT_FOUND for non-existent scenario", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.scenario.get({ id: 999999 })).rejects.toThrow(
      /introuvable/
    );
  });
});

describe("scenario.delete", () => {
  it("rejects unauthenticated users", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.scenario.delete({ id: 1 })).rejects.toThrow();
  });

  it("returns NOT_FOUND for non-existent scenario", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.scenario.delete({ id: 999999 })).rejects.toThrow(
      /introuvable/
    );
  });
});

describe("scenario.breakdown", () => {
  it("rejects unauthenticated users", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.scenario.breakdown({ scenarioId: 1 })
    ).rejects.toThrow();
  });

  it("returns NOT_FOUND for non-existent scenario", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.scenario.breakdown({ scenarioId: 999999 })
    ).rejects.toThrow(/introuvable/);
  });
});

describe("scenario.exportCsv", () => {
  it("rejects unauthenticated users", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.scenario.exportCsv({ scenarioId: 1 })
    ).rejects.toThrow();
  });

  it("returns NOT_FOUND for non-existent scenario", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.scenario.exportCsv({ scenarioId: 999999 })
    ).rejects.toThrow(/introuvable/);
  });
});

describe("scenario.exportPdfHtml", () => {
  it("rejects unauthenticated users", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.scenario.exportPdfHtml({ scenarioId: 1 })
    ).rejects.toThrow();
  });

  it("returns NOT_FOUND for non-existent scenario", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.scenario.exportPdfHtml({ scenarioId: 999999 })
    ).rejects.toThrow(/introuvable/);
  });
});

describe("dashboard.stats", () => {
  it("rejects unauthenticated users", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.dashboard.stats()).rejects.toThrow();
  });

  it("returns stats for authenticated users", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.stats();
    expect(result).toHaveProperty("totalScenarios");
    expect(result).toHaveProperty("completedScenarios");
    expect(result).toHaveProperty("totalScenes");
    expect(result).toHaveProperty("totalCharacters");
    expect(result).toHaveProperty("totalLocations");
    expect(typeof result.totalScenarios).toBe("number");
  });
});
