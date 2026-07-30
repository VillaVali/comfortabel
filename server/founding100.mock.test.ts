import { beforeEach, describe, expect, it } from "vitest";
import {
  getMockFounding100LeadCount,
  resetMockFounding100Leads,
  saveMockFounding100Lead,
} from "./founding100.mock";

describe("Founding 100 mock storage", () => {
  beforeEach(() => resetMockFounding100Leads());

  it("stores local submissions without external services", () => {
    saveMockFounding100Lead({
      name: "Test Bewoner",
      email: "test@example.com",
      privacyAccepted: true,
      contactConsent: true,
      marketingOptIn: false,
    });

    expect(getMockFounding100LeadCount()).toBe(1);
  });

  it("updates an existing mock lead by e-mail address", () => {
    const firstId = saveMockFounding100Lead({
      name: "Test Bewoner",
      email: "test@example.com",
      privacyAccepted: true,
      contactConsent: true,
      marketingOptIn: false,
    });
    const secondId = saveMockFounding100Lead({
      name: "Bijgewerkte Test",
      email: "TEST@example.com",
      privacyAccepted: true,
      contactConsent: true,
      marketingOptIn: true,
    });

    expect(secondId).toBe(firstId);
    expect(getMockFounding100LeadCount()).toBe(1);
  });
});
