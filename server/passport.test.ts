import { describe, expect, it } from "vitest";
import {
  normalizeAddressKey,
  canAccessSensitiveData,
  canMutateField,
  requiresChangeRequest,
  canManageUsers,
  isStaffAccount,
  decideCreateOrClaim,
  computeCanonicalScore,
  pickCanonical,
  fieldCategory,
  FIELD_CATEGORY,
  isValidDutchPostalCode,
  normalizeDutchPostalCode,
  type CanonicalCandidate,
} from "./lib/passport";

// ── 1. Duplicate address prevention: deterministic normalized key ─────────────

describe("normalizeAddressKey", () => {
  it("produces identical keys for the same physical address typed differently", () => {
    const a = normalizeAddressKey({ postalCode: "1506 AB", houseNumber: "21" });
    const b = normalizeAddressKey({ postalCode: "1506ab", houseNumber: " 21 " });
    const c = normalizeAddressKey({ postalCode: "1506-AB", houseNumber: "21" });
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(a).toBe("1506AB-21");
  });

  it("distinguishes additions / house letters", () => {
    const base = normalizeAddressKey({ postalCode: "1506AB", houseNumber: "21" });
    const withAddition = normalizeAddressKey({ postalCode: "1506AB", houseNumber: "21", addition: "A" });
    const withLetter = normalizeAddressKey({ postalCode: "1506AB", houseNumber: "21", houseLetter: "B" });
    expect(base).not.toBe(withAddition);
    expect(base).not.toBe(withLetter);
    expect(withAddition).toBe("1506AB-21-A");
  });

  it("treats the Top Naeffstraat 21 duplicates as one key", () => {
    // Same address that currently exists 3× in the live DB.
    const k1 = normalizeAddressKey({ postalCode: "1502 XY", houseNumber: "21" });
    const k2 = normalizeAddressKey({ postalCode: "1502xy", houseNumber: "21" });
    const k3 = normalizeAddressKey({ postalCode: "1502 XY", houseNumber: " 21" });
    expect(new Set([k1, k2, k3]).size).toBe(1);
  });
});

// ── 2. Claim gives NO access until confirmed ──────────────────────────────────

describe("canAccessSensitiveData", () => {
  it("denies a pending_applicant claim (the core security rule)", () => {
    expect(
      canAccessSensitiveData({
        accountRole: "user",
        memberRole: "pending_applicant",
        memberStatus: "pending",
      }),
    ).toBe(false);
  });

  it("denies even if a pending_applicant is erroneously marked active", () => {
    expect(
      canAccessSensitiveData({
        accountRole: "user",
        memberRole: "pending_applicant",
        memberStatus: "active",
      }),
    ).toBe(false);
  });

  it("denies a user with no membership row", () => {
    expect(canAccessSensitiveData({ accountRole: "user" })).toBe(false);
  });

  it("denies a revoked member", () => {
    expect(
      canAccessSensitiveData({ accountRole: "user", memberRole: "owner", memberStatus: "revoked" }),
    ).toBe(false);
  });

  it("grants an active owner", () => {
    expect(
      canAccessSensitiveData({ accountRole: "user", memberRole: "owner", memberStatus: "active" }),
    ).toBe(true);
  });

  it("grants account-level admin regardless of membership", () => {
    expect(canAccessSensitiveData({ accountRole: "admin" })).toBe(true);
    expect(canAccessSensitiveData({ accountRole: "manager" })).toBe(true);
  });
});

// ── 3. Category A/B field lock ────────────────────────────────────────────────

describe("canMutateField + requiresChangeRequest", () => {
  it("blocks a non-staff owner from directly editing category A fields", () => {
    expect(
      canMutateField({ category: "A", accountRole: "user", memberRole: "owner", memberStatus: "active" }),
    ).toBe(false);
    expect(
      requiresChangeRequest({ category: "A", accountRole: "user", memberRole: "owner", memberStatus: "active" }),
    ).toBe(true);
  });

  it("blocks a non-staff owner from directly editing category B fields", () => {
    expect(
      canMutateField({ category: "B", accountRole: "user", memberRole: "owner", memberStatus: "active" }),
    ).toBe(false);
  });

  it("allows admin/manager to directly edit category A/B fields", () => {
    expect(canMutateField({ category: "A", accountRole: "admin" })).toBe(true);
    expect(canMutateField({ category: "B", accountRole: "manager" })).toBe(true);
    expect(requiresChangeRequest({ category: "A", accountRole: "admin" })).toBe(false);
  });

  it("allows an active owner to edit category C fields directly", () => {
    expect(
      canMutateField({ category: "C", accountRole: "user", memberRole: "owner", memberStatus: "active" }),
    ).toBe(true);
    expect(
      requiresChangeRequest({ category: "C", accountRole: "user", memberRole: "owner", memberStatus: "active" }),
    ).toBe(false);
  });

  it("blocks a tenant from editing category C (read-only role)", () => {
    expect(
      canMutateField({ category: "C", accountRole: "user", memberRole: "tenant", memberStatus: "active" }),
    ).toBe(false);
  });
});

// ── 4. Employee cannot do user management ─────────────────────────────────────

describe("canManageUsers", () => {
  it("allows admin and manager", () => {
    expect(canManageUsers("admin")).toBe(true);
    expect(canManageUsers("manager")).toBe(true);
  });

  it("denies comfortabel_employee and user", () => {
    expect(canManageUsers("comfortabel_employee")).toBe(false);
    expect(canManageUsers("user")).toBe(false);
  });
});

// ── 5. Staff account & 7. admin-always-access helper ──────────────────────────

describe("isStaffAccount", () => {
  it("recognizes staff accounts", () => {
    expect(isStaffAccount("admin")).toBe(true);
    expect(isStaffAccount("manager")).toBe(true);
    expect(isStaffAccount("comfortabel_employee")).toBe(true);
  });
  it("rejects normal users", () => {
    expect(isStaffAccount("user")).toBe(false);
  });
});

// ── Claim decision ────────────────────────────────────────────────────────────

describe("decideCreateOrClaim", () => {
  it("creates a new owner passport when address is free", () => {
    expect(decideCreateOrClaim({ existingActiveProperty: false })).toBe("create_owner");
  });
  it("routes to a claim when an active passport already exists", () => {
    expect(decideCreateOrClaim({ existingActiveProperty: true })).toBe("claim");
  });
});

// ── 5/6. Merge preserves the richest record (canonical scoring) ───────────────

describe("computeCanonicalScore + pickCanonical", () => {
  const base: CanonicalCandidate = {
    id: 0,
    hasLinkedUser: false,
    inspectionCount: 0,
    maintenanceCount: 0,
    documentCount: 0,
    chatMessageCount: 0,
    filledFieldCount: 0,
    createdAtMs: 1_700_000_000_000,
  };

  it("prefers a record with a linked user over a richer orphan", () => {
    const linked: CanonicalCandidate = { ...base, id: 1, hasLinkedUser: true };
    const orphanRich: CanonicalCandidate = {
      ...base,
      id: 2,
      inspectionCount: 3,
      documentCount: 5,
      filledFieldCount: 30,
    };
    expect(computeCanonicalScore(linked)).toBeGreaterThan(computeCanonicalScore(orphanRich));
    expect(pickCanonical([orphanRich, linked])).toBe(1);
  });

  it("among linked records, prefers the one with most associated data", () => {
    const a: CanonicalCandidate = { ...base, id: 10, hasLinkedUser: true, inspectionCount: 1 };
    const b: CanonicalCandidate = { ...base, id: 11, hasLinkedUser: true, inspectionCount: 4, documentCount: 2 };
    expect(pickCanonical([a, b])).toBe(11);
  });

  it("returns null for empty candidate set", () => {
    expect(pickCanonical([])).toBeNull();
  });

  it("simulates the 3 Top Naeffstraat 21 duplicates and picks the linked, data-rich one", () => {
    // IDs mirror the live data issue: 60001, 90001 (admin-created, userId NULL), 120001.
    const p60001: CanonicalCandidate = { ...base, id: 60001, hasLinkedUser: true, inspectionCount: 1, documentCount: 2, filledFieldCount: 20, createdAtMs: 1_700_000_000_000 };
    const p90001: CanonicalCandidate = { ...base, id: 90001, hasLinkedUser: false, inspectionCount: 0, filledFieldCount: 25, createdAtMs: 1_705_000_000_000 };
    const p120001: CanonicalCandidate = { ...base, id: 120001, hasLinkedUser: true, inspectionCount: 0, filledFieldCount: 10, createdAtMs: 1_710_000_000_000 };
    // 60001 has a linked user AND the most sub-records → should win.
    expect(pickCanonical([p120001, p90001, p60001])).toBe(60001);
  });
});

// ── 8. Extended role coverage (1.0 role set) ─────────────────────────────────

describe("extended role coverage", () => {
  it("lets an active partner and business_manager edit category C", () => {
    expect(
      canMutateField({ category: "C", accountRole: "user", memberRole: "partner", memberStatus: "active" }),
    ).toBe(true);
    expect(
      canMutateField({ category: "C", accountRole: "user", memberRole: "business_manager", memberStatus: "active" }),
    ).toBe(true);
  });

  it("still forces partner/business_manager through a changeRequest for category A/B", () => {
    expect(
      requiresChangeRequest({ category: "A", accountRole: "user", memberRole: "business_manager", memberStatus: "active" }),
    ).toBe(true);
    expect(
      requiresChangeRequest({ category: "B", accountRole: "user", memberRole: "partner", memberStatus: "active" }),
    ).toBe(true);
  });

  it("grants sensitive access to active partner, tenant and business_manager", () => {
    for (const r of ["partner", "tenant", "business_manager"] as const) {
      expect(
        canAccessSensitiveData({ accountRole: "user", memberRole: r, memberStatus: "active" }),
      ).toBe(true);
    }
  });

  it("comfortabel_employee may edit category C but cannot manage users", () => {
    expect(canMutateField({ category: "C", accountRole: "comfortabel_employee" })).toBe(true);
    expect(canManageUsers("comfortabel_employee")).toBe(false);
  });

  it("comfortabel_employee cannot directly write category A/B (no manager rights)", () => {
    expect(canMutateField({ category: "A", accountRole: "comfortabel_employee" })).toBe(false);
    expect(canMutateField({ category: "B", accountRole: "comfortabel_employee" })).toBe(false);
  });

  it("a pending_applicant cannot edit any category", () => {
    for (const cat of ["A", "B", "C"] as const) {
      expect(
        canMutateField({ category: cat, accountRole: "user", memberRole: "pending_applicant", memberStatus: "pending" }),
      ).toBe(false);
    }
  });
});

// ── 9. Property field category lock (mirrors properties.update enforcement) ─────

describe("fieldCategory classification", () => {
  it("classifies address/system identity fields as Category A", () => {
    for (const f of [
      "street", "houseNumber", "postalCode", "city", "addition", "houseLetter",
      "bagId", "normalizedAddressKey", "wozValue", "wozYear", "kadastraleAanduiding",
    ]) {
      expect(fieldCategory(f)).toBe("A");
    }
  });

  it("classifies validated data as Category B", () => {
    expect(fieldCategory("energyLabel")).toBe("B");
    expect(fieldCategory("addressValidationStatus")).toBe("B");
    expect(fieldCategory("status")).toBe("B");
  });

  it("defaults unknown / free user fields to Category C", () => {
    expect(fieldCategory("notes")).toBe("C");
    expect(fieldCategory("residents")).toBe("C");
    expect(fieldCategory("someUnmappedField")).toBe("C");
  });

  it("exposes a stable map shared with the update procedure", () => {
    // Guards against drift: the enforcement layer imports this exact map.
    expect(FIELD_CATEGORY.postalCode).toBe("A");
    expect(FIELD_CATEGORY.energyLabel).toBe("B");
    expect(FIELD_CATEGORY.notes).toBeUndefined(); // unmapped → defaults to C
  });
});

describe("update lock end-to-end (category + role)", () => {
  // Simulates the exact gate used in properties.update: for each field, decide
  // whether a given actor may write directly or must file a changeRequest.
  function gate(field: string, accountRole: "user" | "comfortabel_employee" | "manager" | "admin") {
    const category = fieldCategory(field);
    const direct = canMutateField({ category, accountRole, memberRole: "owner", memberStatus: "active" });
    const needsCR = requiresChangeRequest({ category, accountRole, memberRole: "owner", memberStatus: "active" });
    return { category, direct, needsCR };
  }

  it("blocks an owner (client) from writing Category A directly → must use changeRequest", () => {
    const r = gate("postalCode", "user");
    expect(r.direct).toBe(false);
    expect(r.needsCR).toBe(true);
  });

  it("blocks a comfortabel_employee from writing Category B directly", () => {
    const r = gate("energyLabel", "comfortabel_employee");
    expect(r.direct).toBe(false);
    expect(r.needsCR).toBe(true);
  });

  it("allows a manager to write Category A/B directly (no changeRequest)", () => {
    expect(gate("postalCode", "manager").direct).toBe(true);
    expect(gate("energyLabel", "manager").needsCR).toBe(false);
  });

  it("allows an admin to write Category A/B directly", () => {
    expect(gate("normalizedAddressKey", "admin").direct).toBe(true);
    expect(gate("status", "admin").needsCR).toBe(false);
  });

  it("lets an owner write free Category C fields directly", () => {
    const r = gate("notes", "user");
    expect(r.category).toBe("C");
    expect(r.direct).toBe(true);
    expect(r.needsCR).toBe(false);
  });
});

// ── 10. Dutch postal code validation & normalization (sign-up route) ──────────

describe("isValidDutchPostalCode", () => {
  it("accepts valid codes regardless of spacing/casing", () => {
    expect(isValidDutchPostalCode("1234 AB")).toBe(true);
    expect(isValidDutchPostalCode("1234ab")).toBe(true);
    expect(isValidDutchPostalCode(" 1234-AB ")).toBe(true);
  });

  it("rejects malformed codes", () => {
    expect(isValidDutchPostalCode("0234AB")).toBe(false); // leading zero not allowed
    expect(isValidDutchPostalCode("123AB")).toBe(false); // too few digits
    expect(isValidDutchPostalCode("1234A")).toBe(false); // one letter
    expect(isValidDutchPostalCode("12345")).toBe(false); // no letters
    expect(isValidDutchPostalCode("")).toBe(false);
  });
});

describe("normalizeDutchPostalCode", () => {
  it("formats a valid code to canonical '1234 AB'", () => {
    expect(normalizeDutchPostalCode("1234ab")).toBe("1234 AB");
    expect(normalizeDutchPostalCode(" 1234-AB ")).toBe("1234 AB");
  });

  it("returns cleaned input for partial/invalid codes without crashing", () => {
    expect(normalizeDutchPostalCode("123")).toBe("123");
    expect(normalizeDutchPostalCode("")).toBe("");
  });
});
