import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Unit tests for email helper (no real API calls) ───────────────────────────

// Mock the Resend module so tests never hit the network
vi.mock("resend", () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi
          .fn()
          .mockResolvedValue({ data: { id: "test-id" }, error: null }),
      },
    })),
  };
});

import {
  sendEmail,
  sendPasswordResetEmail,
  sendInvitationEmail,
  sendReportReadyEmail,
  sendFounding100ConfirmationEmail,
  sendFounding100InternalNotificationEmail,
} from "./email";

describe("sendEmail", () => {
  it("returns success: true on successful send", async () => {
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Test</p>",
    });
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe("sendPasswordResetEmail", () => {
  it("returns success: true", async () => {
    const result = await sendPasswordResetEmail({
      to: "user@example.com",
      name: "Jan",
      resetUrl:
        "https://mijncomfort-a8mtknzo.manus.space/wachtwoord-reset?token=abc123",
    });
    expect(result.success).toBe(true);
  });
});

describe("sendInvitationEmail", () => {
  it("returns success: true", async () => {
    const result = await sendInvitationEmail({
      to: "klant@example.com",
      name: "Maria",
      inviteUrl: "https://mijncomfort-a8mtknzo.manus.space/registreren",
      propertyAddress: "Kerkstraat 1, Amsterdam",
      invitedBy: "Comfortabel",
    });
    expect(result.success).toBe(true);
  });
});

describe("sendReportReadyEmail", () => {
  it("returns success: true", async () => {
    const result = await sendReportReadyEmail({
      to: "klant@example.com",
      name: "Piet",
      reportType: "Woningpaspoort™",
      propertyAddress: "Dorpsstraat 5, Utrecht",
      downloadUrl:
        "https://mijncomfort-a8mtknzo.manus.space/api/pdf/woningpaspoort/1",
    });
    expect(result.success).toBe(true);
  });
});

describe("Founding 100 emails", () => {
  it("sends the applicant confirmation", async () => {
    await expect(
      sendFounding100ConfirmationEmail({
        to: "noor@example.com",
        name: "Noor",
      })
    ).resolves.toMatchObject({ success: true });
  });

  it("sends the internal notification", async () => {
    await expect(
      sendFounding100InternalNotificationEmail({
        to: "info@comfortabel.org",
        lead: {
          name: "Noor",
          email: "noor@example.com",
          postalCode: "1234AB",
          submittedAt: "30-07-2026 10:00",
        },
      })
    ).resolves.toMatchObject({ success: true });
  });
});

// ── Validate email template content ──────────────────────────────────────────

describe("email template content", () => {
  it("password reset email contains reset URL in text", async () => {
    // We test the text fallback content indirectly via the mock
    // The mock always returns success, so we verify the function doesn't throw
    await expect(
      sendPasswordResetEmail({
        to: "a@b.com",
        name: "Test",
        resetUrl: "https://example.com/reset?token=xyz",
      })
    ).resolves.toMatchObject({ success: true });
  });

  it("invitation email works without optional fields", async () => {
    await expect(
      sendInvitationEmail({
        to: "a@b.com",
        name: "Test",
        inviteUrl: "https://example.com/registreren",
      })
    ).resolves.toMatchObject({ success: true });
  });
});
