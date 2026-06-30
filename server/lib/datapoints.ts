/**
 * Trojan Horse — Property Data Points Sync Helper
 *
 * Translates flat `properties` column updates into structured datapunten
 * in the `propertyDataPoints` table. This runs in parallel with every
 * property write so that Fase 2 can migrate the UI to a pure datapunt-
 * renderer without needing a data migration.
 *
 * Usage:
 *   await syncPropertyDataPoints(db, propertyId, updatedFields, userId);
 *
 * Design principles:
 * - Never throws — failures are logged but never block the main write.
 * - Upsert semantics: one row per (propertyId, component). On re-submit
 *   the existing row is updated so history stays clean.
 * - Source defaults to "klant"; pass a different source for staff/AI writes.
 */

import { getDb } from "../db";
import { propertyDataPoints } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ─── Field map ────────────────────────────────────────────────────────────────
// Maps every property column to its datapunt metadata.
// category → WoningPaspoort blok
// label    → human-readable Dutch label
// unit     → optional unit suffix

type FieldMeta = {
  category: string;
  label: string;
  unit?: string;
};

const FIELD_MAP: Record<string, FieldMeta> = {
  // ── Identiteit ──────────────────────────────────────────────────────────
  street:           { category: "identiteit", label: "Straat" },
  houseNumber:      { category: "identiteit", label: "Huisnummer" },
  addition:         { category: "identiteit", label: "Toevoeging" },
  houseLetter:      { category: "identiteit", label: "Huisletter" },
  postalCode:       { category: "identiteit", label: "Postcode" },
  city:             { category: "identiteit", label: "Plaats" },
  buildYear:        { category: "identiteit", label: "Bouwjaar", unit: "jaar" },
  propertyType:     { category: "identiteit", label: "Woningtype" },
  surfaceM2:        { category: "identiteit", label: "Woonoppervlak", unit: "m²" },
  residents:        { category: "identiteit", label: "Aantal bewoners" },
  energyLabel:      { category: "identiteit", label: "Energielabel" },

  // ── Waarde & Financieel ─────────────────────────────────────────────────
  wozValue:         { category: "waarde_financieel", label: "WOZ-waarde", unit: "€" },
  wozYear:          { category: "waarde_financieel", label: "WOZ-peiljaar", unit: "jaar" },
  purchasePrice:    { category: "waarde_financieel", label: "Koopsom", unit: "€" },
  purchaseYear:     { category: "waarde_financieel", label: "Aankoopjaar", unit: "jaar" },
  vveContribution:  { category: "waarde_financieel", label: "VvE-bijdrage", unit: "€/mnd" },
  mortgageProvider: { category: "waarde_financieel", label: "Hypotheekverstrekker" },
  erfpachtCanon:    { category: "waarde_financieel", label: "Erfpachtcanon", unit: "€/jaar" },
  insuranceExpiry:  { category: "waarde_financieel", label: "Vervaldatum opstalverzekering" },

  // ── Juridisch & Omgeving ────────────────────────────────────────────────
  ownershipType:        { category: "juridisch_omgeving", label: "Eigendomsvorm" },
  kadastraleAanduiding: { category: "juridisch_omgeving", label: "Kadastrale aanduiding" },
  isMonument:           { category: "juridisch_omgeving", label: "Monument" },
  monumentType:         { category: "juridisch_omgeving", label: "Monumenttype" },
  hasErfpacht:          { category: "juridisch_omgeving", label: "Erfpacht" },
  hasBeslag:            { category: "juridisch_omgeving", label: "Beslag of hypotheekrecht" },
  bestemmingCategory:   { category: "juridisch_omgeving", label: "Bestemmingscategorie" },
  buurtCode:            { category: "juridisch_omgeving", label: "Buurtcode" },
  wijk:                 { category: "juridisch_omgeving", label: "Wijk" },

  // ── Technische Kenmerken ────────────────────────────────────────────────
  foundationType:   { category: "technisch", label: "Funderingstype" },
  roofType:         { category: "technisch", label: "Daktype" },
  roofMaterial:     { category: "technisch", label: "Dakmateriaal" },
  wallType:         { category: "technisch", label: "Geveltype" },
  heatingSystem:    { category: "technisch", label: "Verwarmingssysteem" },
  heatingYear:      { category: "technisch", label: "Bouwjaar verwarming", unit: "jaar" },
  hotWaterSystem:   { category: "technisch", label: "Warmwatersysteem" },
  hasSolarPanels:   { category: "technisch", label: "Zonnepanelen" },
  solarPanelCount:  { category: "technisch", label: "Aantal zonnepanelen" },
  solarPanelYear:   { category: "technisch", label: "Plaatsingsjaar zonnepanelen", unit: "jaar" },
  hasEVCharger:     { category: "technisch", label: "Laadpaal EV" },
  hasGasConnection: { category: "technisch", label: "Gasaansluiting" },
  glazingType:      { category: "technisch", label: "Beglazing" },
  wallInsulation:   { category: "technisch", label: "Gevelisolatie" },
  roofInsulation:   { category: "technisch", label: "Dakisolatie" },
  floorInsulation:  { category: "technisch", label: "Vloerisolatie" },

  // ── Verduurzaming & Ambities ────────────────────────────────────────────
  targetEnergyLabel:      { category: "verduurzaming", label: "Streef-energielabel" },
  gasVrijDoeljaar:        { category: "verduurzaming", label: "Doeljaar aardgasvrij", unit: "jaar" },
  sustainabilityMeasures: { category: "verduurzaming", label: "Genomen duurzaamheidsmaatregelen" },
  subsidiesApplied:       { category: "verduurzaming", label: "Aangevraagde subsidies" },
};

// ─── Source type ─────────────────────────────────────────────────────────────
export type DataPointSource =
  | "klant"
  | "telefoon_intake"
  | "ai"
  | "foto"
  | "comfortabel"
  | "specialist"
  | "bag"
  | "import";

// ─── Main sync function ───────────────────────────────────────────────────────
/**
 * Syncs a partial property update to propertyDataPoints.
 * Call this after every successful property write.
 *
 * @param propertyId  - The property being updated
 * @param fields      - Partial property object with only the changed fields
 * @param userId      - The user performing the write (for createdBy)
 * @param source      - Intake channel (default: "klant")
 * @param confidence  - Confidence score 0–100 (default: 50 for klant)
 */
export async function syncPropertyDataPoints(
  propertyId: number,
  fields: Record<string, unknown>,
  userId: number,
  source: DataPointSource = "klant",
  confidence = 50,
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return; // DB unavailable — skip silently

    const upserts: Promise<unknown>[] = [];

    for (const [component, rawValue] of Object.entries(fields)) {
      const meta = FIELD_MAP[component];
      if (!meta) continue; // skip internal/system fields not in the map
      if (rawValue === undefined || rawValue === null) continue; // skip nulls

      const value = String(rawValue);

      // Upsert: check if a row exists for this (propertyId, component)
      const existing = await db
        .select({ id: propertyDataPoints.id })
        .from(propertyDataPoints)
        .where(
          and(
            eq(propertyDataPoints.propertyId, propertyId),
            eq(propertyDataPoints.component, component),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        upserts.push(
          db
            .update(propertyDataPoints)
            .set({
              value,
              source,
              confidence,
              updatedAt: new Date(),
            })
            .where(eq(propertyDataPoints.id, existing[0].id)),
        );
      } else {
        upserts.push(
          db.insert(propertyDataPoints).values({
            propertyId,
            category: meta.category,
            component,
            label: meta.label,
            unit: meta.unit,
            value,
            source,
            confidence,
            verificationStatus: source === "comfortabel" || source === "specialist"
              ? "physically_verified"
              : source === "ai" || source === "foto"
              ? "ai_inferred"
              : "self_reported",
            createdBy: userId,
          }),
        );
      }
    }

    await Promise.all(upserts);
  } catch (err) {
    // Never block the main write — log and continue
    console.error("[datapoints] sync failed:", err);
  }
}

// ─── Convenience: sync full property on creation ─────────────────────────────
/**
 * Syncs all non-null fields of a newly created property.
 * Call this once after createOrClaim succeeds.
 */
export async function syncNewProperty(
  propertyId: number,
  propertyFields: Record<string, unknown>,
  userId: number,
): Promise<void> {
  return syncPropertyDataPoints(propertyId, propertyFields, userId, "klant", 50);
}
