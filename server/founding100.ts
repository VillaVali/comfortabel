import { Router } from "express";
import rateLimit from "express-rate-limit";
import { eq } from "drizzle-orm";
import { founding100Leads } from "../drizzle/schema";
import { getDb } from "./db";
import {
  sendFounding100ConfirmationEmail,
  sendFounding100InternalNotificationEmail,
} from "./email";
import { writeAudit } from "./lib/audit";
import {
  founding100LeadSchema,
  normalizePostalCode,
} from "./founding100.schema";
import { saveMockFounding100Lead } from "./founding100.mock";

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Te veel aanmeldpogingen. Probeer het later opnieuw." },
});

export const founding100Router = Router();

founding100Router.post("/", submitLimiter, async (req, res) => {
  const parsed = founding100LeadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Controleer de ingevulde gegevens." });
  }

  // Honeypot: bots get a harmless success response without creating a lead.
  if (parsed.data.company) {
    return res.status(201).json({ success: true });
  }

  const email = parsed.data.email.toLowerCase();
  const postalCode = normalizePostalCode(parsed.data.postalCode);
  const now = new Date();
  const attribution = parsed.data.attribution ?? {
    utmSource: undefined,
    utmMedium: undefined,
    utmCampaign: undefined,
    utmTerm: undefined,
    utmContent: undefined,
    referrer: undefined,
    landingPath: undefined,
  };

  const storageMode =
    process.env.FOUNDING100_STORAGE_MODE ??
    (process.env.NODE_ENV === "production" ? "database" : "mock");

  if (storageMode === "mock") {
    const leadId = saveMockFounding100Lead(parsed.data);
    console.info("[Founding100] Mock lead stored", { leadId });
    return res.status(201).json({ success: true, mode: "mock" });
  }

  const db = await getDb();
  if (!db) {
    return res
      .status(503)
      .json({ error: "Aanmelden is tijdelijk niet beschikbaar." });
  }

  try {
    await db
      .insert(founding100Leads)
      .values({
        name: parsed.data.name,
        email,
        phone: parsed.data.phone,
        postalCode,
        message: parsed.data.message,
        privacyAcceptedAt: now,
        contactConsentAt: now,
        marketingOptIn: parsed.data.marketingOptIn,
        utmSource: attribution.utmSource,
        utmMedium: attribution.utmMedium,
        utmCampaign: attribution.utmCampaign,
        utmTerm: attribution.utmTerm,
        utmContent: attribution.utmContent,
        referrer: attribution.referrer,
        landingPath: attribution.landingPath,
      })
      .onDuplicateKeyUpdate({
        set: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          postalCode,
          message: parsed.data.message,
          privacyAcceptedAt: now,
          contactConsentAt: now,
          marketingOptIn: parsed.data.marketingOptIn,
          utmSource: attribution.utmSource,
          utmMedium: attribution.utmMedium,
          utmCampaign: attribution.utmCampaign,
          utmTerm: attribution.utmTerm,
          utmContent: attribution.utmContent,
          referrer: attribution.referrer,
          landingPath: attribution.landingPath,
          notificationError: null,
        },
      });

    const [lead] = await db
      .select({ id: founding100Leads.id })
      .from(founding100Leads)
      .where(eq(founding100Leads.email, email))
      .limit(1);

    if (!lead) {
      throw new Error("Lead was not available after insert");
    }

    const notificationErrors: string[] = [];
    const confirmation = await sendFounding100ConfirmationEmail({
      to: email,
      name: parsed.data.name,
    });
    if (confirmation.success) {
      await db
        .update(founding100Leads)
        .set({ confirmationEmailSentAt: new Date() })
        .where(eq(founding100Leads.id, lead.id));
    } else {
      notificationErrors.push(
        `confirmation: ${confirmation.error || "unknown error"}`
      );
    }

    await writeAudit(db, {
      action: "founding100.application_received",
      entityType: "founding100Lead",
      entityId: lead.id,
      newValue: { source: "founding100_landing", status: "new" },
    });

    const emailMode =
      process.env.FOUNDING100_EMAIL_MODE ??
      (process.env.NODE_ENV === "production" ? "live" : "disabled");
    if (emailMode !== "live") {
      return res.status(201).json({ success: true, notifications: "disabled" });
    }

    const internalEmail = process.env.LEAD_NOTIFICATION_EMAIL;
    if (!internalEmail) {
      notificationErrors.push(
        "internal: LEAD_NOTIFICATION_EMAIL is not configured"
      );
    } else {
      const internal = await sendFounding100InternalNotificationEmail({
        to: internalEmail,
        lead: {
          name: parsed.data.name,
          email,
          phone: parsed.data.phone,
          postalCode,
          message: parsed.data.message,
          utmSource: attribution.utmSource,
          utmMedium: attribution.utmMedium,
          utmCampaign: attribution.utmCampaign,
          submittedAt: now.toLocaleString("nl-NL", {
            timeZone: "Europe/Amsterdam",
          }),
        },
      });
      if (internal.success) {
        await db
          .update(founding100Leads)
          .set({ internalNotificationSentAt: new Date() })
          .where(eq(founding100Leads.id, lead.id));
      } else {
        notificationErrors.push(
          `internal: ${internal.error || "unknown error"}`
        );
      }
    }

    if (notificationErrors.length > 0) {
      await db
        .update(founding100Leads)
        .set({
          notificationError: notificationErrors.join("\n").slice(0, 2000),
        })
        .where(eq(founding100Leads.id, lead.id));
      console.error("[Founding100] Notification error:", notificationErrors);
    }

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("[Founding100] Submit failed:", error);
    return res
      .status(500)
      .json({ error: "Aanmelden is niet gelukt. Probeer het opnieuw." });
  }
});
