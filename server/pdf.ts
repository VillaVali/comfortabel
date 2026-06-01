import { Router } from "express";
import { getDb } from "./db";
import { customers, properties, inspections, inspectionItems, maintenanceIssues, maintenancePlanning } from "../drizzle/schema";
import { eq, desc, asc } from "drizzle-orm";
import { createContext } from "./context";

export const pdfRouter = Router();

// Simple HTML-to-PDF using inline HTML (no external dependencies needed)
pdfRouter.get("/woningpaspoort/:propertyId", async (req, res) => {
  try {
    // Auth check
    const ctx = await createContext({ req: req as any, res: res as any });
    if (!ctx.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const propertyId = Number(req.params.propertyId);
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    // Fetch all data
    const [property] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
    if (!property) return res.status(404).json({ error: "Property not found" });

    // Access check for non-admin
    if (ctx.user.role !== "admin") {
      const custRows = await db.select().from(customers).where(eq(customers.userId, ctx.user.id)).limit(1);
      if (!custRows[0] || custRows[0].id !== property.customerId) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const [customer] = await db.select().from(customers).where(eq(customers.id, property.customerId)).limit(1);
    const allInspections = await db.select().from(inspections).where(eq(inspections.propertyId, propertyId)).orderBy(desc(inspections.inspectionDate));
    const latestInspection = allInspections.find(i => i.status === "afgerond");
    const issues = await db.select().from(maintenanceIssues).where(eq(maintenanceIssues.propertyId, propertyId));
    const planning = await db.select().from(maintenancePlanning).where(eq(maintenancePlanning.propertyId, propertyId)).orderBy(asc(maintenancePlanning.plannedYear));

    const openIssues = issues.filter(i => i.status !== "afgerond");
    const urgentIssues = openIssues.filter(i => i.priority === "urgent");

    const displayName = customer
      ? (customer.type === "bedrijf" || customer.type === "vastgoed")
        ? customer.companyName || ""
        : `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
      : "Onbekend";

    const gradeColor = (grade?: string | null) => {
      if (!grade) return "#94a3b8";
      const map: Record<string, string> = { A: "#16a34a", B: "#4ade80", C: "#eab308", D: "#f97316", E: "#ef4444" };
      return map[grade] || "#94a3b8";
    };

    const html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<title>Woningpaspoort™ - ${property.street} ${property.houseNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; background: #fff; font-size: 13px; line-height: 1.5; }
  .header { background: #1E3A5F; color: white; padding: 32px 40px; }
  .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .header p { color: rgba(255,255,255,0.7); font-size: 13px; }
  .badge { display: inline-block; background: #C9A84C; color: #1E3A5F; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px; }
  .content { padding: 32px 40px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 14px; font-weight: 700; color: #1E3A5F; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
  .info-label { color: #64748b; }
  .info-value { font-weight: 600; text-align: right; }
  .score-box { display: flex; align-items: center; gap: 16px; padding: 16px; background: #f8fafc; border-radius: 10px; margin-bottom: 16px; }
  .grade { width: 64px; height: 64px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 900; border: 3px solid currentColor; }
  .score-bars { flex: 1; }
  .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
  .bar-label { width: 140px; font-size: 12px; color: #64748b; }
  .bar-track { flex: 1; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 3px; }
  .bar-value { width: 40px; text-align: right; font-size: 11px; font-weight: 600; color: #475569; }
  .issue { padding: 10px 14px; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid; }
  .issue-urgent { background: #fef2f2; border-color: #ef4444; }
  .issue-hoog { background: #fff7ed; border-color: #f97316; }
  .issue-normaal { background: #f0f9ff; border-color: #0ea5e9; }
  .issue-laag { background: #f8fafc; border-color: #94a3b8; }
  .issue-title { font-weight: 600; font-size: 13px; }
  .issue-meta { font-size: 11px; color: #64748b; margin-top: 2px; }
  .planning-row { display: flex; align-items: flex-start; gap: 16px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
  .planning-year { width: 48px; font-size: 16px; font-weight: 700; color: #1E3A5F; }
  .planning-info { flex: 1; }
  .planning-cost { font-weight: 600; color: #1e293b; }
  .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 40px; text-align: center; color: #94a3b8; font-size: 11px; margin-top: 20px; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .tag-urgent { background: #fef2f2; color: #ef4444; }
  .tag-hoog { background: #fff7ed; color: #f97316; }
  .tag-normaal { background: #f0f9ff; color: #0ea5e9; }
  .tag-laag { background: #f8fafc; color: #94a3b8; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="header">
  <h1>Comfortabel Woningpaspoort™</h1>
  <p>${property.street} ${property.houseNumber} · ${property.postalCode} ${property.city}</p>
  <p>Eigenaar: ${displayName}</p>
  <span class="badge">Gegenereerd op ${new Date().toLocaleDateString("nl-NL")}</span>
</div>

<div class="content">
  <!-- Woninggegevens -->
  <div class="section">
    <div class="section-title">Woninggegevens</div>
    <div class="grid-2">
      <div>
        ${[
          ["Adres", `${property.street} ${property.houseNumber}`],
          ["Postcode & Stad", `${property.postalCode} ${property.city}`],
          ["Type woning", property.propertyType || "—"],
          ["Bouwjaar", property.buildYear?.toString() || "—"],
        ].map(([l, v]) => `<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`).join("")}
      </div>
      <div>
        ${[
          ["Oppervlakte", property.surfaceM2 ? `${property.surfaceM2} m²` : "—"],
          ["Bewoners", property.residents?.toString() || "—"],
          ["Energielabel", property.energyLabel || "—"],
          ["Abonnement", property.subscriptionType || "—"],
        ].map(([l, v]) => `<div class="info-row"><span class="info-label">${l}</span><span class="info-value">${v}</span></div>`).join("")}
      </div>
    </div>
  </div>

  <!-- Woning Score -->
  <div class="section">
    <div class="section-title">Woning Score™</div>
    ${latestInspection ? `
    <div class="score-box">
      <div class="grade" style="color: ${gradeColor(latestInspection.woningGrade)}; border-color: ${gradeColor(latestInspection.woningGrade)}; background: ${gradeColor(latestInspection.woningGrade)}15">
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
          return `<div class="bar-row">
            <span class="bar-label">${label}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
            <span class="bar-value">${score !== null && score !== undefined ? `${score}/100` : "—"}</span>
          </div>`;
        }).join("")}
        <div style="margin-top:8px;font-size:12px;color:#64748b">Totaalscore: <strong style="color:#1E3A5F">${latestInspection.totalScore ?? "—"}/100</strong> · Inspectie: ${new Date(latestInspection.inspectionDate).toLocaleDateString("nl-NL")}</div>
        ${latestInspection.summary ? `<div style="margin-top:6px;font-size:12px;color:#475569;font-style:italic">${latestInspection.summary}</div>` : ""}
      </div>
    </div>
    ` : `<p style="color:#94a3b8;font-style:italic">Nog geen inspectie uitgevoerd.</p>`}
  </div>

  <!-- Open onderhoudspunten -->
  ${openIssues.length > 0 ? `
  <div class="section">
    <div class="section-title">Open onderhoudspunten (${openIssues.length})</div>
    ${openIssues.map(issue => `
    <div class="issue issue-${issue.priority}">
      <div class="issue-title">${issue.title}</div>
      <div class="issue-meta">
        <span class="tag tag-${issue.priority}">${issue.priority}</span>
        ${issue.category ? ` · ${issue.category}` : ""}
        ${issue.estimatedCost ? ` · ~€${issue.estimatedCost.toLocaleString("nl-NL")}` : ""}
        ${issue.description ? `<br>${issue.description}` : ""}
      </div>
    </div>
    `).join("")}
  </div>
  ` : `<div class="section"><div class="section-title">Onderhoudspunten</div><p style="color:#16a34a;font-weight:600">✓ Geen open onderhoudspunten</p></div>`}

  <!-- Onderhoudsplanning -->
  ${planning.length > 0 ? `
  <div class="section">
    <div class="section-title">Onderhoudsplanning</div>
    ${planning.map(p => `
    <div class="planning-row">
      <div class="planning-year">${p.plannedYear || "?"}</div>
      <div class="planning-info">
        <div style="font-weight:600">${p.title}</div>
        ${p.category ? `<div style="font-size:11px;color:#64748b">${p.category}</div>` : ""}
        ${p.description ? `<div style="font-size:12px;color:#475569;margin-top:2px">${p.description}</div>` : ""}
      </div>
      ${p.estimatedCost ? `<div class="planning-cost">€${p.estimatedCost.toLocaleString("nl-NL")}</div>` : ""}
    </div>
    `).join("")}
  </div>
  ` : ""}
</div>

<div class="footer">
  Comfortabel® — Villa Vali Bouwgroep · MijnComfortabel Woningpaspoort™ · Vertrouwelijk document
</div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="woningpaspoort-${propertyId}.html"`);
    res.send(html);
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});
