import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
} from "drizzle-orm/mysql-core";

// ─── Users (auth) ─────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  // Legacy OAuth column — kept for DB compatibility, not used in new auth
  openId: varchar("openId", { length: 64 }),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  // Account-level role. Property-level roles live in propertyMembers.
  role: mysqlEnum("role", ["user", "comfortabel_employee", "manager", "admin"]).default("user").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  isFoundingMember: boolean("isFoundingMember").default(false).notNull(),
  onboardingCompletedAt: timestamp("onboardingCompletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Customers (klanten) ──────────────────────────────────────────────────────

export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  type: mysqlEnum("type", ["particulier", "bedrijf", "vastgoed"]).default("particulier").notNull(),
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  companyName: varchar("companyName", { length: 200 }),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy").references(() => users.id),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// ─── Properties (woningen) ────────────────────────────────────────────────────

export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  // customerId becomes nullable in 1.0: a passport is address-bound, not customer-bound.
  // Kept for backward compatibility and admin customer-administration linkage.
  customerId: int("customerId").references(() => customers.id),
  street: varchar("street", { length: 200 }).notNull(),
  houseNumber: varchar("houseNumber", { length: 20 }).notNull(),
  addition: varchar("addition", { length: 20 }),        // toevoeging, e.g. "A", "bis"
  houseLetter: varchar("houseLetter", { length: 5 }),   // huisletter
  postalCode: varchar("postalCode", { length: 10 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),

  // ── Adres-identiteit & duplicaatpreventie (1.0) ────────────────────────────
  // Deterministic normalized key: POSTCODE-HUISNR[-TOEVOEGING] uppercase, no spaces.
  // Unique constraint enforces: one physical address = at most one WoningPaspoort.
  normalizedAddressKey: varchar("normalizedAddressKey", { length: 64 }).unique(),
  bagId: varchar("bagId", { length: 32 }),                          // BAG pand-id
  bagObjectId: varchar("bagObjectId", { length: 32 }),              // BAG verblijfsobject-id
  bagNumberDesignationId: varchar("bagNumberDesignationId", { length: 32 }), // BAG nummeraanduiding-id
  addressValidationStatus: mysqlEnum("addressValidationStatus", [
    "unvalidated", "validated", "manual", "conflict"
  ]).default("unvalidated").notNull(),
  addressSource: mysqlEnum("addressSource", [
    "customer", "admin", "bag", "import", "migration"
  ]).default("customer").notNull(),
  // Passport lifecycle status (shown to admin): concept / ingevuld / gevalideerd / aandacht.
  status: mysqlEnum("status", [
    "wacht_op_validatie", "concept", "ingevuld", "gevalideerd", "aandacht"
  ]).default("concept").notNull(),
  createdByRole: mysqlEnum("createdByRole", [
    "user", "comfortabel_employee", "manager", "admin", "migration"
  ]).default("user").notNull(),
  createdByUserId: int("createdByUserId").references(() => users.id),
  isActive: boolean("isActive").default(true).notNull(),
  buildYear: int("buildYear"),
  propertyType: mysqlEnum("propertyType", [
    "tussenwoning", "hoekwoning", "vrijstaand", "appartement", "bedrijfspand", "overig"
  ]).default("tussenwoning"),
  surfaceM2: int("surfaceM2"),
  residents: int("residents"),
  energyLabel: mysqlEnum("energyLabel", ["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"]),
  subscriptionType: mysqlEnum("subscriptionType", [
    "free", "digital", "basis", "plus", "premium", "founding"
  ]).default("free"),
  subscriptionActive: boolean("subscriptionActive").default(true).notNull(),
  subscriptionStartDate: timestamp("subscriptionStartDate"),
  subscriptionEndDate: timestamp("subscriptionEndDate"),
  lastInspectionDate: timestamp("lastInspectionDate"),
  nextInspectionDate: timestamp("nextInspectionDate"),
  photoUrl: text("photoUrl"),
  notes: text("notes"),

  // ── Blok 2: Waarde & Financieel ───────────────────────────────────────────
  wozValue: int("wozValue"),                          // WOZ-waarde in €
  wozYear: int("wozYear"),                            // Peiljaar WOZ
  purchasePrice: int("purchasePrice"),                // Koopsom bij aankoop in €
  purchaseYear: int("purchaseYear"),                  // Aankoopjaar
  vveContribution: int("vveContribution"),            // VvE-bijdrage per maand in €
  mortgageProvider: varchar("mortgageProvider", { length: 200 }), // Hypotheekverstrekker
  erfpachtCanon: int("erfpachtCanon"),                // Erfpachtcanon per jaar in €
  insuranceExpiry: timestamp("insuranceExpiry"),      // Vervaldatum opstalverzekering

  // ── Blok 3: Juridisch & Omgeving ─────────────────────────────────────────
  ownershipType: mysqlEnum("ownershipType", [
    "volle_eigendom", "erfpacht", "appartementsrecht", "opstalrecht", "onbekend"
  ]).default("volle_eigendom"),
  kadastraleAanduiding: varchar("kadastraleAanduiding", { length: 100 }), // bijv. "Amsterdam B 1234"
  isMonument: boolean("isMonument").default(false),   // Rijks- of gemeentelijk monument
  monumentType: mysqlEnum("monumentType", ["rijksmonument", "gemeentelijk", "geen"]).default("geen"),
  hasErfpacht: boolean("hasErfpacht").default(false),
  hasBeslag: boolean("hasBeslag").default(false),     // Beslag of hypotheekrecht
  bestemmingUrl: text("bestemmingUrl"),               // Link naar omgevingsloket
  bestemmingCategory: varchar("bestemmingCategory", { length: 100 }), // bijv. "Wonen"
  buurtCode: varchar("buurtCode", { length: 20 }),    // CBS buurtcode
  wijk: varchar("wijk", { length: 100 }),             // Wijknaam

  // ── Blok 4: Technische Kenmerken ─────────────────────────────────────────
  foundationType: mysqlEnum("foundationType", [
    "paalfundering", "strookfundering", "plaatfundering", "onbekend"
  ]).default("onbekend"),
  roofType: mysqlEnum("roofType", [
    "zadeldak", "plat_dak", "mansardedak", "schilddak", "lessenaarsdak", "onbekend"
  ]).default("onbekend"),
  roofMaterial: mysqlEnum("roofMaterial", [
    "dakpannen", "bitumen", "zink", "riet", "leisteen", "onbekend"
  ]).default("onbekend"),
  wallType: mysqlEnum("wallType", [
    "spouwmuur", "massief", "houtskelet", "onbekend"
  ]).default("onbekend"),
  heatingSystem: mysqlEnum("heatingSystem", [
    "cv_ketel", "warmtepomp", "stadsverwarming", "elektrisch", "geen", "onbekend"
  ]).default("onbekend"),
  heatingYear: int("heatingYear"),                    // Bouwjaar CV/warmtepomp
  hotWaterSystem: mysqlEnum("hotWaterSystem", [
    "combiketel", "boiler", "zonneboiler", "warmtepomp", "onbekend"
  ]).default("onbekend"),
  hasSolarPanels: boolean("hasSolarPanels").default(false),
  solarPanelCount: int("solarPanelCount"),
  solarPanelYear: int("solarPanelYear"),
  hasEVCharger: boolean("hasEVCharger").default(false),
  hasGasConnection: boolean("hasGasConnection").default(true),
  glazingType: mysqlEnum("glazingType", [
    "enkel", "dubbel", "hr_plus", "hr_plus_plus", "triple", "gemengd", "onbekend"
  ]).default("onbekend"),
  wallInsulation: mysqlEnum("wallInsulation", ["aanwezig", "deels", "afwezig", "onbekend"]).default("onbekend"),
  roofInsulation: mysqlEnum("roofInsulation", ["aanwezig", "deels", "afwezig", "onbekend"]).default("onbekend"),
  floorInsulation: mysqlEnum("floorInsulation", ["aanwezig", "deels", "afwezig", "onbekend"]).default("onbekend"),

  // ── Blok 5: Verduurzaming & Ambities ─────────────────────────────────────
  targetEnergyLabel: mysqlEnum("targetEnergyLabel", ["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"]),
  gasVrijDoeljaar: int("gasVrijDoeljaar"),             // Doeljaar aardgasvrij
  sustainabilityMeasures: text("sustainabilityMeasures"), // JSON array of taken measures
  subsidiesApplied: text("subsidiesApplied"),         // JSON array of subsidies

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

// ─── Inspections / 0-metingen ─────────────────────────────────────────────────

export const inspections = mysqlTable("inspections", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().references(() => properties.id),
  performedBy: int("performedBy").references(() => users.id),
  type: mysqlEnum("type", ["nulmeting", "jaarlijks", "tussentijds", "calamiteit"]).default("nulmeting").notNull(),
  status: mysqlEnum("status", ["concept", "in_uitvoering", "afgerond"]).default("concept").notNull(),
  inspectionDate: timestamp("inspectionDate").defaultNow().notNull(),
  summary: text("summary"),
  scoreInstallaties: int("scoreInstallaties"),
  scoreBouwkundig: int("scoreBouwkundig"),
  scoreVeiligheid: int("scoreVeiligheid"),
  scoreVochtVentilatie: int("scoreVochtVentilatie"),
  scoreEnergie: int("scoreEnergie"),
  totalScore: int("totalScore"),
  woningGrade: mysqlEnum("woningGrade", ["A", "B", "C", "D", "E"]),
  pdfUrl: text("pdfUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Inspection = typeof inspections.$inferSelect;
export type InsertInspection = typeof inspections.$inferInsert;

// ─── Inspection Items (checklist antwoorden) ──────────────────────────────────

export const inspectionItems = mysqlTable("inspectionItems", {
  id: int("id").autoincrement().primaryKey(),
  inspectionId: int("inspectionId").notNull().references(() => inspections.id),
  category: varchar("category", { length: 100 }).notNull(),
  subcategory: varchar("subcategory", { length: 100 }),
  question: text("question").notNull(),
  answer: mysqlEnum("answer", ["goed", "aandacht", "urgent", "nvt", "onbekend"]).default("onbekend"),
  notes: text("notes"),
  photoUrl: text("photoUrl"),
  sortOrder: int("sortOrder").default(0),
});

export type InspectionItem = typeof inspectionItems.$inferSelect;
export type InsertInspectionItem = typeof inspectionItems.$inferInsert;

// ─── Maintenance Issues (onderhoudspunten) ────────────────────────────────────

export const maintenanceIssues = mysqlTable("maintenanceIssues", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().references(() => properties.id),
  inspectionId: int("inspectionId").references(() => inspections.id),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  priority: mysqlEnum("priority", ["laag", "normaal", "hoog", "urgent"]).default("normaal").notNull(),
  status: mysqlEnum("status", ["open", "in_behandeling", "gepland", "afgerond"]).default("open").notNull(),
  dueDate: timestamp("dueDate"),
  resolvedAt: timestamp("resolvedAt"),
  estimatedCost: float("estimatedCost"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaintenanceIssue = typeof maintenanceIssues.$inferSelect;
export type InsertMaintenanceIssue = typeof maintenanceIssues.$inferInsert;

// ─── Maintenance Planning (toekomstig onderhoud) ──────────────────────────────

export const maintenancePlanning = mysqlTable("maintenancePlanning", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().references(() => properties.id),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  plannedYear: int("plannedYear"),
  horizon: mysqlEnum("horizon", ["1jaar", "3jaar", "5jaar", "10jaar", "mjop"]).default("3jaar"),
  estimatedCost: float("estimatedCost"),
  status: mysqlEnum("status", ["gepland", "uitgevoerd", "uitgesteld"]).default("gepland").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MaintenancePlanning = typeof maintenancePlanning.$inferSelect;
export type InsertMaintenancePlanning = typeof maintenancePlanning.$inferInsert;

// ─── Documents (documenten) ───────────────────────────────────────────────────

export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").references(() => properties.id),
  inspectionId: int("inspectionId").references(() => inspections.id),
  type: mysqlEnum("type", ["rapport", "offerte", "factuur", "keuring", "foto", "overig"]).default("overig"),
  title: varchar("title", { length: 300 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey"),
  mimeType: varchar("mimeType", { length: 100 }),
  uploadedBy: int("uploadedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ─── Password Reset Tokens ────────────────────────────────────────────────────

export const passwordResetTokens = mysqlTable("passwordResetTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// ─── Chat Messages (AI Huismeester history) ───────────────────────────────────

export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().references(() => properties.id),
  userId: int("userId").notNull().references(() => users.id),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// ─── AI Chat Usage (Free-tier quota tracking) ─────────────────────────────────

export const aiChatUsage = mysqlTable("aiChatUsage", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  propertyId: int("propertyId").notNull().references(() => properties.id),
  monthYear: varchar("monthYear", { length: 7 }).notNull(), // e.g. "2026-06"
  questionCount: int("questionCount").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiChatUsage = typeof aiChatUsage.$inferSelect;
export type InsertAiChatUsage = typeof aiChatUsage.$inferInsert;

// ─── Invitations (klant uitnodigingen) ────────────────────────────────────────

export const invitations = mysqlTable("invitations", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull().references(() => customers.id),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  invitedBy: int("invitedBy").references(() => users.id),
  acceptedAt: timestamp("acceptedAt"),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = typeof invitations.$inferInsert;

// ─── Email Logs (marketing sequentie tracking) ────────────────────────────────
export const emailLogs = mysqlTable("emailLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  emailType: varchar("emailType", { length: 64 }).notNull(), // "welcome", "day3", "day7", "day14", "day30", "monthly_score"
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  resendId: varchar("resendId", { length: 128 }), // Resend message ID for tracking
  metadata: text("metadata"), // JSON: extra context (propertyId, score, etc.)
});
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;

// ─── Referral Codes (activatiecodes per lid) ──────────────────────────────────
export const referralCodes = mysqlTable("referralCodes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id).unique(),
  code: varchar("code", { length: 20 }).notNull().unique(), // e.g. "COMF-A3X9"
  referredBy: int("referredBy").references(() => users.id), // wie heeft deze user uitgenodigd
  referralCount: int("referralCount").default(0).notNull(), // hoeveel mensen via deze code
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = typeof referralCodes.$inferInsert;

// ─── Property Members (koppeltabel gebruiker ↔ paspoort, met rol) ─────────────
// Replaces customers.userId as the ownership/visibility driver in 1.0.
// One passport can have many members; one user can be member of many passports.
// A member only sees sensitive passport data once status = "active".
export const propertyMembers = mysqlTable("propertyMembers", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().references(() => properties.id),
  userId: int("userId").notNull().references(() => users.id),
  role: mysqlEnum("role", [
    "pending_applicant", // claim ingediend, nog niet bevestigd — GEEN toegang tot gevoelige data
    "owner",
    "tenant",
    "partner",
    "business_manager",
    "comfortabel_employee",
    "manager",
    "admin",
  ]).default("pending_applicant").notNull(),
  status: mysqlEnum("status", ["pending", "active", "revoked"]).default("pending").notNull(),
  confirmedBy: int("confirmedBy").references(() => users.id),
  confirmedAt: timestamp("confirmedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PropertyMember = typeof propertyMembers.$inferSelect;
export type InsertPropertyMember = typeof propertyMembers.$inferInsert;

// ─── Change Requests (wijzigverzoeken op vergrendelde velden A/B) ─────────────
export const changeRequests = mysqlTable("changeRequests", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().references(() => properties.id),
  requestedBy: int("requestedBy").notNull().references(() => users.id),
  fieldCategory: mysqlEnum("fieldCategory", ["A", "B"]).notNull(), // A=systeemdata, B=gevalideerde data
  fieldName: varchar("fieldName", { length: 100 }).notNull(),
  currentValue: text("currentValue"),
  proposedValue: text("proposedValue"),
  note: text("note"),
  status: mysqlEnum("status", ["open", "approved", "rejected"]).default("open").notNull(),
  reviewedBy: int("reviewedBy").references(() => users.id),
  reviewedAt: timestamp("reviewedAt"),
  reviewNote: text("reviewNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChangeRequest = typeof changeRequests.$inferSelect;
export type InsertChangeRequest = typeof changeRequests.$inferInsert;

// ─── Audit Log (wie deed wat, wanneer) ────────────────────────────────────────
export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId").references(() => users.id),
  action: varchar("action", { length: 64 }).notNull(), // e.g. "property.create", "member.confirm", "field.update", "passport.merge"
  entityType: varchar("entityType", { length: 64 }).notNull(), // e.g. "property", "propertyMember", "user", "document"
  entityId: int("entityId"),
  previousValue: text("previousValue"), // JSON snapshot
  newValue: text("newValue"),           // JSON snapshot
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

// ─── User Profile (persoonsgebonden dossierlaag — stub voor 1.x) ──────────────
export const userProfile = mysqlTable("userProfile", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id).unique(),
  phone: varchar("phone", { length: 30 }),
  preferredContact: mysqlEnum("preferredContact", ["email", "phone", "none"]).default("email"),
  marketingOptIn: boolean("marketingOptIn").default(false).notNull(),
  birthYear: int("birthYear"),
  preferredContactTime: varchar("preferredContactTime", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfile.$inferSelect;
export type InsertUserProfile = typeof userProfile.$inferInsert;

// ─── Consents (toestemmingen voor data delen — stub voor 1.x) ─────────────────
export const consents = mysqlTable("consents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  consentType: varchar("consentType", { length: 64 }).notNull(), // e.g. "data_sharing", "marketing", "ai_processing"
  granted: boolean("granted").default(false).notNull(),
  grantedAt: timestamp("grantedAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Consent = typeof consents.$inferSelect;
export type InsertConsent = typeof consents.$inferInsert;

// ─── Notifications (in-app meldingen — stub voor 1.x) ─────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body"),
  type: varchar("type", { length: 64 }).default("info").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  linkUrl: text("linkUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Dossier Notes (persoonlijke notities, niet aan één woning gebonden — stub) ─
export const dossierNotes = mysqlTable("dossierNotes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  propertyId: int("propertyId").references(() => properties.id), // optioneel gekoppeld
  title: varchar("title", { length: 200 }),
  body: text("body"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DossierNote = typeof dossierNotes.$inferSelect;
export type InsertDossierNote = typeof dossierNotes.$inferInsert;

// ─── Zero Measurement Requests (0-meting aanvragen) ──────────────────────────
export const zeroMeasurementRequests = mysqlTable("zeroMeasurementRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  propertyId: int("propertyId").notNull().references(() => properties.id),
  phone: varchar("phone", { length: 30 }).notNull(),
  preferredDate: varchar("preferredDate", { length: 30 }).notNull(), // ISO date string
  notes: text("notes"),
  status: mysqlEnum("status", ["aangevraagd", "ingepland", "uitgevoerd", "geannuleerd"]).default("aangevraagd").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ZeroMeasurementRequest = typeof zeroMeasurementRequests.$inferSelect;
export type InsertZeroMeasurementRequest = typeof zeroMeasurementRequests.$inferInsert;

// ─── Property Data Points (Trojan Horse — centraal datapunt-model) ────────────
// Every piece of property data is stored as an individual data point.
// The existing `properties` columns remain the source of truth for v1.0;
// this table is populated in parallel (sync-on-write) so that Fase 2 can
// migrate the UI to a pure datapunt-renderer without a data migration.
//
// Categories map to WoningPaspoort blokken:
//   identiteit | waarde_financieel | juridisch_omgeving | technisch | verduurzaming
//   dossier | inspectie | onderhoud | ai_analyse
//
// Sources reflect the intake channel:
//   klant | telefoon_intake | ai | foto | comfortabel | specialist | bag | import
//
// Confidence: 0–100 integer (0=onbekend, 50=klant-opgave, 80=foto-analyse, 100=fysiek-geverifieerd)
export const propertyDataPoints = mysqlTable("propertyDataPoints", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().references(() => properties.id),

  // ── Classificatie ────────────────────────────────────────────────────────
  category: varchar("category", { length: 64 }).notNull(),   // e.g. "technisch"
  component: varchar("component", { length: 100 }).notNull(), // e.g. "heatingSystem"
  label: varchar("label", { length: 200 }),                  // human-readable label

  // ── Waarde ───────────────────────────────────────────────────────────────
  // Stored as text to support any type (enum value, number, boolean, JSON).
  // Consumers cast to the appropriate type based on component.
  value: text("value"),
  unit: varchar("unit", { length: 30 }),                     // e.g. "m2", "€", "jaar"

  // ── Herkomst & betrouwbaarheid ────────────────────────────────────────────
  source: mysqlEnum("source", [
    "klant", "telefoon_intake", "ai", "foto", "comfortabel", "specialist", "bag", "import"
  ]).default("klant").notNull(),
  confidence: int("confidence").default(50).notNull(),        // 0–100
  verificationStatus: mysqlEnum("verificationStatus", [
    "unverified", "self_reported", "photo_verified", "physically_verified", "ai_inferred"
  ]).default("self_reported").notNull(),
  verifiedAt: timestamp("verifiedAt"),
  verifiedBy: int("verifiedBy").references(() => users.id),

  // ── Gekoppelde media ──────────────────────────────────────────────────────
  // JSON arrays of document/photo IDs or URLs
  linkedPhotoIds: text("linkedPhotoIds"),    // JSON: number[]
  linkedDocumentIds: text("linkedDocumentIds"), // JSON: number[]

  // ── Onderhoud & risico ────────────────────────────────────────────────────
  maintenanceStatus: mysqlEnum("maintenanceStatus", [
    "goed", "aandacht", "urgent", "onbekend"
  ]).default("onbekend"),
  riskScore: int("riskScore"),   // 0–100, null = not assessed
  urgencyScore: int("urgencyScore"), // 0–100, null = not assessed

  // ── AI-annotaties (Fase 2+) ───────────────────────────────────────────────
  aiNotes: text("aiNotes"),      // Mati's observations about this data point
  aiFlags: text("aiFlags"),      // JSON: { missing: bool, inconsistent: bool, followUpQuestion: string }

  // ── Metadata ─────────────────────────────────────────────────────────────
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PropertyDataPoint = typeof propertyDataPoints.$inferSelect;
export type InsertPropertyDataPoint = typeof propertyDataPoints.$inferInsert;

// ─── Founding 100 Leads ──────────────────────────────────────────────────────
// Public pilot applications live separately from users/customers. Applying
// never grants an account, subscription, or Founding Member status.
export const founding100Leads = mysqlTable("founding100Leads", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 30 }),
  postalCode: varchar("postalCode", { length: 10 }),
  message: text("message"),
  status: mysqlEnum("status", [
    "new",
    "contacted",
    "qualified",
    "accepted",
    "rejected",
  ]).default("new").notNull(),
  privacyAcceptedAt: timestamp("privacyAcceptedAt").notNull(),
  contactConsentAt: timestamp("contactConsentAt").notNull(),
  marketingOptIn: boolean("marketingOptIn").default(false).notNull(),
  utmSource: varchar("utmSource", { length: 200 }),
  utmMedium: varchar("utmMedium", { length: 200 }),
  utmCampaign: varchar("utmCampaign", { length: 200 }),
  utmTerm: varchar("utmTerm", { length: 200 }),
  utmContent: varchar("utmContent", { length: 200 }),
  referrer: text("referrer"),
  landingPath: varchar("landingPath", { length: 500 }),
  confirmationEmailSentAt: timestamp("confirmationEmailSentAt"),
  internalNotificationSentAt: timestamp("internalNotificationSentAt"),
  notificationError: text("notificationError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Founding100Lead = typeof founding100Leads.$inferSelect;
export type InsertFounding100Lead = typeof founding100Leads.$inferInsert;
