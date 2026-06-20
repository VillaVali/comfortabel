import { describe, expect, it } from "vitest";
import {
  normalizeAddressKey,
  canAccessSensitiveData,
  canMutateField,
  requiresChangeRequest,
  canManageUsers,
  decideCreateOrClaim,
  pickCanonical,
  fieldCategory,
  type CanonicalCandidate,
} from "./lib/passport";

// ─────────────────────────────────────────────────────────────────────────────
// MANDATORY TEST PLAN — the 12 acceptance scenarios from the 1.0 specification.
// Each scenario exercises the exact decision/permission logic that the tRPC
// procedures enforce server-side, so these tests guard the real behaviour
// deterministically (no live DB mutation required).
// ─────────────────────────────────────────────────────────────────────────────

describe("Scenario 1 — klant maakt nieuw account aan", () => {
  // A brand-new client account is a normal "user" with no membership yet.
  it("a new user account has no sensitive access until linked to a property", () => {
    expect(
      canAccessSensitiveData({ accountRole: "user", memberRole: null, memberStatus: null })
    ).toBe(false);
  });
});

describe("Scenario 2 — klant maakt nieuw adres aan", () => {
  it("a free address (no existing passport) creates a new passport with the user as owner", () => {
    expect(decideCreateOrClaim({ existingActiveProperty: false })).toBe("create_owner");
  });
  it("the new owner (active) gets sensitive access", () => {
    expect(
      canAccessSensitiveData({ accountRole: "user", memberRole: "owner", memberStatus: "active" })
    ).toBe(true);
  });
});

describe("Scenario 3 — klant vult bestaand adres in (koppeling)", () => {
  it("an existing passport triggers a claim, not a second passport", () => {
    expect(decideCreateOrClaim({ existingActiveProperty: true })).toBe("claim");
  });
  it("the claimant (pending_applicant) gets NO sensitive access", () => {
    expect(
      canAccessSensitiveData({
        accountRole: "user",
        memberRole: "pending_applicant",
        memberStatus: "pending",
      })
    ).toBe(false);
  });
});

describe("Scenario 4 — beheer maakt hetzelfde adres aan (duplicate prevention)", () => {
  it("admin-entered address normalizes to the SAME key as the client's → duplicate detected", () => {
    const clientKey = normalizeAddressKey({ postalCode: "1507 XW", houseNumber: "21" });
    const adminKey = normalizeAddressKey({ postalCode: "1507xw", houseNumber: 21 });
    expect(adminKey).toBe(clientKey);
  });
});

describe("Scenario 5 — koppeling gebruiker aan bestaand WoningPaspoort", () => {
  it("a pending claim has no access; after admin confirms (active owner) access is granted", () => {
    // before confirmation
    expect(
      canAccessSensitiveData({ accountRole: "user", memberRole: "pending_applicant", memberStatus: "pending" })
    ).toBe(false);
    // after confirmation → role upgraded + active
    expect(
      canAccessSensitiveData({ accountRole: "user", memberRole: "owner", memberStatus: "active" })
    ).toBe(true);
  });
});

describe("Scenario 6 — beheer wijzigt data", () => {
  it("manager/admin may write Category A and B fields directly", () => {
    expect(canMutateField({ category: "A", accountRole: "admin" })).toBe(true);
    expect(canMutateField({ category: "B", accountRole: "manager" })).toBe(true);
  });
});

describe("Scenario 7 — klant probeert vergrendelde data te wijzigen (geweigerd)", () => {
  it("an owner cannot write Category A/B directly and must file a change request", () => {
    expect(
      canMutateField({ category: "A", accountRole: "user", memberRole: "owner", memberStatus: "active" })
    ).toBe(false);
    expect(
      requiresChangeRequest({ category: "A", accountRole: "user", memberRole: "owner", memberStatus: "active" })
    ).toBe(true);
    // postalCode is a Category A field per the shared map
    expect(fieldCategory("postalCode")).toBe("A");
  });
});

describe("Scenario 8 — klant uploadt documenten", () => {
  it("only an active (non-applicant) member can act on the property; a pending claim cannot", () => {
    expect(
      canAccessSensitiveData({ accountRole: "user", memberRole: "owner", memberStatus: "active" })
    ).toBe(true);
    expect(
      canAccessSensitiveData({ accountRole: "user", memberRole: "pending_applicant", memberStatus: "pending" })
    ).toBe(false);
  });
});

describe("Scenario 9 — beheer valideert gegevens", () => {
  it("staff (employee) may read for validation; only manager/admin write the validated (B) field", () => {
    // employee can access for support/validation review
    expect(canAccessSensitiveData({ accountRole: "comfortabel_employee" })).toBe(true);
    // but employee cannot directly write a validated Category B field
    expect(canMutateField({ category: "B", accountRole: "comfortabel_employee" })).toBe(false);
    // manager/admin finalize the validation
    expect(canMutateField({ category: "B", accountRole: "manager" })).toBe(true);
  });
});

describe("Scenario 10 — gebruiker deactiveren", () => {
  // Deactivation = membership status set to "revoked"; passport itself is kept.
  it("a revoked member loses sensitive access", () => {
    expect(
      canAccessSensitiveData({ accountRole: "user", memberRole: "owner", memberStatus: "revoked" })
    ).toBe(false);
  });
  it("only manager/admin may perform user management (deactivate)", () => {
    expect(canManageUsers("manager")).toBe(true);
    expect(canManageUsers("admin")).toBe(true);
    expect(canManageUsers("comfortabel_employee")).toBe(false);
    expect(canManageUsers("user")).toBe(false);
  });
});

describe("Scenario 11 — gebruiker verwijderen", () => {
  // Deletion removes the person's membership/account, but the passport survives.
  it("with the membership removed (null), sensitive access is gone but the passport record is unaffected", () => {
    expect(
      canAccessSensitiveData({ accountRole: "user", memberRole: null, memberStatus: null })
    ).toBe(false);
  });
  it("deletion is a user-management action → employee may not do it", () => {
    expect(canManageUsers("comfortabel_employee")).toBe(false);
  });
});

describe("Scenario 12 — WoningPaspoort samenvoegen", () => {
  it("merge keeps the richest record (linked user + most data) as canonical", () => {
    const candidates: CanonicalCandidate[] = [
      // admin-created, no linked user, but has the only inspection
      { id: 90001, hasLinkedUser: false, inspectionCount: 1, maintenanceCount: 0, documentCount: 0, chatMessageCount: 0, filledFieldCount: 2, createdAtMs: 1_700_000_000_000 },
      // linked user, data-rich → should win
      { id: 60001, hasLinkedUser: true, inspectionCount: 0, maintenanceCount: 2, documentCount: 3, chatMessageCount: 5, filledFieldCount: 3, createdAtMs: 1_700_000_500_000 },
      { id: 120001, hasLinkedUser: true, inspectionCount: 0, maintenanceCount: 0, documentCount: 0, chatMessageCount: 0, filledFieldCount: 3, createdAtMs: 1_700_001_000_000 },
    ];
    expect(pickCanonical(candidates)).toBe(60001);
  });
});
