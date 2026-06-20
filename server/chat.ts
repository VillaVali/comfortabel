import { Router } from "express";
import { getDb } from "./db";
import {
  properties,
  customers,
  inspections,
  maintenanceIssues,
  maintenancePlanning,
  chatMessages,
  aiChatUsage,
} from "../drizzle/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { verifySessionToken, COOKIE_NAME } from "./context";
import { users } from "../drizzle/schema";
import { PLAN_FEATURES, type SubscriptionTier } from "../shared/const";
import { canUserAccessProperty } from "./lib/membership";
import type { AccountRole } from "./lib/passport";

export const chatRouter = Router();

// Free-tier monthly limit
const FREE_TIER_MONTHLY_LIMIT = 3;

// ─── Build property context for AI ───────────────────────────────────────────
async function buildPropertyContext(propertyId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "Geen woningdata beschikbaar.";

  const [prop] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
  if (!prop) return "Woning niet gevonden.";

  const lines: string[] = [];

  // Blok 1: Basisidentiteit
  lines.push("=== WONINGPASPOORT ===");
  lines.push(`Adres: ${prop.street} ${prop.houseNumber}, ${prop.postalCode} ${prop.city}`);
  if (prop.propertyType) lines.push(`Type: ${prop.propertyType}`);
  if (prop.buildYear) lines.push(`Bouwjaar: ${prop.buildYear}`);
  if (prop.surfaceM2) lines.push(`Oppervlakte: ${prop.surfaceM2} m²`);
  if (prop.residents) lines.push(`Bewoners: ${prop.residents}`);
  if (prop.energyLabel) lines.push(`Energielabel: ${prop.energyLabel}`);
  if (prop.subscriptionType) lines.push(`Pakket: ${prop.subscriptionType}`);

  // Blok 2: Waarde & Financieel
  if (prop.wozValue || prop.purchasePrice) {
    lines.push("\n=== WAARDE & FINANCIEEL ===");
    if (prop.wozValue) lines.push(`WOZ-waarde: €${prop.wozValue.toLocaleString("nl-NL")} (${prop.wozYear || "onbekend"})`);
    if (prop.purchasePrice) lines.push(`Aankoopprijs: €${prop.purchasePrice.toLocaleString("nl-NL")} (${prop.purchaseYear || "onbekend"})`);
    if (prop.vveContribution) lines.push(`VvE-bijdrage: €${prop.vveContribution}/mnd`);
  }

  // Blok 3: Juridisch
  if (prop.ownershipType || prop.kadastraleAanduiding) {
    lines.push("\n=== JURIDISCH ===");
    if (prop.ownershipType) lines.push(`Eigendomsvorm: ${prop.ownershipType}`);
    if (prop.kadastraleAanduiding) lines.push(`Kadastrale aanduiding: ${prop.kadastraleAanduiding}`);
    if (prop.isMonument) lines.push(`Monumentstatus: Ja (${prop.monumentType || "onbekend type"})`);
    if (prop.hasErfpacht) lines.push(`Erfpacht: Ja${prop.erfpachtCanon ? ` (€${prop.erfpachtCanon}/jr)` : ""}`);
  }

  // Blok 4: Technisch
  const techFields = [
    prop.foundationType && `Fundering: ${prop.foundationType}`,
    prop.roofType && `Dak: ${prop.roofType}${prop.roofMaterial ? ` (${prop.roofMaterial})` : ""}`,
    prop.heatingSystem && `Verwarming: ${prop.heatingSystem}${prop.heatingYear ? ` (${prop.heatingYear})` : ""}`,
    prop.hotWaterSystem && `Warm water: ${prop.hotWaterSystem}`,
    prop.glazingType && `Beglazing: ${prop.glazingType}`,
    prop.wallInsulation && `Gevelisolatie: ${prop.wallInsulation}`,
    prop.roofInsulation && `Dakisolatie: ${prop.roofInsulation}`,
    prop.floorInsulation && `Vloerisolatie: ${prop.floorInsulation}`,
    prop.hasSolarPanels && `Zonnepanelen: ${prop.solarPanelCount || "ja"}${prop.solarPanelYear ? ` (${prop.solarPanelYear})` : ""}`,
    prop.hasEVCharger && "Laadpaal: aanwezig",
    prop.hasGasConnection === false && "Aardgasaansluiting: nee (aardgasvrij)",
  ].filter(Boolean);
  if (techFields.length > 0) {
    lines.push("\n=== TECHNISCHE KENMERKEN ===");
    techFields.forEach((f) => lines.push(f as string));
  }

  // Blok 5: Verduurzaming
  if (prop.targetEnergyLabel || prop.gasVrijDoeljaar) {
    lines.push("\n=== VERDUURZAMING ===");
    if (prop.targetEnergyLabel) lines.push(`Streef-energielabel: ${prop.targetEnergyLabel}`);
    if (prop.gasVrijDoeljaar) lines.push(`Aardgasvrij doeljaar: ${prop.gasVrijDoeljaar}`);
    if (prop.sustainabilityMeasures) lines.push(`Genomen maatregelen: ${prop.sustainabilityMeasures}`);
  }

  // Onderhoud
  const issues = await db
    .select()
    .from(maintenanceIssues)
    .where(eq(maintenanceIssues.propertyId, propertyId))
    .orderBy(desc(maintenanceIssues.createdAt))
    .limit(10);

  if (issues.length > 0) {
    lines.push("\n=== ONDERHOUD (recente meldingen) ===");
    issues.forEach((i) => {
      lines.push(`- [${i.priority?.toUpperCase() || "NORMAAL"}] ${i.title}: ${i.description || ""} (status: ${i.status})`);
    });
  }

  // Planning
  const planning = await db
    .select()
    .from(maintenancePlanning)
    .where(eq(maintenancePlanning.propertyId, propertyId))
    .orderBy(maintenancePlanning.plannedYear)
    .limit(10);

  if (planning.length > 0) {
    lines.push("\n=== MEERJARENPLANNING ===");
    planning.forEach((p) => {
      lines.push(`- ${p.plannedYear}: ${p.title}${p.estimatedCost ? ` (€${p.estimatedCost})` : ""} [${p.status}]`);
    });
  }

  // Laatste inspectie
  const [lastInspection] = await db
    .select()
    .from(inspections)
    .where(and(eq(inspections.propertyId, propertyId), eq(inspections.status, "afgerond")))
    .orderBy(desc(inspections.inspectionDate))
    .limit(1);

  if (lastInspection) {
    lines.push("\n=== LAATSTE INSPECTIE ===");
    lines.push(`Datum: ${new Date(lastInspection.inspectionDate).toLocaleDateString("nl-NL")}`);
    if (lastInspection.totalScore) lines.push(`Score: ${lastInspection.totalScore}/100`);
    if (lastInspection.woningGrade) lines.push(`Comfortabel Score™: ${lastInspection.woningGrade}`);
    if (lastInspection.summary) lines.push(`Samenvatting: ${lastInspection.summary}`);
  }

  if (prop.notes) {
    lines.push(`\n=== NOTITIES ===\n${prop.notes}`);
  }

  return lines.join("\n");
}

// ─── GET /api/chat/:propertyId/history — load chat history ───────────────────
chatRouter.get("/:propertyId/history", async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) { res.status(401).json({ error: "Niet ingelogd" }); return; }
    const payload = await verifySessionToken(token);
    if (!payload) { res.status(401).json({ error: "Sessie verlopen" }); return; }

    const db = await getDb();
    if (!db) { res.status(500).json({ error: "Database niet beschikbaar" }); return; }

    const propertyId = parseInt(req.params.propertyId);
    if (isNaN(propertyId)) { res.status(400).json({ error: "Ongeldig woning-ID" }); return; }

    // Ownership check
    const [prop] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
    if (!prop) { res.status(404).json({ error: "Woning niet gevonden" }); return; }

    const [userRow] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!userRow) { res.status(401).json({ error: "Gebruiker niet gevonden" }); return; }

    const okHistory = await canUserAccessProperty(db, { id: userRow.id, role: userRow.role as AccountRole }, propertyId);
    if (!okHistory) { res.status(403).json({ error: "Geen toegang" }); return; }

    // Load last 50 messages
    const history = await db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.propertyId, propertyId), eq(chatMessages.userId, payload.userId)))
      .orderBy(asc(chatMessages.createdAt))
      .limit(50);

    // Get monthly usage for Free tier
    const monthYear = new Date().toISOString().slice(0, 7);
    const [usage] = await db
      .select()
      .from(aiChatUsage)
      .where(and(
        eq(aiChatUsage.userId, payload.userId),
        eq(aiChatUsage.propertyId, propertyId),
        eq(aiChatUsage.monthYear, monthYear)
      ))
      .limit(1);

    res.json({
      messages: history,
      monthlyUsage: usage?.questionCount ?? 0,
      monthlyLimit: PLAN_FEATURES[prop.subscriptionType as SubscriptionTier]?.aiHuismeesterUitgebreid ? null : FREE_TIER_MONTHLY_LIMIT,
    });
  } catch (err) {
    console.error("[Chat History] Error:", err);
    res.status(500).json({ error: "Interne fout" });
  }
});

// ─── POST /api/chat/:propertyId — streaming SSE ───────────────────────────────
chatRouter.post("/:propertyId", async (req, res) => {
  try {
    // Auth check
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      res.status(401).json({ error: "Niet ingelogd" });
      return;
    }
    const payload = await verifySessionToken(token);
    if (!payload) {
      res.status(401).json({ error: "Sessie verlopen" });
      return;
    }
    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Database niet beschikbaar" });
      return;
    }
    const [userRow] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!userRow) {
      res.status(401).json({ error: "Gebruiker niet gevonden" });
      return;
    }
    const user = userRow;

    const propertyId = parseInt(req.params.propertyId);
    if (isNaN(propertyId)) {
      res.status(400).json({ error: "Ongeldig woning-ID" });
      return;
    }

    // Verify property access
    const [prop] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
    if (!prop) {
      res.status(404).json({ error: "Woning niet gevonden" });
      return;
    }

    const okChat = await canUserAccessProperty(db, { id: user.id, role: user.role as AccountRole }, propertyId);
    if (!okChat) {
      res.status(403).json({ error: "Geen toegang" });
      return;
    }

    // Check AI feature access
    const features = PLAN_FEATURES[prop.subscriptionType as SubscriptionTier];
    const hasAI = features?.aiHuismeesterBeperkt || features?.aiHuismeesterUitgebreid;
    if (!hasAI) {
      res.status(403).json({ error: "AI Huismeester is niet beschikbaar in uw huidige pakket" });
      return;
    }

    // Check Free-tier monthly quota
    const isFreeTier = !features?.aiHuismeesterUitgebreid;
    const monthYear = new Date().toISOString().slice(0, 7);

    if (isFreeTier) {
      const [usage] = await db
        .select()
        .from(aiChatUsage)
        .where(and(
          eq(aiChatUsage.userId, user.id),
          eq(aiChatUsage.propertyId, propertyId),
          eq(aiChatUsage.monthYear, monthYear)
        ))
        .limit(1);

      const currentCount = usage?.questionCount ?? 0;
      if (currentCount >= FREE_TIER_MONTHLY_LIMIT) {
        res.status(429).json({
          error: `U heeft uw maandlimiet van ${FREE_TIER_MONTHLY_LIMIT} vragen bereikt. Upgrade naar Digital of hoger voor onbeperkte toegang.`,
          limitReached: true,
          monthlyLimit: FREE_TIER_MONTHLY_LIMIT,
          monthlyUsage: currentCount,
        });
        return;
      }
    }

    const { messages, userMessage } = req.body as {
      messages: Array<{ role: string; content: string }>;
      userMessage?: string;
    };
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Berichten ontbreken" });
      return;
    }

    // Save user message to history
    const lastUserMsg = userMessage || messages[messages.length - 1]?.content;
    if (lastUserMsg) {
      await db.insert(chatMessages).values({
        propertyId,
        userId: user.id,
        role: "user",
        content: lastUserMsg,
      });
    }

    // Update monthly usage counter
    const [existingUsage] = await db
      .select()
      .from(aiChatUsage)
      .where(and(
        eq(aiChatUsage.userId, user.id),
        eq(aiChatUsage.propertyId, propertyId),
        eq(aiChatUsage.monthYear, monthYear)
      ))
      .limit(1);

    if (existingUsage) {
      await db
        .update(aiChatUsage)
        .set({ questionCount: existingUsage.questionCount + 1 })
        .where(eq(aiChatUsage.id, existingUsage.id));
    } else {
      await db.insert(aiChatUsage).values({
        userId: user.id,
        propertyId,
        monthYear,
        questionCount: 1,
      });
    }

    // Build context
    const propertyContext = await buildPropertyContext(propertyId);

    const systemPrompt = `Je bent de AI Huismeester van MijnComfortabel™ — een vriendelijke, deskundige en praktische assistent voor woningbeheer en onderhoud.

Je helpt de eigenaar van de woning met vragen over onderhoud, verduurzaming, kosten, planning, technische kenmerken en meer.

WONINGDATA:
${propertyContext}

RICHTLIJNEN:
- Antwoord altijd in het Nederlands
- Wees concreet en praktisch — geef direct bruikbaar advies
- Verwijs naar de specifieke gegevens van DEZE woning waar relevant
- Als je iets niet weet, zeg dat eerlijk
- Houd antwoorden beknopt maar volledig (max 300 woorden tenzij gevraagd)
- Gebruik geen markdown-headers, wel bullet points waar nuttig
- Wees warm en persoonlijk — dit is iemands thuis`;

    // Set up SSE streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const baseUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
    const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

    if (!baseUrl || !apiKey) {
      res.write(`data: ${JSON.stringify({ error: "AI niet geconfigureerd" })}\n\n`);
      res.end();
      return;
    }

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        messages: apiMessages,
        stream: true,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      res.write(`data: ${JSON.stringify({ error: `AI fout: ${response.status}` })}\n\n`);
      res.end();
      return;
    }

    // Stream the response and collect full content for saving
    const reader = response.body?.getReader();
    if (!reader) {
      res.write(`data: ${JSON.stringify({ error: "Geen stream" })}\n\n`);
      res.end();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            res.write("data: [DONE]\n\n");
            continue;
          }
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    }

    // Save assistant response to history
    if (fullContent) {
      await db.insert(chatMessages).values({
        propertyId,
        userId: user.id,
        role: "assistant",
        content: fullContent,
      });
    }

    // Send updated usage info
    const newCount = (existingUsage?.questionCount ?? 0) + 1;
    res.write(`data: ${JSON.stringify({
      done: true,
      monthlyUsage: newCount,
      monthlyLimit: isFreeTier ? FREE_TIER_MONTHLY_LIMIT : null,
    })}\n\n`);

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("[Chat] Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Interne fout" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Verbinding verbroken" })}\n\n`);
      res.end();
    }
  }
});
