// ─────────────────────────────────────────────────────────────────────────────
// MijnComfortabel 1.0 — Pure passport logic
//
// This module contains DETERMINISTIC, side-effect-free helpers that encode the
// core security and data-integrity rules of the 1.0 architecture. They are pure
// functions so they can be unit-tested without a database (test-first), and they
// are reused by tRPC procedures (server-side enforcement layer).
//
// Three-layer rights enforcement:
//   1. server-side procedure check (uses canAccessSensitiveData / canMutateField)
//   2. DB constraint            (UNIQUE normalizedAddressKey, FKs)
//   3. UI lock                  (frontend mirrors these helpers)
// ─────────────────────────────────────────────────────────────────────────────

export type MemberRole =
  | "pending_applicant"
  | "owner"
  | "tenant"
  | "partner"
  | "business_manager"
  | "comfortabel_employee"
  | "manager"
  | "admin";

export type MemberStatus = "pending" | "active" | "revoked";

export type AccountRole = "user" | "comfortabel_employee" | "manager" | "admin";

/** Field categories that are locked for direct mutation and require a changeRequest. */
export type FieldCategory = "A" | "B" | "C";

// ─── Address normalization ────────────────────────────────────────────────────

/**
 * Build a deterministic key identifying one physical address.
 * Format: POSTCODE-HUISNR[-TOEVOEGING] — uppercase, no spaces, no punctuation.
 *
 * The same physical address ALWAYS maps to the same key, regardless of casing,
 * spacing, or how the postal code was typed (e.g. "1506 ab" vs "1506AB").
 *
 * A UNIQUE constraint on properties.normalizedAddressKey then guarantees:
 *   one physical address = at most one WoningPaspoort.
 */
export function normalizeAddressKey(input: {
  postalCode: string;
  houseNumber: string | number;
  addition?: string | null;
  houseLetter?: string | null;
}): string {
  const pc = String(input.postalCode ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const nr = String(input.houseNumber ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  // House letter and addition are both suffix qualifiers; combine them, letter first.
  const letter = String(input.houseLetter ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const addition = String(input.addition ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const suffix = [letter, addition].filter(Boolean).join("");

  const parts = [pc, nr];
  if (suffix) parts.push(suffix);
  return parts.join("-");
}

/**
 * Normalize a Dutch postal code to the canonical "1234 AB" display form.
 * Strips punctuation/spaces, uppercases, and inserts a single space between the
 * 4 digits and 2 letters. Returns the cleaned-but-unspaced string if it does not
 * match the 4-digit + 2-letter pattern (so partial input is not destroyed).
 */
export function normalizeDutchPostalCode(raw: string): string {
  const cleaned = String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = cleaned.match(/^(\d{4})([A-Z]{2})$/);
  return m ? `${m[1]} ${m[2]}` : cleaned;
}

/**
 * Whether a string is a valid Dutch postal code (4 digits + 2 letters, where the
 * first digit is non-zero). Spacing and casing are ignored.
 */
export function isValidDutchPostalCode(raw: string): boolean {
  const cleaned = String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[1-9]\d{3}[A-Z]{2}$/.test(cleaned);
}

// ─── Sensitive-data access ──────────────────────────────────────────────────--

/**
 * Whether a member may READ sensitive passport data (full dossier, financials,
 * documents, inspections, AI on the property, etc.).
 *
 * Hard security rule: a freshly submitted claim (pending_applicant / pending)
 * has NO access to sensitive data until an admin confirms it. This prevents a
 * stranger from claiming an existing address and immediately reading the owner's
 * private information.
 *
 * Account-level admin/manager/comfortabel_employee always have access for support.
 */
export function canAccessSensitiveData(args: {
  accountRole: AccountRole;
  memberRole?: MemberRole | null;
  memberStatus?: MemberStatus | null;
}): boolean {
  // Staff override (account-level) — always allowed for support/administration.
  if (
    args.accountRole === "admin" ||
    args.accountRole === "manager" ||
    args.accountRole === "comfortabel_employee"
  ) {
    return true;
  }

  // No membership row at all → no access.
  if (!args.memberRole || !args.memberStatus) return false;

  // Revoked or pending → no access.
  if (args.memberStatus !== "active") return false;

  // pending_applicant must NEVER read sensitive data, even if (erroneously) marked active.
  if (args.memberRole === "pending_applicant") return false;

  // Active, non-applicant member → access granted.
  return true;
}

// ─── Field mutation locks (Category A/B/C) ───────────────────────────────────--

/**
 * Category A: system/official data (BAG, address identity, WOZ, kadaster).
 * Category B: Comfortabel-validated data (inspection scores, validated label).
 * Category C: free user data (notes, ambitions, preferences) — editable directly.
 *
 * Direct mutation rules:
 *   - Category A & B: ONLY admin/manager may write directly. Everyone else must
 *     submit a changeRequest (workflow), which an admin reviews.
 *   - Category C: any active member with an editing role may write directly.
 */
export function canMutateField(args: {
  category: FieldCategory;
  accountRole: AccountRole;
  memberRole?: MemberRole | null;
  memberStatus?: MemberStatus | null;
}): boolean {
  const isStaff =
    args.accountRole === "admin" || args.accountRole === "manager";

  if (args.category === "A" || args.category === "B") {
    // Locked: only admin/manager may write directly.
    return isStaff;
  }

  // Category C: requires an active, editing membership (or staff).
  if (isStaff) return true;
  if (args.accountRole === "comfortabel_employee") return true;

  if (!args.memberRole || args.memberStatus !== "active") return false;
  if (args.memberRole === "pending_applicant") return false;
  // tenants may read but not edit category C by default; owners/partners/managers can.
  const editingRoles: MemberRole[] = [
    "owner",
    "partner",
    "business_manager",
    "manager",
    "admin",
  ];
  return editingRoles.includes(args.memberRole);
}

/** Whether an action on a locked field must be routed through a changeRequest. */
export function requiresChangeRequest(args: {
  category: FieldCategory;
  accountRole: AccountRole;
  memberRole?: MemberRole | null;
  memberStatus?: MemberStatus | null;
}): boolean {
  if (args.category === "C") return false;
  // A/B fields require a change request unless the actor may mutate directly (staff).
  return !canMutateField(args);
}

// ─── User-management gate ─────────────────────────────────────────────────────

/**
 * Only admin and manager may manage users (create staff, change account roles,
 * delete accounts). A comfortabel_employee may NOT do user management.
 */
export function canManageUsers(accountRole: AccountRole): boolean {
  return accountRole === "admin" || accountRole === "manager";
}

/** Admin can always access/administer any property regardless of membership. */
export function isStaffAccount(accountRole: AccountRole): boolean {
  return (
    accountRole === "admin" ||
    accountRole === "manager" ||
    accountRole === "comfortabel_employee"
  );
}

// ─── Claim decision ───────────────────────────────────────────────────────────

/**
 * When a user submits an address, decide what to do:
 *  - "create_owner": no existing active passport → create new passport, user is owner (active).
 *  - "claim": an existing active passport for the same address → register a
 *    pending_applicant claim that an admin must confirm; NO immediate access.
 */
export function decideCreateOrClaim(args: {
  existingActiveProperty: boolean;
}): "create_owner" | "claim" {
  return args.existingActiveProperty ? "claim" : "create_owner";
}

// ─── Canonical record scoring (merge of duplicate addresses) ──────────────────

export interface CanonicalCandidate {
  id: number;
  hasLinkedUser: boolean; // a propertyMember / customer.userId exists
  inspectionCount: number;
  maintenanceCount: number;
  documentCount: number;
  chatMessageCount: number;
  filledFieldCount: number; // number of non-null meaningful fields
  createdAtMs: number; // earlier records get a small tie-break bonus
}

/**
 * Higher score = better canonical record to keep when merging duplicates.
 * Weighting favors records that (a) have a real linked user, and (b) carry the
 * most associated data, so merging loses as little information as possible.
 */
export function computeCanonicalScore(c: CanonicalCandidate): number {
  let score = 0;
  if (c.hasLinkedUser) score += 1000; // strongly prefer a record a user can see
  score += c.inspectionCount * 50;
  score += c.maintenanceCount * 20;
  score += c.documentCount * 20;
  score += c.chatMessageCount * 5;
  score += c.filledFieldCount * 2;
  // Earlier created records get a tiny tie-break bonus (older = more canonical).
  // Normalize so this never outweighs real data.
  score += Math.max(0, (1_900_000_000_000 - c.createdAtMs) / 1_000_000_000);
  return score;
}

/** Pick the winning canonical record id from a set of duplicates. */
export function pickCanonical(candidates: CanonicalCandidate[]): number | null {
  if (candidates.length === 0) return null;
  let best = candidates[0];
  let bestScore = computeCanonicalScore(best);
  for (const c of candidates.slice(1)) {
    const s = computeCanonicalScore(c);
    if (s > bestScore) {
      best = c;
      bestScore = s;
    }
  }
  return best.id;
}

// ─── Passport validation gate (Optie A) ─────────────────────────────────────-
//
// A self-created property starts with status "wacht_op_validatie". The owner is
// an active member (so they can fill in their own Category C data and see the
// property), but the value-delivering features — Woning Score, PDF reports and
// the Mati assistant — stay LOCKED until Comfortabel validates the property
// (0-meting) and moves it out of "wacht_op_validatie". This keeps validation the
// gateway to premium value, enforced in one central place.

export type PropertyStatus =
  | "wacht_op_validatie"
  | "concept"
  | "ingevuld"
  | "gevalideerd"
  | "aandacht";

/**
 * Whether a property's value features (score, reports, Mati) are unlocked.
 * Locked only while it is awaiting Comfortabel validation.
 */
export function isPassportValidated(status: string | null | undefined): boolean {
  return status !== "wacht_op_validatie";
}

/**
 * Whether `user` may use the value-delivering features of `property`.
 * Staff always may (for support); a client only after validation.
 */
export function canUseValidatedFeatures(args: {
  accountRole: AccountRole;
  propertyStatus: string | null | undefined;
}): boolean {
  if (isStaffAccount(args.accountRole)) return true;
  return isPassportValidated(args.propertyStatus);
}

// ─── Property field category map ──────────────────────────────────────────────
//
// Single source of truth for which property fields are protected. Kept here (in
// the pure module) so both the tRPC update procedure and unit tests share the
// exact same classification — preventing drift between enforcement and tests.

export const FIELD_CATEGORY: Record<string, FieldCategory> = {
  // Category A — official / system identity data. These come from authoritative
  // sources (BAG, WOZ, Kadaster, a Comfortabel 0-meting) and may NEVER be edited
  // directly by a customer or a comfortabel_employee: user input must always be
  // verified against the source. Corrections flow through a change request.
  //  · Address & BAG identity
  street: "A", houseNumber: "A", postalCode: "A", city: "A", addition: "A", houseLetter: "A",
  bagId: "A", bagObjectId: "A", bagNumberDesignationId: "A", normalizedAddressKey: "A",
  //  · Physical facts (BAG / 0-meting): surface, build year, type
  surfaceM2: "A", buildYear: "A", propertyType: "A",
  //  · Value & financial official data (WOZ, kadaster)
  wozValue: "A", wozYear: "A", kadastraleAanduiding: "A", buurtCode: "A", wijk: "A",
  //  · Legal / ownership official data
  ownershipType: "A", isMonument: "A", monumentType: "A", hasErfpacht: "A", erfpachtCanon: "A",

  // Category B — Comfortabel-validated data (scores, validated label, validation status)
  energyLabel: "B", addressValidationStatus: "B", status: "B",
  // Everything else defaults to Category C (free user data).
};

/** Resolve a property field's category; unknown fields are free (C). */
export function fieldCategory(field: string): FieldCategory {
  return FIELD_CATEGORY[field] ?? "C";
}

// ─── Completeness score (datakwaliteit) ──────────────────────────────────────
//
// Stimulates users to fill in their WoningPaspoort completely.
// Returns a 0–100 score and a list of missing field keys.
// Pure function — no DB calls, easily testable.

export interface CompletenessInput {
  // Blok 1 – Basis
  buildYear?: number | null;
  surfaceM2?: number | null;
  propertyType?: string | null;
  energyLabel?: string | null;
  // Blok 3 – Juridisch
  ownershipType?: string | null;
  // Blok 4 – Technisch
  foundationType?: string | null;
  roofType?: string | null;
  heatingSystem?: string | null;
  glazingType?: string | null;
  wallInsulation?: string | null;
  // Blok 2 – Financieel
  wozValue?: number | null;
  purchasePrice?: number | null;
  // Documenten & Foto's (counts)
  documentCount?: number;
  photoCount?: number;
  // Profiel
  profilePhone?: string | null;
  preferredContact?: string | null;
}

export interface CompletenessResult {
  score: number; // 0–100
  label: "Uitstekend" | "Goed" | "Onvolledig";
  missingFields: string[];
}

const COMPLETENESS_WEIGHTS: Array<{
  key: keyof CompletenessInput;
  label: string;
  weight: number;
  check: (v: CompletenessInput) => boolean;
}> = [
  { key: "buildYear",        label: "Bouwjaar",                weight: 5,  check: v => !!v.buildYear },
  { key: "surfaceM2",        label: "Woonoppervlak",           weight: 5,  check: v => !!v.surfaceM2 },
  { key: "propertyType",     label: "Woningtype",              weight: 5,  check: v => !!v.propertyType },
  { key: "energyLabel",      label: "Energielabel",            weight: 5,  check: v => !!v.energyLabel },
  { key: "ownershipType",    label: "Eigendomsvorm",           weight: 5,  check: v => !!v.ownershipType && v.ownershipType !== "onbekend" },
  { key: "foundationType",   label: "Fundering",               weight: 5,  check: v => !!v.foundationType && v.foundationType !== "onbekend" },
  { key: "roofType",         label: "Daktype",                 weight: 5,  check: v => !!v.roofType && v.roofType !== "onbekend" },
  { key: "heatingSystem",    label: "Verwarmingssysteem",      weight: 5,  check: v => !!v.heatingSystem && v.heatingSystem !== "onbekend" },
  { key: "glazingType",      label: "Beglazing",               weight: 5,  check: v => !!v.glazingType && v.glazingType !== "onbekend" },
  { key: "wallInsulation",   label: "Gevelisolatie",           weight: 5,  check: v => !!v.wallInsulation && v.wallInsulation !== "onbekend" },
  { key: "wozValue",         label: "WOZ-waarde",              weight: 5,  check: v => !!v.wozValue },
  { key: "purchasePrice",    label: "Koopsom",                 weight: 5,  check: v => !!v.purchasePrice },
  { key: "documentCount",    label: "Minimaal 1 document",     weight: 10, check: v => (v.documentCount ?? 0) > 0 },
  { key: "photoCount",       label: "Minimaal 1 foto",         weight: 10, check: v => (v.photoCount ?? 0) > 0 },
  { key: "profilePhone",     label: "Telefoonnummer (profiel)",weight: 5,  check: v => !!v.profilePhone },
  { key: "preferredContact", label: "Contactvoorkeur",         weight: 5,  check: v => !!v.preferredContact && v.preferredContact !== "none" },
];

export function calculateCompleteness(input: CompletenessInput): CompletenessResult {
  let score = 0;
  const missingFields: string[] = [];

  for (const item of COMPLETENESS_WEIGHTS) {
    if (item.check(input)) {
      score += item.weight;
    } else {
      missingFields.push(item.label);
    }
  }

  const label: CompletenessResult["label"] =
    score >= 80 ? "Uitstekend" : score >= 50 ? "Goed" : "Onvolledig";

  return { score, label, missingFields };
}
