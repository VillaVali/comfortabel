import { describe, expect, it } from "vitest";
import {
  founding100LeadSchema,
  normalizePostalCode,
} from "./founding100.schema";

describe("founding100LeadSchema", () => {
  it("accepts and trims a valid minimal application", () => {
    const parsed = founding100LeadSchema.parse({
      name: "  Noor de Vries  ",
      email: "  NOOR@example.com  ",
      privacyAccepted: true,
      contactConsent: true,
    });

    expect(parsed.name).toBe("Noor de Vries");
    expect(parsed.email).toBe("NOOR@example.com");
    expect(parsed.marketingOptIn).toBe(false);
    expect(parsed.attribution).toBeUndefined();
  });

  it("rejects an application without privacy acceptance", () => {
    const parsed = founding100LeadSchema.safeParse({
      name: "Noor de Vries",
      email: "noor@example.com",
      privacyAccepted: false,
      contactConsent: true,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects an application without contact consent", () => {
    const parsed = founding100LeadSchema.safeParse({
      name: "Noor de Vries",
      email: "noor@example.com",
      privacyAccepted: true,
      contactConsent: false,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects unexpected fields", () => {
    const parsed = founding100LeadSchema.safeParse({
      name: "Noor de Vries",
      email: "noor@example.com",
      privacyAccepted: true,
      contactConsent: true,
      isFoundingMember: true,
    });

    expect(parsed.success).toBe(false);
  });
});

describe("normalizePostalCode", () => {
  it("normalizes Dutch postal codes for storage", () => {
    expect(normalizePostalCode(" 1234 ab ")).toBe("1234AB");
  });

  it("keeps an omitted postal code empty", () => {
    expect(normalizePostalCode()).toBeUndefined();
  });
});
