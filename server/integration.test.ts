import { describe, expect, it, beforeEach, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { FakeDb, type Pred, type OrderSpec } from "./test/fakeDb";

// ─────────────────────────────────────────────────────────────────────────────
// Integration tests that drive the REAL tRPC procedures via
// appRouter.createCaller(), backed by an in-memory FakeDb. Only the Drizzle
// operators eq/and/desc are mocked so the fake receives predicate shapes it can
// evaluate; everything else (procedure logic, permission checks, audit calls,
// changeRequest workflow) is the real production code path.
//
// These cover the acceptance scenarios that require procedure-level proof:
//   #2 new address create, #3 claim (no access), #4 admin duplicate prevention,
//   #5 confirmClaim grants access, #6 staff write A/B, #7 client A/B rejected +
//   change request, #9 approve/reject validation, #10 deactivate revokes,
//   #11 delete anonymizes & preserves passport.
// ─────────────────────────────────────────────────────────────────────────────

// Mock the Drizzle operators to emit the small shapes FakeDb understands.
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: (col: any, value: any): Pred => ({ kind: "eq", col: { name: col?.name }, value }),
    and: (...parts: Pred[]): Pred => ({ kind: "and", parts: parts.filter(Boolean) }),
    desc: (col: any): OrderSpec => ({ col: { name: col?.name }, dir: "desc" }),
    asc: (col: any): OrderSpec => ({ col: { name: col?.name }, dir: "asc" }),
  };
});

// The DB handle returned to every procedure.
let fake: FakeDb;
vi.mock("./db", () => ({
  getDb: async () => fake,
}));

// Avoid real network in notifications/email if a procedure touches them.
vi.mock("./_core/notification", () => ({ notifyOwner: async () => true }));

import { appRouter } from "./routers";
import { users, properties, propertyMembers, changeRequests, auditLog } from "../drizzle/schema";
import type { TrpcContext } from "./context";

const T = {
  users: getTableName(users),
  properties: getTableName(properties),
  propertyMembers: getTableName(propertyMembers),
  changeRequests: getTableName(changeRequests),
  auditLog: getTableName(auditLog),
};

function ctxFor(user: Partial<NonNullable<TrpcContext["user"]>> & { id: number; role: any }): TrpcContext {
  return {
    user: {
      email: `u${user.id}@test.nl`,
      name: `User ${user.id}`,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...user,
    } as NonNullable<TrpcContext["user"]>,
    req: { protocol: "https", headers: {}, ip: "127.0.0.1" } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

beforeEach(() => {
  fake = new FakeDb({
    [T.users]: [
      { id: 1, name: "Admin", email: "admin@test.nl", role: "admin", isActive: true },
      { id: 2, name: "Manager", email: "mgr@test.nl", role: "manager", isActive: true },
      { id: 3, name: "Employee", email: "emp@test.nl", role: "comfortabel_employee", isActive: true },
      { id: 10, name: "Klant A", email: "a@test.nl", role: "user", isActive: true },
      { id: 11, name: "Klant B", email: "b@test.nl", role: "user", isActive: true },
    ],
    [T.properties]: [],
    [T.propertyMembers]: [],
    [T.changeRequests]: [],
    [T.auditLog]: [],
  });
});

const ADDR = { street: "Top Naeffstraat", houseNumber: "21", postalCode: "1507 XW", city: "Zaandam" };

describe("Scenario 2 — klant maakt nieuw adres aan (real createOrClaim)", () => {
  it("creates a new passport with the user as active owner + audit entry", async () => {
    const caller = appRouter.createCaller(ctxFor({ id: 10, role: "user" }));
    const res = await caller.passport.createOrClaim(ADDR);
    expect(res.outcome).toBe("created");
    // property persisted with normalized key
    const props = fake.rowsOf(T.properties);
    expect(props).toHaveLength(1);
    expect(props[0].normalizedAddressKey).toBe("1507XW-21");
    // active owner membership
    const members = fake.rowsOf(T.propertyMembers);
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ userId: 10, role: "owner", status: "active" });
    // audited
    expect(fake.rowsOf(T.auditLog).some((a) => a.action === "property.create")).toBe(true);
  });
});

describe("Scenario 3 — bestaand adres → claim zonder toegang (real createOrClaim)", () => {
  it("second user gets a pending claim and NO access", async () => {
    await appRouter.createCaller(ctxFor({ id: 10, role: "user" })).passport.createOrClaim(ADDR);
    const res = await appRouter.createCaller(ctxFor({ id: 11, role: "user" })).passport.createOrClaim(ADDR);
    expect(res.outcome).toBe("claim_pending");
    const claim = fake.rowsOf(T.propertyMembers).find((m) => m.userId === 11);
    expect(claim).toMatchObject({ role: "pending_applicant", status: "pending" });
    // pending claimant cannot read the property
    await expect(
      appRouter.createCaller(ctxFor({ id: 11, role: "user" })).properties.get({ id: res.propertyId })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("Scenario 4 — beheer maakt zelfde adres aan (duplicate prevention)", () => {
  it("admin create rejects a duplicate normalized address", async () => {
    await appRouter.createCaller(ctxFor({ id: 10, role: "user" })).passport.createOrClaim(ADDR);
    await expect(
      appRouter.createCaller(ctxFor({ id: 1, role: "admin" })).properties.create({
        customerId: 1, street: "Top Naeffstraat", houseNumber: "21", postalCode: "1507xw", city: "Zaandam",
      } as any)
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("Scenario 5 — confirmClaim verleent toegang", () => {
  it("after admin confirms the claim, the user can access the property", async () => {
    await appRouter.createCaller(ctxFor({ id: 10, role: "user" })).passport.createOrClaim(ADDR);
    const claimRes = await appRouter.createCaller(ctxFor({ id: 11, role: "user" })).passport.createOrClaim(ADDR);
    const claim = fake.rowsOf(T.propertyMembers).find((m) => m.userId === 11)!;
    // before: no access
    await expect(
      appRouter.createCaller(ctxFor({ id: 11, role: "user" })).properties.get({ id: claimRes.propertyId })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    // admin confirms
    await appRouter.createCaller(ctxFor({ id: 1, role: "admin" })).passport.confirmClaim({ memberId: claim.id, role: "tenant" });
    const updated = fake.rowsOf(T.propertyMembers).find((m) => m.userId === 11)!;
    expect(updated).toMatchObject({ role: "tenant", status: "active" });
    // after: access granted
    const prop = await appRouter.createCaller(ctxFor({ id: 11, role: "user" })).properties.get({ id: claimRes.propertyId });
    expect(prop?.id).toBe(claimRes.propertyId);
  });
});

describe("Scenario 6 — beheer wijzigt A/B data direct (real properties.update)", () => {
  it("a manager may write a Category A field; change is persisted + audited", async () => {
    await appRouter.createCaller(ctxFor({ id: 10, role: "user" })).passport.createOrClaim(ADDR);
    const propId = fake.rowsOf(T.properties)[0].id;
    await appRouter.createCaller(ctxFor({ id: 2, role: "manager" })).properties.update({ id: propId, surfaceM2: 240 } as any);
    expect(fake.rowsOf(T.properties)[0].surfaceM2).toBe(240);
    expect(fake.rowsOf(T.auditLog).some((a) => a.action === "property.update")).toBe(true);
  });
});

describe("Scenario 7 — klant A/B wijziging geweigerd + wijzigverzoek", () => {
  it("rejects an employee writing an A/B field, but allows a change request", async () => {
    await appRouter.createCaller(ctxFor({ id: 10, role: "user" })).passport.createOrClaim(ADDR);
    const propId = fake.rowsOf(T.properties)[0].id;
    // comfortabel_employee reaches staffProcedure but may NOT write A/B directly
    await expect(
      appRouter.createCaller(ctxFor({ id: 3, role: "comfortabel_employee" })).properties.update({ id: propId, surfaceM2: 999 } as any)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    // owner files a change request for the locked field instead
    const cr = await appRouter
      .createCaller(ctxFor({ id: 10, role: "user" }))
      .changeRequests.create({ propertyId: propId, fieldName: "surfaceM2", proposedValue: "240" });
    expect(cr.id).toBeGreaterThan(0);
    expect(fake.rowsOf(T.changeRequests)[0]).toMatchObject({ fieldName: "surfaceM2", status: "open" });
  });
});

describe("Scenario 9 — beheer valideert (approve/reject change request)", () => {
  it("approve applies the proposed value to the property", async () => {
    await appRouter.createCaller(ctxFor({ id: 10, role: "user" })).passport.createOrClaim(ADDR);
    const propId = fake.rowsOf(T.properties)[0].id;
    const cr = await appRouter
      .createCaller(ctxFor({ id: 10, role: "user" }))
      .changeRequests.create({ propertyId: propId, fieldName: "energyLabel", proposedValue: "A" });
    await appRouter.createCaller(ctxFor({ id: 2, role: "manager" })).changeRequests.approve({ id: cr.id });
    expect(fake.rowsOf(T.properties)[0].energyLabel).toBe("A");
    expect(fake.rowsOf(T.changeRequests)[0].status).toBe("approved");
  });

  it("reject does NOT change the property value", async () => {
    await appRouter.createCaller(ctxFor({ id: 10, role: "user" })).passport.createOrClaim(ADDR);
    const propId = fake.rowsOf(T.properties)[0].id;
    const cr = await appRouter
      .createCaller(ctxFor({ id: 10, role: "user" }))
      .changeRequests.create({ propertyId: propId, fieldName: "energyLabel", proposedValue: "A" });
    await appRouter.createCaller(ctxFor({ id: 2, role: "manager" })).changeRequests.reject({ id: cr.id });
    expect(fake.rowsOf(T.properties)[0].energyLabel).toBeUndefined();
    expect(fake.rowsOf(T.changeRequests)[0].status).toBe("rejected");
  });
});

describe("Scenario 10 — gebruiker deactiveren revoket toegang", () => {
  it("setActive(false) revokes active memberships but keeps the passport", async () => {
    await appRouter.createCaller(ctxFor({ id: 10, role: "user" })).passport.createOrClaim(ADDR);
    const propId = fake.rowsOf(T.properties)[0].id;
    await appRouter.createCaller(ctxFor({ id: 2, role: "manager" })).users.setActive({ id: 10, isActive: false });
    // membership revoked
    expect(fake.rowsOf(T.propertyMembers)[0].status).toBe("revoked");
    // passport still present
    expect(fake.rowsOf(T.properties).find((p) => p.id === propId)).toBeTruthy();
    // user can no longer access
    await expect(
      appRouter.createCaller(ctxFor({ id: 10, role: "user" })).properties.get({ id: propId })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("Scenario 11 — gebruiker verwijderen anonimiseert, behoudt woning", () => {
  it("delete anonymizes the account + revokes memberships but preserves the passport", async () => {
    await appRouter.createCaller(ctxFor({ id: 10, role: "user" })).passport.createOrClaim(ADDR);
    const propId = fake.rowsOf(T.properties)[0].id;
    await appRouter.createCaller(ctxFor({ id: 1, role: "admin" })).users.delete({ id: 10 });
    const u = fake.rowsOf(T.users).find((x) => x.id === 10)!;
    expect(u.name).toBe("Verwijderde gebruiker");
    expect(u.email).toMatch(/@deleted\.invalid$/);
    expect(u.passwordHash).toBeNull();
    expect(u.isActive).toBe(false);
    expect(fake.rowsOf(T.propertyMembers)[0].status).toBe("revoked");
    // passport survives
    expect(fake.rowsOf(T.properties).find((p) => p.id === propId)).toBeTruthy();
  });

  it("a manager cannot delete their own account", async () => {
    await expect(
      appRouter.createCaller(ctxFor({ id: 2, role: "manager" })).users.delete({ id: 2 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("an employee may NOT delete users (managerProcedure)", async () => {
    await expect(
      appRouter.createCaller(ctxFor({ id: 3, role: "comfortabel_employee" })).users.delete({ id: 10 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
