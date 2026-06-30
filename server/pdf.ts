import { Router } from "express";
import { getDb } from "./db";
import {
  customers,
  properties,
  inspections,
  inspectionItems,
  maintenanceIssues,
  maintenancePlanning,
  propertyMembers,
  users,
} from "../drizzle/schema";
import { eq, desc, asc, and, inArray } from "drizzle-orm";

/** Dual-model owner name: propertyMembers (new) → customers (legacy) → fallback */
async function resolveOwnerName(
  db: NonNullable<Awaited<ReturnType<typeof import('./db').getDb>>>,
  propertyId: number,
  customerId: number | null,
): Promise<string> {
  // New model: find active owner/business_manager member → user name
  const ownerMember = await db
    .select({ userId: propertyMembers.userId })
    .from(propertyMembers)
    .where(and(
      eq(propertyMembers.propertyId, propertyId),
      inArray(propertyMembers.role, ["owner", "business_manager"]),
      eq(propertyMembers.status, "active"),
    ))
    .limit(1);
  if (ownerMember[0]) {
    const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, ownerMember[0].userId)).limit(1);
    if (u?.name) return u.name;
  }
  // Legacy model: customers table via customerId
  if (customerId != null) {
    const [c] = await db.select({ firstName: customers.firstName, lastName: customers.lastName, companyName: customers.companyName, type: customers.type }).from(customers).where(eq(customers.id, customerId)).limit(1);
    if (c) {
      if (c.type === "bedrijf" || c.type === "vastgoed") return c.companyName || "Eigenaar";
      return `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Eigenaar";
    }
  }
  return "Eigenaar";
}
import { createContext } from "./context";
import { canUserAccessProperty } from "./lib/membership";
import { canUseValidatedFeatures, type AccountRole } from "./lib/passport";

export const pdfRouter = Router();

import { printableHtml } from "./lib/printable";

// --- LLM helper ---------------------------------------------------------------

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const baseUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  if (!baseUrl || !apiKey) throw new Error("LLM API not configured");

  const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!resp.ok) throw new Error(`LLM API error: ${resp.status}`);
  const data = (await resp.json()) as { choices: { message: { content: string } }[] };
  return data.choices?.[0]?.message?.content || "";
}

// --- Auth helper --------------------------------------------------------------

async function checkAuth(req: Parameters<typeof createContext>[0]["req"], res: Parameters<typeof createContext>[0]["res"]) {
  return createContext({ req: req as any, res: res as any });
}

// --- Grade color helper -------------------------------------------------------

function gradeColor(grade?: string | null): string {
  if (!grade) return "#94a3b8";
  const map: Record<string, string> = { A: "#16a34a", B: "#4ade80", C: "#eab308", D: "#f97316", E: "#ef4444" };
  return map[grade] || "#94a3b8";
}

function labelColor(label?: string | null): string {
  if (!label) return "#94a3b8";
  if (label.startsWith("A")) return "#16a34a";
  if (label === "B") return "#4ade80";
  if (label === "C") return "#eab308";
  if (label === "D") return "#f97316";
  return "#ef4444";
}

// --- Shared PDF header/footer styles -----------------------------------------

const PDF_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; background: #fff; font-size: 13px; line-height: 1.6; }
  .header { background: linear-gradient(135deg, #1E3A5F 0%, #2d5a8e 100%); color: white; padding: 36px 44px 28px; }
  .header-logo { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 10px; }
  .header h1 { font-size: 24px; font-weight: 800; margin-bottom: 6px; }
  .header .subtitle { color: rgba(255,255,255,0.75); font-size: 13px; margin-bottom: 4px; }
  .header .meta { color: rgba(255,255,255,0.55); font-size: 12px; }
  .badge { display: inline-block; background: #C9A84C; color: #1E3A5F; font-size: 10px; font-weight: 700; padding: 3px 12px; border-radius: 20px; margin-top: 12px; text-transform: uppercase; letter-spacing: 1px; }
  .content { padding: 32px 44px; }
  .section { margin-bottom: 28px; page-break-inside: avoid; }
  .section-title { font-size: 13px; font-weight: 700; color: #1E3A5F; border-bottom: 2px solid #e2e8f0; padding-bottom: 7px; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.8px; display: flex; align-items: center; gap: 8px; }
  .section-icon { width: 20px; height: 20px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .info-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
  .info-label { color: #64748b; font-size: 12px; }
  .info-value { font-weight: 600; font-size: 12px; text-align: right; max-width: 55%; }
  .card { background: #f8fafc; border-radius: 10px; padding: 16px; border: 1px solid #e2e8f0; }
  .score-box { display: flex; align-items: center; gap: 20px; padding: 18px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
  .grade-circle { width: 72px; height: 72px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 900; border: 3px solid currentColor; flex-shrink: 0; }
  .score-bars { flex: 1; }
  .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .bar-label { width: 150px; font-size: 11px; color: #64748b; }
  .bar-track { flex: 1; height: 7px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; }
  .bar-value { width: 44px; text-align: right; font-size: 11px; font-weight: 600; color: #475569; }
  .issue { padding: 10px 14px; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid; }
  .issue-urgent { background: #fef2f2; border-color: #ef4444; }
  .issue-hoog { background: #fff7ed; border-color: #f97316; }
  .issue-normaal { background: #f0f9ff; border-color: #0ea5e9; }
  .issue-laag { background: #f8fafc; border-color: #94a3b8; }
  .issue-title { font-weight: 600; font-size: 12px; }
  .issue-meta { font-size: 11px; color: #64748b; margin-top: 2px; }
  .planning-row { display: flex; align-items: flex-start; gap: 16px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
  .planning-year { width: 52px; font-size: 16px; font-weight: 800; color: #1E3A5F; flex-shrink: 0; }
  .planning-info { flex: 1; }
  .planning-cost { font-weight: 700; color: #1e293b; font-size: 13px; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; }
  .tag-urgent { background: #fef2f2; color: #ef4444; }
  .tag-hoog { background: #fff7ed; color: #f97316; }
  .tag-normaal { background: #f0f9ff; color: #0ea5e9; }
  .tag-laag { background: #f8fafc; color: #94a3b8; }
  .energy-badge { display: inline-block; padding: 4px 14px; border-radius: 6px; font-size: 16px; font-weight: 900; color: white; }
  .bool-yes { color: #16a34a; font-weight: 700; }
  .bool-no { color: #94a3b8; }
  .highlight-box { background: linear-gradient(135deg, #1E3A5F10, #2d5a8e08); border: 1px solid #1E3A5F30; border-radius: 10px; padding: 16px 20px; margin-bottom: 16px; }
  .highlight-box h3 { font-size: 14px; font-weight: 700; color: #1E3A5F; margin-bottom: 8px; }
  .ai-content { font-size: 12.5px; line-height: 1.7; color: #334155; }
  .ai-content h3 { font-size: 13px; font-weight: 700; color: #1E3A5F; margin: 14px 0 6px; }
  .ai-content h4 { font-size: 12px; font-weight: 700; color: #475569; margin: 10px 0 4px; }
  .ai-content p { margin-bottom: 8px; }
  .ai-content ul { padding-left: 18px; margin-bottom: 8px; }
  .ai-content li { margin-bottom: 4px; }
  .ai-content strong { color: #1e293b; }
  .measure-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
  .measure-num { width: 24px; height: 24px; border-radius: 50%; background: #1E3A5F; color: white; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
  .measure-info { flex: 1; }
  .measure-title { font-weight: 700; font-size: 12px; color: #1e293b; }
  .measure-detail { font-size: 11px; color: #64748b; margin-top: 2px; }
  .measure-meta { display: flex; gap: 12px; margin-top: 4px; flex-wrap: wrap; }
  .meta-chip { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
  .chip-green { background: #dcfce7; color: #16a34a; }
  .chip-blue { background: #dbeafe; color: #1d4ed8; }
  .chip-amber { background: #fef9c3; color: #a16207; }
  .subsidy-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
  .subsidy-name { font-size: 12px; font-weight: 600; color: #1e293b; }
  .subsidy-amount { font-size: 13px; font-weight: 800; color: #16a34a; }
  .subsidy-detail { font-size: 11px; color: #64748b; }
  .total-box { background: #1E3A5F; color: white; border-radius: 10px; padding: 16px 20px; margin-top: 16px; display: flex; justify-content: space-between; align-items: center; }
  .total-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); }
  .total-amount { font-size: 22px; font-weight: 900; color: #C9A84C; }
  .footer { background: #f8fafc; border-top: 2px solid #e2e8f0; padding: 14px 44px; display: flex; justify-content: space-between; align-items: center; color: #94a3b8; font-size: 10px; margin-top: 20px; }
  .footer-brand { font-weight: 700; color: #1E3A5F; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

// --- 1. WoningpaspoortTM PDF ---------------------------------------------------

pdfRouter.get("/woningpaspoort/:propertyId", async (req, res) => {
  try {
    const ctx = await checkAuth(req as any, res as any);
    if (!ctx.user) return res.status(401).json({ error: "Unauthorized" });

    const propertyId = Number(req.params.propertyId);
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const [property] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
    if (!property) return res.status(404).json({ error: "Property not found" });

    if (!(await canUserAccessProperty(db, { id: ctx.user.id, role: ctx.user.role as AccountRole }, propertyId))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Validation gate (Optie A): reports are locked until Comfortabel validates.
    if (!canUseValidatedFeatures({ accountRole: ctx.user.role as AccountRole, propertyStatus: property.status })) {
      return res.status(403).json({ error: "Dit rapport is beschikbaar zodra Comfortabel uw woning heeft gevalideerd (0-meting).", awaitingValidation: true });
    }

    const displayName = await resolveOwnerName(db, propertyId, property.customerId ?? null);
    const allInspections = await db.select().from(inspections).where(eq(inspections.propertyId, propertyId)).orderBy(desc(inspections.inspectionDate));
    const latestInspection = allInspections.find(i => i.status === "afgerond");
    const issues = await db.select().from(maintenanceIssues).where(eq(maintenanceIssues.propertyId, propertyId));
    const planning = await db.select().from(maintenancePlanning).where(eq(maintenancePlanning.propertyId, propertyId)).orderBy(asc(maintenancePlanning.plannedYear));
    const openIssues = issues.filter(i => i.status !== "afgerond");

    const ownershipLabels: Record<string, string> = {
      volle_eigendom: "Volle eigendom", erfpacht: "Erfpacht", appartementsrecht: "Appartementsrecht",
      opstalrecht: "Opstalrecht", onbekend: "Onbekend",
    };
    const heatingLabels: Record<string, string> = {
      cv_ketel: "CV-ketel", warmtepomp: "Warmtepomp", stadsverwarming: "Stadsverwarming",
      elektrisch: "Elektrisch", geen: "Geen", onbekend: "Onbekend",
    };
    const insulationLabels: Record<string, string> = {
      aanwezig: "Aanwezig", deels: "Deels aanwezig", afwezig: "Afwezig", onbekend: "Onbekend",
    };
    const glazingLabels: Record<string, string> = {
      enkel: "Enkel glas", dubbel: "Dubbel glas", hr_plus: "HR+", hr_plus_plus: "HR++",
      triple: "Triple glas", gemengd: "Gemengd", onbekend: "Onbekend",
    };

    const bool = (v?: boolean | null) => v ? '<span class="bool-yes">✓ Ja</span>' : '<span class="bool-no">Nee</span>';
    const val = (v: unknown, suffix = "") => (v !== null && v !== undefined && v !== "onbekend") ? `${v}${suffix}` : "—";
    const eur = (v?: number | null) => v ? `€${v.toLocaleString("nl-NL")}` : "—";

    const html = `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8">
<title>WoningpaspoortTM - ${property.street} ${property.houseNumber}</title>
<style>${PDF_STYLES}</style></head><body>

<div class="header">
  <div class="header-logo">MijnComfortabelTM · Woningpaspoort</div>
  <h1>${property.street} ${property.houseNumber}</h1>
  <div class="subtitle">${property.postalCode} ${property.city}${property.wijk ? ` · ${property.wijk}` : ""}</div>
  <div class="meta">Eigenaar: ${displayName} · Abonnement: ${(property.subscriptionType || "free").toUpperCase()}</div>
  <span class="badge">Gegenereerd op ${new Date().toLocaleDateString("nl-NL")}</span>
</div>

<div class="content">

  <!-- Blok 1: Basisidentiteit -->
  <div class="section">
    <div class="section-title">🏠 Basisidentiteit</div>
    <div class="grid-2">
      <div>
        ${[
          ["Adres", `${property.street} ${property.houseNumber}`],
          ["Postcode & Stad", `${property.postalCode} ${property.city}`],
          ["Wijk", val(property.wijk)],
          ["Woningtype", val(property.propertyType)],
          ["Bouwjaar", val(property.buildYear)],
          ["Gebruiksoppervlakte", property.surfaceM2 ? `${property.surfaceM2} m²` : "—"],
        ].map(([l, v]) => `<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`).join("")}
      </div>
      <div>
        ${[
          ["Bewoners", val(property.residents)],
          ["Energielabel", property.energyLabel ? `<span class="energy-badge" style="background:${labelColor(property.energyLabel)}">${property.energyLabel}</span>` : "—"],
          ["Eigendomsvorm", ownershipLabels[property.ownershipType || ""] || "—"],
          ["Kadastrale aanduiding", val(property.kadastraleAanduiding)],
          ["BAG-gebruiksfunctie", val(property.bestemmingCategory)],
          ["Abonnement", (property.subscriptionType || "free").toUpperCase()],
        ].map(([l, v]) => `<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`).join("")}
      </div>
    </div>
  </div>

  <!-- Blok 2: Waarde & Financieel -->
  ${(property.wozValue || property.purchasePrice || property.mortgageProvider) ? `
  <div class="section">
    <div class="section-title">💰 Waarde & Financieel</div>
    <div class="grid-2">
      <div>
        ${[
          ["WOZ-waarde", property.wozValue ? `${eur(property.wozValue)} (${property.wozYear || "?"})` : "—"],
          ["Koopsom", property.purchasePrice ? `${eur(property.purchasePrice)} (${property.purchaseYear || "?"})` : "—"],
          ["VvE-bijdrage", property.vveContribution ? `${eur(property.vveContribution)}/mnd` : "—"],
        ].map(([l, v]) => `<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`).join("")}
      </div>
      <div>
        ${[
          ["Hypotheekverstrekker", val(property.mortgageProvider)],
          ["Erfpachtcanon", property.erfpachtCanon ? `${eur(property.erfpachtCanon)}/jaar` : "—"],
          ["Opstalverzekering verloopt", property.insuranceExpiry ? new Date(property.insuranceExpiry).toLocaleDateString("nl-NL") : "—"],
        ].map(([l, v]) => `<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`).join("")}
      </div>
    </div>
  </div>
  ` : ""}

  <!-- Blok 3: Juridisch & Omgeving -->
  <div class="section">
    <div class="section-title">⚖️ Juridisch & Omgeving</div>
    <div class="grid-2">
      <div>
        ${[
          ["Monumentstatus", property.isMonument ? `<span class="tag" style="background:#fef9c3;color:#a16207">${property.monumentType || "Monument"}</span>` : '<span class="bool-no">Geen monument</span>'],
          ["Erfpacht", bool(property.hasErfpacht)],
          ["Beslag/hypotheekrecht", bool(property.hasBeslag)],
        ].map(([l, v]) => `<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`).join("")}
      </div>
      <div>
        ${[
          ["CBS Buurtcode", val(property.buurtCode)],
          ["Bestemmingscategorie", val(property.bestemmingCategory)],
        ].map(([l, v]) => `<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`).join("")}
      </div>
    </div>
  </div>

  <!-- Blok 4: Technische Kenmerken -->
  <div class="section">
    <div class="section-title">🔧 Technische Kenmerken</div>
    <div class="grid-2">
      <div>
        ${[
          ["Fundering", val(property.foundationType)],
          ["Daktype", val(property.roofType)],
          ["Dakmateriaal", val(property.roofMaterial)],
          ["Muurtype", val(property.wallType)],
          ["Verwarming", heatingLabels[property.heatingSystem || ""] || "—"],
          ["Bouwjaar verwarming", val(property.heatingYear)],
          ["Warm water", val(property.hotWaterSystem)],
        ].map(([l, v]) => `<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`).join("")}
      </div>
      <div>
        ${[
          ["Beglazing", glazingLabels[property.glazingType || ""] || "—"],
          ["Gevelisolatie", insulationLabels[property.wallInsulation || ""] || "—"],
          ["Dakisolatie", insulationLabels[property.roofInsulation || ""] || "—"],
          ["Vloerisolatie", insulationLabels[property.floorInsulation || ""] || "—"],
          ["Zonnepanelen", property.hasSolarPanels ? `${property.solarPanelCount || "?"} panelen (${property.solarPanelYear || "?"})` : "Nee"],
          ["Laadpaal", bool(property.hasEVCharger)],
          ["Aardgasaansluiting", bool(property.hasGasConnection)],
        ].map(([l, v]) => `<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`).join("")}
      </div>
    </div>
  </div>

  <!-- Blok 5: Verduurzaming -->
  ${(property.targetEnergyLabel || property.gasVrijDoeljaar) ? `
  <div class="section">
    <div class="section-title">🌱 Verduurzaming & Ambities</div>
    <div class="grid-2">
      <div>
        ${[
          ["Huidig energielabel", property.energyLabel ? `<span class="energy-badge" style="background:${labelColor(property.energyLabel)}">${property.energyLabel}</span>` : "—"],
          ["Streef-energielabel", property.targetEnergyLabel ? `<span class="energy-badge" style="background:${labelColor(property.targetEnergyLabel)}">${property.targetEnergyLabel}</span>` : "—"],
          ["Aardgasvrij doeljaar", val(property.gasVrijDoeljaar)],
        ].map(([l, v]) => `<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`).join("")}
      </div>
      <div>
        ${property.sustainabilityMeasures ? (() => {
          try {
            const measures = JSON.parse(property.sustainabilityMeasures) as string[];
            return `<div class="info-row"><span class="info-label">Genomen maatregelen</span><span class="info-value">${measures.join(", ")}</span></div>`;
          } catch { return ""; }
        })() : ""}
        ${property.subsidiesApplied ? (() => {
          try {
            const subsidies = JSON.parse(property.subsidiesApplied) as string[];
            return `<div class="info-row"><span class="info-label">Subsidies aangevraagd</span><span class="info-value">${subsidies.join(", ")}</span></div>`;
          } catch { return ""; }
        })() : ""}
      </div>
    </div>
  </div>
  ` : ""}

  <!-- Woning ScoreTM -->
  <div class="section">
    <div class="section-title">⭐ Comfortabel ScoreTM</div>
    ${latestInspection ? `
    <div class="score-box">
      <div class="grade-circle" style="color:${gradeColor(latestInspection.woningGrade)};border-color:${gradeColor(latestInspection.woningGrade)};background:${gradeColor(latestInspection.woningGrade)}18">
        ${latestInspection.woningGrade || "?"}
      </div>
      <div class="score-bars">
        ${[
          ["Installaties", latestInspection.scoreInstallaties],
          ["Bouwkundig", latestInspection.scoreBouwkundig],
          ["Veiligheid", latestInspection.scoreVeiligheid],
          ["Vocht & Ventilatie", latestInspection.scoreVochtVentilatie],
          ["Energie", latestInspection.scoreEnergie],
        ].map(([label, score]) => {
          const pct = Number(score ?? 0);
          const color = pct >= 85 ? "#16a34a" : pct >= 70 ? "#4ade80" : pct >= 55 ? "#eab308" : pct >= 40 ? "#f97316" : "#ef4444";
          return `<div class="bar-row"><span class="bar-label">${label}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div><span class="bar-value">${score !== null && score !== undefined ? `${score}/100` : "—"}</span></div>`;
        }).join("")}
        <div style="margin-top:10px;font-size:12px;color:#64748b">Totaalscore: <strong style="color:#1E3A5F;font-size:14px">${latestInspection.totalScore ?? "—"}/100</strong> · Inspectie: ${new Date(latestInspection.inspectionDate).toLocaleDateString("nl-NL")}</div>
        ${latestInspection.summary ? `<div style="margin-top:6px;font-size:11px;color:#475569;font-style:italic">${latestInspection.summary}</div>` : ""}
      </div>
    </div>
    ` : `<div class="card" style="color:#94a3b8;font-style:italic;text-align:center;padding:24px">Nog geen inspectie uitgevoerd.</div>`}
  </div>

  <!-- Open onderhoudspunten -->
  ${openIssues.length > 0 ? `
  <div class="section">
    <div class="section-title">🔨 Open Onderhoudspunten (${openIssues.length})</div>
    ${openIssues.map(issue => `
    <div class="issue issue-${issue.priority}">
      <div class="issue-title">${issue.title}</div>
      <div class="issue-meta">
        <span class="tag tag-${issue.priority}">${issue.priority}</span>
        ${issue.category ? ` · ${issue.category}` : ""}
        ${issue.estimatedCost ? ` · ~€${issue.estimatedCost.toLocaleString("nl-NL")}` : ""}
        ${issue.description ? `<br><span style="font-style:italic">${issue.description}</span>` : ""}
      </div>
    </div>`).join("")}
  </div>
  ` : `<div class="section"><div class="section-title">🔨 Onderhoudspunten</div><div class="card" style="color:#16a34a;font-weight:700;text-align:center;padding:16px">✓ Geen open onderhoudspunten</div></div>`}

  <!-- Onderhoudsplanning -->
  ${planning.length > 0 ? `
  <div class="section">
    <div class="section-title">📅 Onderhoudsplanning</div>
    ${planning.map(p => `
    <div class="planning-row">
      <div class="planning-year">${p.plannedYear || "?"}</div>
      <div class="planning-info">
        <div style="font-weight:700;font-size:12px">${p.title}</div>
        ${p.category ? `<div style="font-size:11px;color:#64748b">${p.category}</div>` : ""}
        ${p.description ? `<div style="font-size:11px;color:#475569;margin-top:2px;font-style:italic">${p.description}</div>` : ""}
      </div>
      ${p.estimatedCost ? `<div class="planning-cost">€${p.estimatedCost.toLocaleString("nl-NL")}</div>` : ""}
    </div>`).join("")}
  </div>
  ` : ""}

</div>

<div class="footer">
  <span class="footer-brand">MijnComfortabelTM</span>
  <span>Comfortabel® · Villa Vali Bouwgroep · Vertrouwelijk document</span>
  <span>Gegenereerd: ${new Date().toLocaleDateString("nl-NL")}</span>
</div>
</body></html>`;

    const format = req.query.format === "html" ? "html" : "pdf";
    if (format === "html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(printableHtml(html));

  } catch (err) {
    console.error("Woningpaspoort PDF error:", err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// --- 2. Verduurzamingsadvies Rapport -----------------------------------------

pdfRouter.get("/verduurzaming/:propertyId", async (req, res) => {
  try {
    const ctx = await checkAuth(req as any, res as any);
    if (!ctx.user) return res.status(401).json({ error: "Unauthorized" });

    const propertyId = Number(req.params.propertyId);
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const [property] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
    if (!property) return res.status(404).json({ error: "Property not found" });

    if (!(await canUserAccessProperty(db, { id: ctx.user.id, role: ctx.user.role as AccountRole }, propertyId))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Validation gate (Optie A): reports are locked until Comfortabel validates.
    if (!canUseValidatedFeatures({ accountRole: ctx.user.role as AccountRole, propertyStatus: property.status })) {
      return res.status(403).json({ error: "Dit rapport is beschikbaar zodra Comfortabel uw woning heeft gevalideerd (0-meting).", awaitingValidation: true });
    }

    const displayName = await resolveOwnerName(db, propertyId, property.customerId ?? null);

    // Build property context for LLM
    const propertyContext = `
Woning: ${property.street} ${property.houseNumber}, ${property.postalCode} ${property.city}
Woningtype: ${property.propertyType || "onbekend"}
Bouwjaar: ${property.buildYear || "onbekend"}
Oppervlakte: ${property.surfaceM2 || "onbekend"} m²
Huidig energielabel: ${property.energyLabel || "onbekend"}
Streef-energielabel: ${property.targetEnergyLabel || "niet opgegeven"}
Aardgasvrij doeljaar: ${property.gasVrijDoeljaar || "niet opgegeven"}
Verwarming: ${property.heatingSystem || "onbekend"} (bouwjaar: ${property.heatingYear || "onbekend"})
Warm water: ${property.hotWaterSystem || "onbekend"}
Beglazing: ${property.glazingType || "onbekend"}
Gevelisolatie: ${property.wallInsulation || "onbekend"}
Dakisolatie: ${property.roofInsulation || "onbekend"}
Vloerisolatie: ${property.floorInsulation || "onbekend"}
Zonnepanelen: ${property.hasSolarPanels ? `Ja, ${property.solarPanelCount || "?"} panelen (${property.solarPanelYear || "?"})` : "Nee"}
Laadpaal: ${property.hasEVCharger ? "Ja" : "Nee"}
Aardgasaansluiting: ${property.hasGasConnection ? "Ja" : "Nee"}
Genomen maatregelen: ${property.sustainabilityMeasures || "geen"}
    `.trim();

    const systemPrompt = `Je bent een ervaren energieadviseur gespecialiseerd in woningverduurzaming in Nederland. 
Je schrijft professionele, persoonlijke en praktische adviezen in het Nederlands.
Gebruik altijd concrete Nederlandse bedragen, subsidies (ISDE, SEEH, SVn) en realistische terugverdientijden.
Schrijf in HTML-formaat met <h3>, <h4>, <p>, <ul>, <li>, <strong> tags. Geen markdown.
Wees specifiek en persoonlijk: verwijs naar de specifieke woning en situatie.`;

    const userPrompt = `Schrijf een volledig verduurzamingsadvies rapport voor deze woning:

${propertyContext}

Het rapport moet bevatten:
1. Samenvatting van de huidige energiestatus (2-3 zinnen)
2. Top 5 aanbevolen verduurzamingsmaatregelen, gesorteerd op terugverdientijd (kortste eerst), elk met:
   - Naam van de maatregel
   - Geschatte investering (€)
   - Jaarlijkse besparing (€ en kWh)
   - Terugverdientijd (jaren)
   - Beschikbare subsidies (ISDE, SEEH, etc.) met bedragen
   - Korte uitleg waarom deze maatregel geschikt is voor deze woning
3. Aardgasvrij scenario: hoe kan deze woning aardgasvrij worden en wat kost dat?
4. Conclusie en aanbevolen volgorde van aanpak

Houd het praktisch en actionable. Gebruik realistische Nederlandse marktprijzen van 2024-2025.`;

    const aiContent = await callLLM(systemPrompt, userPrompt);

    const html = `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8">
<title>Verduurzamingsadvies - ${property.street} ${property.houseNumber}</title>
<style>${PDF_STYLES}</style></head><body>

<div class="header">
  <div class="header-logo">MijnComfortabelTM · Verduurzamingsadvies</div>
  <h1>Verduurzamingsadvies Rapport</h1>
  <div class="subtitle">${property.street} ${property.houseNumber}, ${property.postalCode} ${property.city}</div>
  <div class="meta">Eigenaar: ${displayName} · Bouwjaar: ${property.buildYear || "?"} · Huidig label: ${property.energyLabel || "?"}</div>
  <span class="badge">Gegenereerd op ${new Date().toLocaleDateString("nl-NL")}</span>
</div>

<div class="content">

  <div class="highlight-box">
    <h3>📊 Woningprofiel</h3>
    <div class="grid-3">
      <div class="info-row"><span class="info-label">Huidig label</span><span class="info-value"><span class="energy-badge" style="background:${labelColor(property.energyLabel)};color:white">${property.energyLabel || "?"}</span></span></div>
      <div class="info-row"><span class="info-label">Streef-label</span><span class="info-value"><span class="energy-badge" style="background:${labelColor(property.targetEnergyLabel)};color:white">${property.targetEnergyLabel || "A"}</span></span></div>
      <div class="info-row"><span class="info-label">Aardgasvrij</span><span class="info-value">${property.gasVrijDoeljaar || "Nog niet bepaald"}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">🌱 Persoonlijk Verduurzamingsadvies</div>
    <div class="ai-content">${aiContent}</div>
  </div>

  <div class="section">
    <div class="section-title">🔗 Nuttige Links & Vervolgstappen</div>
    <div class="grid-2">
      ${[
        ["ISDE Subsidie aanvragen", "rvo.nl/subsidies-financiering/isde"],
        ["Energielabel opvragen", "ep-online.nl"],
        ["SVn Stimuleringslening", "svn.nl/stimuleringslening"],
        ["Duurzaam Bouwloket", "duurzaambouwloket.nl"],
        ["Warmtefonds", "warmtefonds.nl"],
        ["Milieucentraal Energietips", "milieucentraal.nl"],
      ].map(([name, url]) => `<div class="info-row"><span class="info-label">${name}</span><span class="info-value" style="color:#1d4ed8;font-size:11px">${url}</span></div>`).join("")}
    </div>
  </div>

</div>

<div class="footer">
  <span class="footer-brand">MijnComfortabelTM</span>
  <span>AI-gegenereerd advies op basis van woningpaspoort · Raadpleeg altijd een gecertificeerd energieadviseur</span>
  <span>${new Date().toLocaleDateString("nl-NL")}</span>
</div>
</body></html>`;

    const format = req.query.format === "html" ? "html" : "pdf";
    if (format === "html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(printableHtml(html));

  } catch (err) {
    console.error("Verduurzaming rapport error:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// --- 3. Subsidie Berekening Rapport ------------------------------------------

pdfRouter.get("/subsidies/:propertyId", async (req, res) => {
  try {
    const ctx = await checkAuth(req as any, res as any);
    if (!ctx.user) return res.status(401).json({ error: "Unauthorized" });

    const propertyId = Number(req.params.propertyId);
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const [property] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
    if (!property) return res.status(404).json({ error: "Property not found" });

    if (!(await canUserAccessProperty(db, { id: ctx.user.id, role: ctx.user.role as AccountRole }, propertyId))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Validation gate (Optie A): reports are locked until Comfortabel validates.
    if (!canUseValidatedFeatures({ accountRole: ctx.user.role as AccountRole, propertyStatus: property.status })) {
      return res.status(403).json({ error: "Dit rapport is beschikbaar zodra Comfortabel uw woning heeft gevalideerd (0-meting).", awaitingValidation: true });
    }

    const displayName = await resolveOwnerName(db, propertyId, property.customerId ?? null);

    const propertyContext = `
Woning: ${property.street} ${property.houseNumber}, ${property.postalCode} ${property.city}
Woningtype: ${property.propertyType || "onbekend"}
Bouwjaar: ${property.buildYear || "onbekend"}
Huidig energielabel: ${property.energyLabel || "onbekend"}
Verwarming: ${property.heatingSystem || "onbekend"}
Warm water: ${property.hotWaterSystem || "onbekend"}
Beglazing: ${property.glazingType || "onbekend"}
Gevelisolatie: ${property.wallInsulation || "onbekend"}
Dakisolatie: ${property.roofInsulation || "onbekend"}
Vloerisolatie: ${property.floorInsulation || "onbekend"}
Zonnepanelen: ${property.hasSolarPanels ? `Ja, ${property.solarPanelCount || "?"} panelen` : "Nee"}
Aardgasaansluiting: ${property.hasGasConnection ? "Ja" : "Nee"}
Eigendomsvorm: ${property.ownershipType || "volle_eigendom"}
    `.trim();

    const systemPrompt = `Je bent een subsidie-expert gespecialiseerd in Nederlandse woningsubsidies voor verduurzaming.
Je schrijft nauwkeurige, actuele subsidieberekeningen in het Nederlands.
Gebruik actuele 2024-2025 subsidiebedragen van ISDE, SEEH, SVn en gemeentelijke regelingen.
Schrijf in HTML-formaat met <h3>, <h4>, <p>, <ul>, <li>, <strong> tags. Geen markdown.
Wees specifiek: noem exacte bedragen, percentages en voorwaarden.`;

    const userPrompt = `Maak een gedetailleerde subsidieberekening voor deze woning:

${propertyContext}

Het rapport moet bevatten:
1. Overzicht van alle subsidies waarvoor deze woning in aanmerking komt, met voor elke subsidie:
   - Naam van de subsidie (ISDE, SEEH, SVn Stimuleringslening, etc.)
   - Beschrijving van de maatregel
   - Maximaal subsidiebedrag (€)
   - Voorwaarden en vereisten
   - Hoe aan te vragen (instantie + website)
2. Totaaloverzicht: som van alle beschikbare subsidies
3. Praktische aanvraagvolgorde: welke subsidie eerst aanvragen?
4. Belangrijke deadlines of tijdelijke regelingen

Gebruik actuele Nederlandse subsidiebedragen van 2024-2025. Wees specifiek en realistisch.`;

    const aiContent = await callLLM(systemPrompt, userPrompt);

    const html = `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8">
<title>Subsidie Berekening - ${property.street} ${property.houseNumber}</title>
<style>${PDF_STYLES}</style></head><body>

<div class="header">
  <div class="header-logo">MijnComfortabelTM · Subsidie Berekening</div>
  <h1>Subsidie Berekening Rapport</h1>
  <div class="subtitle">${property.street} ${property.houseNumber}, ${property.postalCode} ${property.city}</div>
  <div class="meta">Eigenaar: ${displayName} · Energielabel: ${property.energyLabel || "?"} · Verwarming: ${property.heatingSystem || "?"}</div>
  <span class="badge">Gegenereerd op ${new Date().toLocaleDateString("nl-NL")}</span>
</div>

<div class="content">

  <div class="highlight-box">
    <h3>💡 Woningprofiel voor Subsidieberekening</h3>
    <div class="grid-2">
      ${[
        ["Woningtype", property.propertyType || "—"],
        ["Bouwjaar", property.buildYear?.toString() || "—"],
        ["Energielabel", property.energyLabel || "—"],
        ["Verwarming", property.heatingSystem || "—"],
        ["Eigendomsvorm", property.ownershipType || "volle eigendom"],
        ["Aardgasaansluiting", property.hasGasConnection ? "Ja" : "Nee"],
      ].map(([l, v]) => `<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`).join("")}
    </div>
  </div>

  <div class="section">
    <div class="section-title">💰 Beschikbare Subsidies & Berekening</div>
    <div class="ai-content">${aiContent}</div>
  </div>

  <div class="section">
    <div class="section-title">🔗 Subsidie Aanvragen</div>
    <div class="grid-2">
      ${[
        ["ISDE (RVO)", "rvo.nl/subsidies-financiering/isde"],
        ["SEEH (RVO)", "rvo.nl/subsidies-financiering/seeh"],
        ["SVn Stimuleringslening", "svn.nl"],
        ["Warmtefonds", "warmtefonds.nl"],
        ["Mijn Overheid Subsidies", "mijnoverheid.nl"],
        ["Subsidiewijzer", "subsidiewijzer.nl"],
      ].map(([name, url]) => `<div class="info-row"><span class="info-label">${name}</span><span class="info-value" style="color:#1d4ed8;font-size:11px">${url}</span></div>`).join("")}
    </div>
  </div>

</div>

<div class="footer">
  <span class="footer-brand">MijnComfortabelTM</span>
  <span>AI-gegenereerde berekening · Subsidiebedragen kunnen wijzigen · Raadpleeg rvo.nl voor actuele bedragen</span>
  <span>${new Date().toLocaleDateString("nl-NL")}</span>
</div>
</body></html>`;

    const format = req.query.format === "html" ? "html" : "pdf";
    if (format === "html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(printableHtml(html));

  } catch (err) {
    console.error("Subsidies rapport error:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// --- 4. Jaarlijks Onderhoudsrapport -------------------------------------------

pdfRouter.get("/onderhoudsrapport/:propertyId", async (req, res) => {
  try {
    const ctx = await checkAuth(req as any, res as any);
    if (!ctx.user) return res.status(401).json({ error: "Unauthorized" });

    const propertyId = Number(req.params.propertyId);
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const [property] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
    if (!property) return res.status(404).json({ error: "Property not found" });

    if (!(await canUserAccessProperty(db, { id: ctx.user.id, role: ctx.user.role as AccountRole }, propertyId))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Validation gate (Optie A): reports are locked until Comfortabel validates.
    if (!canUseValidatedFeatures({ accountRole: ctx.user.role as AccountRole, propertyStatus: property.status })) {
      return res.status(403).json({ error: "Dit rapport is beschikbaar zodra Comfortabel uw woning heeft gevalideerd (0-meting).", awaitingValidation: true });
    }

    const issueRows = await db.select().from(maintenanceIssues)
      .where(eq(maintenanceIssues.propertyId, propertyId))
      .orderBy(desc(maintenanceIssues.createdAt));
    const planningRows = await db.select().from(maintenancePlanning)
      .where(eq(maintenancePlanning.propertyId, propertyId))
      .orderBy(asc(maintenancePlanning.plannedYear));

    const year = new Date().getFullYear();
    const openIssues = issueRows.filter(i => i.status !== "afgerond");
    const resolvedIssues = issueRows.filter(i => i.status === "afgerond");
    const totalEstimated = issueRows.reduce((s, i) => s + (i.estimatedCost || 0), 0);
    const urgentCount = openIssues.filter(i => i.priority === "urgent").length;
    const hoogCount = openIssues.filter(i => i.priority === "hoog").length;

    const priorityColor = (p: string) =>
      p === "urgent" ? "#dc2626" : p === "hoog" ? "#ea580c" : p === "normaal" ? "#2563eb" : "#64748b";
    const statusLabel = (s: string) =>
      s === "open" ? "Open" : s === "in_behandeling" ? "In behandeling" : s === "gepland" ? "Gepland" : "Afgerond";
    const horizonLabel = (h: string) =>
      h === "1jaar" ? "1 jaar" : h === "3jaar" ? "3 jaar" : h === "5jaar" ? "5 jaar" : h === "10jaar" ? "10 jaar" : "MJOP";

    const html = `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8">
<title>Jaarlijks Onderhoudsrapport ${year} - ${property.street} ${property.houseNumber}</title>
<style>${PDF_STYLES}</style></head><body>
<div class="header">
  <div class="header-logo">MijnComfortabelTM - Jaarlijks Onderhoudsrapport</div>
  <h1>${property.street} ${property.houseNumber}</h1>
  <div class="subtitle">${property.postalCode} ${property.city}</div>
  <div class="meta">Rapportjaar: ${year}</div>
  <span class="badge">Gegenereerd op ${new Date().toLocaleDateString("nl-NL")}</span>
</div>
<div class="content">

  <div class="section">
    <div class="section-title">Samenvatting ${year}</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:8px">
      <div style="background:#fef2f2;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#dc2626">${urgentCount}</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px">Urgent</div>
      </div>
      <div style="background:#fff7ed;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#ea580c">${hoogCount}</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px">Hoog</div>
      </div>
      <div style="background:#f0fdf4;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#16a34a">${resolvedIssues.length}</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px">Afgerond</div>
      </div>
      <div style="background:#f8fafc;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:22px;font-weight:900;color:#1E3A5F">${totalEstimated > 0 ? "EUR" + totalEstimated.toLocaleString("nl-NL", {minimumFractionDigits:0,maximumFractionDigits:0}) : "EUR0"}</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px">Geschatte kosten</div>
      </div>
    </div>
  </div>

  ${openIssues.length > 0 ? `
  <div class="section">
    <div class="section-title">Open onderhoudspunten (${openIssues.length})</div>
    ${openIssues.map(issue => `
    <div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <div style="font-size:13px;font-weight:700;color:#1e293b">${issue.title}</div>
        <div style="display:flex;gap:6px">
          <span style="font-size:10px;font-weight:700;color:${priorityColor(issue.priority)};background:${priorityColor(issue.priority)}18;padding:2px 8px;border-radius:20px">${issue.priority.toUpperCase()}</span>
          <span style="font-size:10px;color:#64748b;background:#f1f5f9;padding:2px 8px;border-radius:20px">${statusLabel(issue.status)}</span>
        </div>
      </div>
      ${issue.description ? `<div style="font-size:11px;color:#64748b;margin-bottom:6px">${issue.description}</div>` : ""}
      <div style="display:flex;gap:16px;font-size:11px;color:#94a3b8">
        ${issue.category ? `<span>Categorie: ${issue.category}</span>` : ""}
        ${issue.estimatedCost ? `<span>Geschat: EUR${issue.estimatedCost.toLocaleString("nl-NL")}</span>` : ""}
        ${issue.dueDate ? `<span>Deadline: ${new Date(issue.dueDate).toLocaleDateString("nl-NL")}</span>` : ""}
      </div>
    </div>`).join("")}
  </div>` : `<div class="section"><div class="section-title">Open onderhoudspunten</div><div style="text-align:center;padding:20px;color:#94a3b8;font-size:13px">Geen open onderhoudspunten - uitstekend!</div></div>`}

  ${planningRows.length > 0 ? `
  <div class="section">
    <div class="section-title">Meerjarenplanning</div>
    ${planningRows.map(p => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9">
      <div>
        <div style="font-size:13px;font-weight:600;color:#1e293b">${p.title}</div>
        ${p.category ? `<div style="font-size:11px;color:#94a3b8">${p.category}</div>` : ""}
      </div>
      <div style="text-align:right">
        <div style="font-size:12px;font-weight:700;color:#1E3A5F">${p.plannedYear || "N.v.t."}</div>
        <div style="font-size:11px;color:#64748b">${horizonLabel(p.horizon || "3jaar")} ${p.estimatedCost ? "- EUR" + p.estimatedCost.toLocaleString("nl-NL") : ""}</div>
      </div>
    </div>`).join("")}
  </div>` : ""}

  ${resolvedIssues.length > 0 ? `
  <div class="section">
    <div class="section-title">Afgeronde onderhoudspunten (${resolvedIssues.length})</div>
    ${resolvedIssues.slice(0, 10).map(issue => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9">
      <div style="font-size:12px;color:#64748b">${issue.title}</div>
      <div style="display:flex;gap:8px;align-items:center">
        ${issue.estimatedCost ? `<span style="font-size:11px;color:#94a3b8">EUR${issue.estimatedCost.toLocaleString("nl-NL")}</span>` : ""}
        <span style="font-size:10px;color:#16a34a;background:#f0fdf4;padding:2px 8px;border-radius:20px">Afgerond</span>
      </div>
    </div>`).join("")}
  </div>` : ""}

</div>
<div class="footer">
  <span class="footer-brand">MijnComfortabelTM</span>
  <span>Jaarlijks Onderhoudsrapport ${year} - Vertrouwelijk document</span>
  <span>${new Date().toLocaleDateString("nl-NL")}</span>
</div>
</body></html>`;

    const format = req.query.format === "html" ? "html" : "pdf";
    if (format === "html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(printableHtml(html));
  } catch (err) {
    console.error("Onderhoudsrapport error:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// --- 5. Technisch Inspectierapport -------------------------------------------

pdfRouter.get("/inspectierapport/:propertyId", async (req, res) => {
  try {
    const ctx = await checkAuth(req as any, res as any);
    if (!ctx.user) return res.status(401).json({ error: "Unauthorized" });

    const propertyId = Number(req.params.propertyId);
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const [property] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
    if (!property) return res.status(404).json({ error: "Property not found" });

    if (!(await canUserAccessProperty(db, { id: ctx.user.id, role: ctx.user.role as AccountRole }, propertyId))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Validation gate (Optie A): reports are locked until Comfortabel validates.
    if (!canUseValidatedFeatures({ accountRole: ctx.user.role as AccountRole, propertyStatus: property.status })) {
      return res.status(403).json({ error: "Dit rapport is beschikbaar zodra Comfortabel uw woning heeft gevalideerd (0-meting).", awaitingValidation: true });
    }

    const inspectionRows = await db.select().from(inspections)
      .where(eq(inspections.propertyId, propertyId))
      .orderBy(desc(inspections.inspectionDate));
    const latestInspection = inspectionRows[0];

    if (!latestInspection) {
      return res.status(404).json({ error: "Geen inspectie gevonden" });
    }

    const itemRows = await db.select().from(inspectionItems)
      .where(eq(inspectionItems.inspectionId, latestInspection.id));

    const byCategory: Record<string, typeof itemRows> = {};
    for (const item of itemRows) {
      const cat = item.category || "Overig";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(item);
    }

    const scoreColor = (s: number | null | undefined) => {
      if (!s) return "#94a3b8";
      if (s >= 8) return "#16a34a";
      if (s >= 6) return "#ca8a04";
      if (s >= 4) return "#ea580c";
      return "#dc2626";
    };

    const scores = [
      { label: "Installaties", score: latestInspection.scoreInstallaties },
      { label: "Bouwkundig", score: latestInspection.scoreBouwkundig },
      { label: "Veiligheid", score: latestInspection.scoreVeiligheid },
      { label: "Vocht & Ventilatie", score: latestInspection.scoreVochtVentilatie },
      { label: "Energie", score: latestInspection.scoreEnergie },
    ];

    const html = `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8">
<title>Technisch Inspectierapport - ${property.street} ${property.houseNumber}</title>
<style>${PDF_STYLES}</style></head><body>
<div class="header">
  <div class="header-logo">MijnComfortabelTM - Technisch Inspectierapport</div>
  <h1>${property.street} ${property.houseNumber}</h1>
  <div class="subtitle">${property.postalCode} ${property.city}</div>
  <div class="meta">Inspectiedatum: ${new Date(latestInspection.inspectionDate).toLocaleDateString("nl-NL")} - Comfortabel Technisch Beheer</div>
  <span class="badge">Gegenereerd op ${new Date().toLocaleDateString("nl-NL")}</span>
</div>
<div class="content">

  <div class="section">
    <div class="section-title">Woning Score</div>
    <div class="score-box">
      <div class="grade-circle" style="background:${gradeColor(latestInspection.woningGrade)};color:white;border:none">
        ${latestInspection.woningGrade || "?"}
      </div>
      <div class="score-bars">
        ${scores.map(s => `
        <div class="bar-row">
          <span class="bar-label">${s.label}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width:${s.score ? s.score * 10 : 0}%;background:${scoreColor(s.score)}"></div>
          </div>
          <span class="bar-value" style="color:${scoreColor(s.score)}">${s.score ?? "—"}/10</span>
        </div>`).join("")}
      </div>
      <div style="text-align:center;min-width:80px">
        <div style="font-size:32px;font-weight:900;color:#1E3A5F">${latestInspection.totalScore ?? "—"}</div>
        <div style="font-size:11px;color:#64748b">Totaalscore</div>
      </div>
    </div>
  </div>

  ${Object.entries(byCategory).map(([cat, items]) => `
  <div class="section">
    <div class="section-title">${cat}</div>
    ${items.map(item => `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid #f1f5f9">
      <div style="flex:1">
        <div style="font-size:12px;font-weight:600;color:#1e293b">${item.subcategory || item.category}</div>
        ${item.notes ? `<div style="font-size:11px;color:#64748b;margin-top:3px">${item.notes}</div>` : ""}
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;margin-left:12px">
        ${item.answer && item.answer !== "onbekend" ? `<span style="font-size:10px;font-weight:700;color:${item.answer === "goed" ? "#16a34a" : item.answer === "urgent" ? "#dc2626" : item.answer === "aandacht" ? "#ea580c" : "#94a3b8"};background:${item.answer === "goed" ? "#f0fdf4" : item.answer === "urgent" ? "#fef2f2" : item.answer === "aandacht" ? "#fff7ed" : "#f8fafc"};padding:2px 8px;border-radius:20px">${item.answer.charAt(0).toUpperCase() + item.answer.slice(1)}</span>` : ""}
      </div>
    </div>`).join("")}
  </div>`).join("")}

  ${latestInspection.summary ? `
  <div class="section">
    <div class="section-title">Samenvatting & Aanbevelingen</div>
    <div style="font-size:12px;color:#475569;line-height:1.6;white-space:pre-wrap">${latestInspection.summary}</div>
  </div>` : ""}

</div>
<div class="footer">
  <span class="footer-brand">MijnComfortabelTM</span>
  <span>Technisch Inspectierapport - Vertrouwelijk document</span>
  <span>${new Date().toLocaleDateString("nl-NL")}</span>
</div>
</body></html>`;

    const format = req.query.format === "html" ? "html" : "pdf";
    if (format === "html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(printableHtml(html));
  } catch (err) {
    console.error("Inspectierapport error:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});
