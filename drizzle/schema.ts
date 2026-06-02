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
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
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
  customerId: int("customerId").notNull().references(() => customers.id),
  street: varchar("street", { length: 200 }).notNull(),
  houseNumber: varchar("houseNumber", { length: 20 }).notNull(),
  postalCode: varchar("postalCode", { length: 10 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  buildYear: int("buildYear"),
  propertyType: mysqlEnum("propertyType", [
    "tussenwoning", "hoekwoning", "vrijstaand", "appartement", "bedrijfspand", "overig"
  ]).default("tussenwoning"),
  surfaceM2: int("surfaceM2"),
  residents: int("residents"),
  energyLabel: mysqlEnum("energyLabel", ["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"]),
  subscriptionType: mysqlEnum("subscriptionType", [
    "free", "digital", "basis", "plus", "premium"
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
