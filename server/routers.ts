import { initTRPC, TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import superjson from "superjson";
import { z } from "zod";
import { TrpcContext, COOKIE_NAME } from "./context";
import { PLAN_FEATURES, SUBSCRIPTION_LABELS, SUBSCRIPTION_PRICES, SUBSCRIPTION_DESCRIPTIONS, type SubscriptionTier } from "../shared/const";
import { getDb } from "./db";
import {
  users,
  customers,
  properties,
  inspections,
  inspectionItems,
  maintenanceIssues,
  maintenancePlanning,
  documents,
  invitations,
  propertyMembers,
  changeRequests,
  userProfile,
  zeroMeasurementRequests,
} from "../drizzle/schema";
import { sendInvitationEmail } from "./email";
import { notifyOwner } from "./_core/notification";
import { eq, desc, and, asc, inArray } from "drizzle-orm";
import {
  normalizeAddressKey,
  canMutateField,
  requiresChangeRequest,
  fieldCategory,
  isValidDutchPostalCode,
  normalizeDutchPostalCode,
  calculateCompleteness,
  type AccountRole,
} from "./lib/passport";
import { canUserAccessProperty, getMembership, assertPropertyAccess } from "./lib/membership";
import { writeAudit, clientIp } from "./lib/audit";
import { syncNewProperty, syncPropertyDataPoints } from "./lib/datapoints";

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});
// Staff = admin | manager | comfortabel_employee (support/administration access).
const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  const r = ctx.user.role;
  if (r !== "admin" && r !== "manager" && r !== "comfortabel_employee") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});
// Manager = admin | manager. Only these may write Category A/B fields directly and manage users.
const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const r = ctx.user.role;
  if (r !== "admin" && r !== "manager") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});
// Field category classification lives in ./lib/passport (single source of truth,
// shared with unit tests). Use fieldCategory(field) below.

// ─── Auth router ──────────────────────────────────────────────────────────────

const authRouter = t.router({
  me: publicProcedure.query(({ ctx }) => ctx.user),
  logout: publicProcedure.mutation(({ ctx }) => {
    const isSecure = ctx.req.headers["x-forwarded-proto"] === "https" || ctx.req.protocol === "https";
    ctx.res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? "none" : "lax",
      path: "/",
    });
    return { success: true };
  }),
});

// ─── Customers router ─────────────────────────────────────────────────────────

const customersRouter = t.router({
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(customers).orderBy(desc(customers.createdAt));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db
        .select()
        .from(customers)
        .where(eq(customers.id, input.id))
        .limit(1);
      if (!result[0]) throw new TRPCError({ code: "NOT_FOUND" });
      // Non-admin can only see their own customer record
      if (ctx.user.role !== "admin" && result[0].userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return result[0];
    }),

  create: adminProcedure
    .input(
      z.object({
        type: z.enum(["particulier", "bedrijf", "vastgoed"]),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        companyName: z.string().optional(),
        email: z.string().email(),
        phone: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(customers).values({
        ...input,
        createdBy: ctx.user.id,
      });
      return { id: Number(result[0].insertId) };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        type: z.enum(["particulier", "bedrijf", "vastgoed"]).optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        companyName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
        userId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(customers).set(data).where(eq(customers.id, id));
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(customers).set({ isActive: false }).where(eq(customers.id, input.id));
      return { success: true };
    }),
});

// ─── Properties router ────────────────────────────────────────────────────────

const propertiesRouter = t.router({
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(properties).orderBy(desc(properties.createdAt));
  }),

  listByCustomer: protectedProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Verify customer access
      if (ctx.user.role !== "admin") {
        const cust = await db
          .select()
          .from(customers)
          .where(and(eq(customers.id, input.customerId), eq(customers.userId, ctx.user.id)))
          .limit(1);
        if (!cust[0]) throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db
        .select()
        .from(properties)
        .where(eq(properties.customerId, input.customerId))
        .orderBy(desc(properties.createdAt));
    }),

  myProperties: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // New model: properties via propertyMembers (active + pending = visible to owner)
    const memberRows = await db
      .select({ propertyId: propertyMembers.propertyId })
      .from(propertyMembers)
      .where(
        and(
          eq(propertyMembers.userId, ctx.user.id),
          inArray(propertyMembers.status, ["active", "pending"])
        )
      );
    const memberPropertyIds = memberRows.map((r) => r.propertyId);

    // Legacy model: properties via customers.userId -> properties.customerId
    const cust = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.userId, ctx.user.id))
      .limit(1);
    const legacyPropertyIds: number[] = [];
    if (cust[0]) {
      const legacyRows = await db
        .select({ id: properties.id })
        .from(properties)
        .where(eq(properties.customerId, cust[0].id));
      legacyRows.forEach((r) => legacyPropertyIds.push(r.id));
    }

    // Merge and deduplicate
    const allIds = Array.from(new Set([...memberPropertyIds, ...legacyPropertyIds]));
    if (allIds.length === 0) return [];

    return db
      .select()
      .from(properties)
      .where(inArray(properties.id, allIds))
      .orderBy(desc(properties.createdAt));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db
        .select()
        .from(properties)
        .where(eq(properties.id, input.id))
        .limit(1);
      if (!result[0]) throw new TRPCError({ code: "NOT_FOUND" });
      await assertPropertyAccess(db, { id: ctx.user.id, role: ctx.user.role as AccountRole }, input.id);
      return result[0];
    }),

  create: adminProcedure
    .input(
      z.object({
        customerId: z.number(),
        street: z.string(),
        houseNumber: z.string(),
        postalCode: z.string(),
        city: z.string(),
        buildYear: z.number().optional(),
        propertyType: z
          .enum(["tussenwoning", "hoekwoning", "vrijstaand", "appartement", "bedrijfspand", "overig"])
          .optional(),
        surfaceM2: z.number().optional(),
        residents: z.number().optional(),
        energyLabel: z
          .enum(["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"])
          .optional(),
        subscriptionType: z
          .enum(["free", "digital", "basis", "plus", "premium"])
          .optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Unified duplicate prevention: admin create uses the SAME normalized key
      // and uniqueness rule as the client createOrClaim flow. One physical
      // address = at most one WoningPaspoort.
      const key = normalizeAddressKey({ postalCode: input.postalCode, houseNumber: input.houseNumber });
      const existing = await db
        .select({ id: properties.id })
        .from(properties)
        .where(eq(properties.normalizedAddressKey, key))
        .limit(1);
      if (existing[0]) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Voor dit adres bestaat al een WoningPaspoort (#${existing[0].id}). Koppel de klant aan dat paspoort in plaats van een nieuw aan te maken.`,
        });
      }
      const result = await db.insert(properties).values({
        ...input,
        normalizedAddressKey: key,
        createdByRole: ctx.user.role,
      } as any);
      const newId = Number(result[0].insertId);
      await writeAudit(db, {
        actorUserId: ctx.user.id,
        action: "property.create",
        entityType: "property",
        entityId: newId,
        previousValue: null,
        newValue: { normalizedAddressKey: key, customerId: input.customerId },
        ipAddress: clientIp(ctx.req),
      });
      return { id: newId };
    }),

  update: staffProcedure
    .input(
      z.object({
        id: z.number(),
        // Blok 1: Basisidentiteit
        street: z.string().optional(),
        houseNumber: z.string().optional(),
        postalCode: z.string().optional(),
        city: z.string().optional(),
        buildYear: z.number().optional(),
        propertyType: z
          .enum(["tussenwoning", "hoekwoning", "vrijstaand", "appartement", "bedrijfspand", "overig"])
          .optional(),
        surfaceM2: z.number().optional(),
        residents: z.number().optional(),
        energyLabel: z
          .enum(["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"])
          .optional(),
        subscriptionType: z.enum(["free", "digital", "basis", "plus", "premium"]).optional(),
        subscriptionActive: z.boolean().optional(),
        subscriptionStartDate: z.date().optional(),
        subscriptionEndDate: z.date().optional(),
        notes: z.string().optional(),
        lastInspectionDate: z.date().optional(),
        nextInspectionDate: z.date().optional(),
        // Blok 2: Waarde & Financieel
        wozValue: z.number().optional(),
        wozYear: z.number().optional(),
        purchasePrice: z.number().optional(),
        purchaseYear: z.number().optional(),
        vveContribution: z.number().optional(),
        mortgageProvider: z.string().optional(),
        erfpachtCanon: z.number().optional(),
        insuranceExpiry: z.date().optional(),
        // Blok 3: Juridisch & Omgeving
        ownershipType: z.enum(["volle_eigendom", "erfpacht", "appartementsrecht", "opstalrecht", "onbekend"]).optional(),
        kadastraleAanduiding: z.string().optional(),
        isMonument: z.boolean().optional(),
        monumentType: z.enum(["rijksmonument", "gemeentelijk", "geen"]).optional(),
        hasErfpacht: z.boolean().optional(),
        hasBeslag: z.boolean().optional(),
        bestemmingUrl: z.string().optional(),
        bestemmingCategory: z.string().optional(),
        buurtCode: z.string().optional(),
        wijk: z.string().optional(),
        // Blok 4: Technische Kenmerken
        foundationType: z.enum(["paalfundering", "strookfundering", "plaatfundering", "onbekend"]).optional(),
        roofType: z.enum(["zadeldak", "plat_dak", "mansardedak", "schilddak", "lessenaarsdak", "onbekend"]).optional(),
        roofMaterial: z.enum(["dakpannen", "bitumen", "zink", "riet", "leisteen", "onbekend"]).optional(),
        wallType: z.enum(["spouwmuur", "massief", "houtskelet", "onbekend"]).optional(),
        heatingSystem: z.enum(["cv_ketel", "warmtepomp", "stadsverwarming", "elektrisch", "geen", "onbekend"]).optional(),
        heatingYear: z.number().optional(),
        hotWaterSystem: z.enum(["combiketel", "boiler", "zonneboiler", "warmtepomp", "onbekend"]).optional(),
        hasSolarPanels: z.boolean().optional(),
        solarPanelCount: z.number().optional(),
        solarPanelYear: z.number().optional(),
        hasEVCharger: z.boolean().optional(),
        hasGasConnection: z.boolean().optional(),
        glazingType: z.enum(["enkel", "dubbel", "hr_plus", "hr_plus_plus", "triple", "gemengd", "onbekend"]).optional(),
        wallInsulation: z.enum(["aanwezig", "deels", "afwezig", "onbekend"]).optional(),
        roofInsulation: z.enum(["aanwezig", "deels", "afwezig", "onbekend"]).optional(),
        floorInsulation: z.enum(["aanwezig", "deels", "afwezig", "onbekend"]).optional(),
        // Blok 5: Verduurzaming
        targetEnergyLabel: z.enum(["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"]).optional(),
        gasVrijDoeljaar: z.number().optional(),
        sustainabilityMeasures: z.string().optional(),
        subsidiesApplied: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      const role = ctx.user.role as AccountRole;
      // Server-side three-layer enforcement: only admin/manager may write
      // Category A/B (system/validated) fields directly. comfortabel_employee
      // and any other actor reaching this procedure must use changeRequests.
      const isManager = role === "admin" || role === "manager";
      if (!isManager) {
        for (const field of Object.keys(data)) {
          const cat = fieldCategory(field);
          if (cat === "A" || cat === "B") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Veld '${field}' is beschermd (categorie ${cat}) en kan alleen via een wijzigverzoek worden aangepast.`,
            });
          }
        }
      }
      // Audit each changed field (especially protected A/B fields).
      const before = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
      await db.update(properties).set(data).where(eq(properties.id, id));
      // Trojan Horse: sync changed fields as data points (fire-and-forget)
      const isStaff = role === "admin" || role === "manager" || role === "comfortabel_employee";
      syncPropertyDataPoints(
        id,
        data as Record<string, unknown>,
        ctx.user.id,
        isStaff ? "comfortabel" : "klant",
        isStaff ? 80 : 50,
      ).catch(() => {/* silent */});
      for (const field of Object.keys(data)) {
        await writeAudit(db, {
          actorUserId: ctx.user.id,
          action: "property.update",
          entityType: "property",
          entityId: id,
          previousValue: { field, value: (before[0] as any)?.[field] ?? null },
          newValue: { field, value: (data as any)[field], category: fieldCategory(field) },
          ipAddress: clientIp(ctx.req),
        });
      }
      return { success: true };
    }),

  // Client can create their own property (linked to their customer record)
  createOwn: protectedProcedure
    .input(
      z.object({
        street: z.string(),
        houseNumber: z.string(),
        postalCode: z.string(),
        city: z.string(),
        propertyType: z.string().optional(),
        buildYear: z.number().optional(),
        area: z.number().optional(),
        residents: z.number().optional(),
        energyLabel: z.string().optional(),
      })
    )
    .mutation(async () => {
      // DEPRECATED in 1.0: this path bypassed address duplicate-prevention.
      // The client now uses passport.createOrClaim (unified create/claim flow).
      // Kept only so any stale client build fails loudly instead of silently
      // creating a duplicate passport.
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Deze functie is vervangen. Gebruik de nieuwe woning-/koppelflow (createOrClaim).",
      });
    }),
});

// ─── Inspections router ───────────────────────────────────────────────────────

const inspectionsRouter = t.router({
  listByProperty: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await assertPropertyAccess(db, { id: ctx.user.id, role: ctx.user.role as AccountRole }, input.propertyId);
      return db
        .select()
        .from(inspections)
        .where(eq(inspections.propertyId, input.propertyId))
        .orderBy(desc(inspections.inspectionDate));
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db
        .select()
        .from(inspections)
        .where(eq(inspections.id, input.id))
        .limit(1);
      if (!result[0]) throw new TRPCError({ code: "NOT_FOUND" });
      return result[0];
    }),

  getItems: protectedProcedure
    .input(z.object({ inspectionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db
        .select()
        .from(inspectionItems)
        .where(eq(inspectionItems.inspectionId, input.inspectionId))
        .orderBy(asc(inspectionItems.category), asc(inspectionItems.sortOrder));
    }),

  create: adminProcedure
    .input(
      z.object({
        propertyId: z.number(),
        type: z.enum(["nulmeting", "jaarlijks", "tussentijds", "calamiteit"]).default("nulmeting"),
        inspectionDate: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result = await db.insert(inspections).values({
        propertyId: input.propertyId,
        type: input.type,
        status: "concept",
        performedBy: ctx.user.id,
        inspectionDate: input.inspectionDate || new Date(),
      });

      const inspectionId = Number(result[0].insertId);

      // Create default checklist items based on type
      const defaultItems = getDefaultChecklistItems(input.type);
      if (defaultItems.length > 0) {
        await db.insert(inspectionItems).values(
          defaultItems.map((item, i) => ({
            ...item,
            inspectionId,
            sortOrder: i,
          }))
        );
      }

      return { id: inspectionId };
    }),

  updateItem: adminProcedure
    .input(
      z.object({
        id: z.number(),
        answer: z.enum(["goed", "aandacht", "urgent", "nvt", "onbekend"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(inspectionItems).set(data).where(eq(inspectionItems.id, id));
      return { success: true };
    }),

  finalize: adminProcedure
    .input(
      z.object({
        id: z.number(),
        summary: z.string().optional(),
        scoreInstallaties: z.number().min(0).max(100).optional(),
        scoreBouwkundig: z.number().min(0).max(100).optional(),
        scoreVeiligheid: z.number().min(0).max(100).optional(),
        scoreVochtVentilatie: z.number().min(0).max(100).optional(),
        scoreEnergie: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const scores = [
        input.scoreInstallaties,
        input.scoreBouwkundig,
        input.scoreVeiligheid,
        input.scoreVochtVentilatie,
        input.scoreEnergie,
      ].filter((s): s is number => s !== undefined);

      const totalScore =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : undefined;

      const woningGrade = totalScore !== undefined ? scoreToGrade(totalScore) : undefined;

      await db
        .update(inspections)
        .set({
          status: "afgerond",
          summary: input.summary,
          scoreInstallaties: input.scoreInstallaties,
          scoreBouwkundig: input.scoreBouwkundig,
          scoreVeiligheid: input.scoreVeiligheid,
          scoreVochtVentilatie: input.scoreVochtVentilatie,
          scoreEnergie: input.scoreEnergie,
          totalScore,
          woningGrade,
        })
        .where(eq(inspections.id, input.id));

      // Update property's last inspection date
      const inspection = await db
        .select()
        .from(inspections)
        .where(eq(inspections.id, input.id))
        .limit(1);
      if (inspection[0]) {
        await db
          .update(properties)
          .set({ lastInspectionDate: new Date() })
          .where(eq(properties.id, inspection[0].propertyId));
      }

      return { success: true, totalScore, woningGrade };
    }),
});

// ─── Maintenance router ───────────────────────────────────────────────────────

const maintenanceRouter = t.router({
  listIssues: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await assertPropertyAccess(db, { id: ctx.user.id, role: ctx.user.role as AccountRole }, input.propertyId);
      return db
        .select()
        .from(maintenanceIssues)
        .where(eq(maintenanceIssues.propertyId, input.propertyId))
        .orderBy(desc(maintenanceIssues.createdAt));
    }),

  createIssue: adminProcedure
    .input(
      z.object({
        propertyId: z.number(),
        inspectionId: z.number().optional(),
        title: z.string(),
        description: z.string().optional(),
        category: z.string().optional(),
        priority: z.enum(["laag", "normaal", "hoog", "urgent"]).default("normaal"),
        dueDate: z.date().optional(),
        estimatedCost: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(maintenanceIssues).values(input);
      return { id: Number(result[0].insertId) };
    }),

  updateIssue: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["open", "in_behandeling", "gepland", "afgerond"]).optional(),
        priority: z.enum(["laag", "normaal", "hoog", "urgent"]).optional(),
        notes: z.string().optional(),
        resolvedAt: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(maintenanceIssues).set(data).where(eq(maintenanceIssues.id, id));
      return { success: true };
    }),

  listPlanning: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await assertPropertyAccess(db, { id: ctx.user.id, role: ctx.user.role as AccountRole }, input.propertyId);
      return db
        .select()
        .from(maintenancePlanning)
        .where(eq(maintenancePlanning.propertyId, input.propertyId))
        .orderBy(asc(maintenancePlanning.plannedYear));
    }),

  createPlanning: adminProcedure
    .input(
      z.object({
        propertyId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        category: z.string().optional(),
        plannedYear: z.number().optional(),
        horizon: z.enum(["1jaar", "3jaar", "5jaar", "10jaar", "mjop"]).default("3jaar"),
        estimatedCost: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(maintenancePlanning).values(input);
      return { id: Number(result[0].insertId) };
    }),
});

// ─── Users router (admin) ─────────────────────────────────────────────────────

const usersRouter = t.router({
  list: staffProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      isFoundingMember: users.isFoundingMember,
      onboardingCompletedAt: users.onboardingCompletedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastSignedIn: users.lastSignedIn,
    }).from(users).orderBy(desc(users.createdAt));
  }),

  create: managerProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        role: z.enum(["user", "comfortabel_employee", "manager", "admin"]).default("user"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Check for duplicate email
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email.toLowerCase().trim()))
        .limit(1);
      if (existing[0]) {
        throw new TRPCError({ code: "CONFLICT", message: "Dit e-mailadres is al in gebruik" });
      }
      const passwordHash = await bcrypt.hash(input.password, 12);
      const result = await db.insert(users).values({
        name: input.name.trim(),
        email: input.email.toLowerCase().trim(),
        passwordHash,
        role: input.role,
        isActive: true,
      });
      return { id: Number(result[0].insertId) };
    }),

  setRole: managerProcedure
    .input(z.object({ id: z.number(), role: z.enum(["user", "comfortabel_employee", "manager", "admin"]) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const before = await db.select({ role: users.role }).from(users).where(eq(users.id, input.id)).limit(1);
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.id));
      await writeAudit(db, {
        actorUserId: ctx.user.id,
        action: "user.setRole",
        entityType: "user",
        entityId: input.id,
        previousValue: { role: before[0]?.role },
        newValue: { role: input.role },
        ipAddress: clientIp(ctx.req),
      });
      return { success: true };
    }),

  setActive: managerProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set({ isActive: input.isActive }).where(eq(users.id, input.id));
      // Deactivating an account also revokes its active property memberships
      // (access is removed) but the WoningPaspoort records themselves are kept.
      if (!input.isActive) {
        await db
          .update(propertyMembers)
          .set({ status: "revoked" })
          .where(and(eq(propertyMembers.userId, input.id), eq(propertyMembers.status, "active")));
      }
      await writeAudit(db, {
        actorUserId: ctx.user.id,
        action: input.isActive ? "user.activate" : "user.deactivate",
        entityType: "user",
        entityId: input.id,
        newValue: { isActive: input.isActive },
        ipAddress: clientIp(ctx.req),
      });
      return { success: true };
    }),

  /**
   * Delete a user (GDPR-style). Safe by design: this ANONYMIZES the account and
   * revokes its memberships, but KEEPS the WoningPaspoort + property history
   * intact (those belong to the address, not the person). Personal data is
   * scrubbed so the account can no longer sign in or be identified.
   */
  delete: managerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.id === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "U kunt uw eigen account niet verwijderen." });
      }
      // Revoke all memberships (passport history is preserved).
      await db.update(propertyMembers).set({ status: "revoked" }).where(eq(propertyMembers.userId, input.id));
      // Anonymize personal data and disable sign-in.
      const anonEmail = `deleted-${input.id}-${Date.now()}@deleted.invalid`;
      await db
        .update(users)
        .set({ name: "Verwijderde gebruiker", email: anonEmail, passwordHash: null, isActive: false })
        .where(eq(users.id, input.id));
      await writeAudit(db, {
        actorUserId: ctx.user.id,
        action: "user.delete",
        entityType: "user",
        entityId: input.id,
        newValue: { anonymized: true, passportHistoryPreserved: true },
        ipAddress: clientIp(ctx.req),
      });
      return { success: true };
    }),

  linkToCustomer: adminProcedure
    .input(z.object({ userId: z.number(), customerId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(customers)
        .set({ userId: input.userId })
        .where(eq(customers.id, input.customerId));
      return { success: true };
    }),
});

// ─── Documents router ────────────────────────────────────────────────────────

const documentsRouter = t.router({
  list: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await assertPropertyAccess(db, { id: ctx.user.id, role: ctx.user.role as AccountRole }, input.propertyId);
      return db
        .select()
        .from(documents)
        .where(eq(documents.propertyId, input.propertyId))
        .orderBy(desc(documents.createdAt));
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(documents).where(eq(documents.id, input.id));
      return { success: true };
    }),
});

// ─── Subscriptions router ────────────────────────────────────────────────────

const subscriptionsRouter = t.router({
  // Get feature flags for a given tier
  getFeatures: publicProcedure
    .input(z.object({ tier: z.enum(["free", "digital", "basis", "plus", "premium"]) }))
    .query(({ input }) => {
      return {
        tier: input.tier,
        features: PLAN_FEATURES[input.tier as SubscriptionTier],
        label: SUBSCRIPTION_LABELS[input.tier as SubscriptionTier],
        price: SUBSCRIPTION_PRICES[input.tier as SubscriptionTier],
        description: SUBSCRIPTION_DESCRIPTIONS[input.tier as SubscriptionTier],
      };
    }),

  // Get all tiers with their features (for pricing page)
  getAllTiers: publicProcedure.query(() => {
    const tiers: SubscriptionTier[] = ["free", "digital", "basis", "plus", "premium"];
    return tiers.map((tier) => ({
      tier,
      label: SUBSCRIPTION_LABELS[tier],
      price: SUBSCRIPTION_PRICES[tier],
      description: SUBSCRIPTION_DESCRIPTIONS[tier],
      features: PLAN_FEATURES[tier],
    }));
  }),

  // Admin: update subscription tier for a property
  setTier: adminProcedure
    .input(z.object({
      propertyId: z.number(),
      tier: z.enum(["free", "digital", "basis", "plus", "premium"]),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(properties).set({
        subscriptionType: input.tier,
        subscriptionActive: true,
        subscriptionStartDate: input.startDate,
        subscriptionEndDate: input.endDate,
      }).where(eq(properties.id, input.propertyId));
      return { success: true };
    }),

  // Admin: get subscription stats for dashboard
  getStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const allProperties = await db.select({
      subscriptionType: properties.subscriptionType,
      subscriptionActive: properties.subscriptionActive,
    }).from(properties);

    const tiers: SubscriptionTier[] = ["free", "digital", "basis", "plus", "premium"];
    const counts = tiers.reduce((acc, tier) => {
      acc[tier] = allProperties.filter(
        (p) => p.subscriptionType === tier && p.subscriptionActive
      ).length;
      return acc;
    }, {} as Record<SubscriptionTier, number>);

    return {
      total: allProperties.filter((p) => p.subscriptionActive).length,
      byTier: counts,
    };
  }),
});

// ─── Invitations router ─────────────────────────────────────────────────────

const invitationsRouter = t.router({
  // Send invitation email to a customer
  send: adminProcedure
    .input(z.object({
      customerId: z.number(),
      origin: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get customer
      const customerRows = await db.select().from(customers).where(eq(customers.id, input.customerId)).limit(1);
      const customer = customerRows[0];
      if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Klant niet gevonden" });

      // Get first property for address
      const propertyRows = await db.select({
        street: properties.street,
        houseNumber: properties.houseNumber,
        city: properties.city,
      }).from(properties).where(eq(properties.customerId, input.customerId)).limit(1);
      const property = propertyRows[0];
      const propertyAddress = property
        ? `${property.street} ${property.houseNumber}, ${property.city}`
        : undefined;

      // Generate invite token (valid 7 days)
      const { randomBytes } = await import("crypto");
      const token = randomBytes(48).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await db.insert(invitations).values({
        customerId: input.customerId,
        email: customer.email,
        token,
        invitedBy: ctx.user.id,
        expiresAt,
      });

      const inviteUrl = `${input.origin}/registreren?invite=${token}&email=${encodeURIComponent(customer.email)}`;
      const customerName = customer.type === "bedrijf" || customer.type === "vastgoed"
        ? (customer.companyName || customer.email)
        : `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || customer.email;

      const emailResult = await sendInvitationEmail({
        to: customer.email,
        name: customerName,
        inviteUrl,
        propertyAddress,
        invitedBy: ctx.user.name || "Comfortabel",
      });

      return {
        success: true,
        emailSent: emailResult.success,
        inviteUrl,
      };
    }),

  // List invitations for a customer
  listByCustomer: adminProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(invitations)
        .where(eq(invitations.customerId, input.customerId))
        .orderBy(desc(invitations.createdAt));
    }),
});

// ─── Passport router (1.0 address-bound model) ────────────────────────────────

const passportRouter = t.router({
  /**
   * Unified create-or-claim flow used by BOTH client self-registration and
   * admin creation. Computes normalizedAddressKey, checks for an existing
   * active passport at that address, and either:
   *   - creates a new passport with the actor as active owner, OR
   *   - registers a pending_applicant claim (NO access) awaiting admin confirm.
   */
  createOrClaim: protectedProcedure
    .input(
      z.object({
        street: z.string().min(1),
        houseNumber: z.string().min(1),
        addition: z.string().optional(),
        houseLetter: z.string().optional(),
        postalCode: z.string().min(1),
        city: z.string().min(1),
        propertyType: z
          .enum(["tussenwoning", "hoekwoning", "vrijstaand", "appartement", "bedrijfspand", "overig"])
          .optional(),
        buildYear: z.number().optional(),
        surfaceM2: z.number().optional(),
        residents: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Validate Dutch postal code so a clear typo is caught before we create
      // or claim a passport. The normalized key is casing/spacing independent,
      // but we still reject obviously malformed postal codes early.
      if (!isValidDutchPostalCode(input.postalCode)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ongeldige postcode. Gebruik het formaat 1234 AB.",
        });
      }
      input = { ...input, postalCode: normalizeDutchPostalCode(input.postalCode) };
      const ip = clientIp(ctx.req);
      const role = ctx.user.role as AccountRole;
      const key = normalizeAddressKey(input);

      // Look for an existing ACTIVE passport at this normalized address.
      const existing = await db
        .select()
        .from(properties)
        .where(and(eq(properties.normalizedAddressKey, key), eq(properties.isActive, true)))
        .limit(1);

      if (existing[0]) {
        const prop = existing[0];
        // Already a member?
        const existingMember = await getMembership(db, ctx.user.id, prop.id);
        if (existingMember.memberStatus === "active") {
          return { outcome: "already_member" as const, propertyId: prop.id };
        }
        if (existingMember.memberStatus === "pending") {
          return { outcome: "claim_pending" as const, propertyId: prop.id };
        }
        // Register a pending claim — NO access until an admin confirms.
        await db.insert(propertyMembers).values({
          propertyId: prop.id,
          userId: ctx.user.id,
          role: "pending_applicant",
          status: "pending",
        });
        await writeAudit(db, {
          actorUserId: ctx.user.id,
          action: "member.claim",
          entityType: "property",
          entityId: prop.id,
          newValue: { userId: ctx.user.id, role: "pending_applicant", status: "pending" },
          ipAddress: ip,
        });
        return { outcome: "claim_pending" as const, propertyId: prop.id };
      }

      // No existing passport → create new, actor becomes active owner.
      const createdByRole = (role === "comfortabel_employee" || role === "manager" || role === "admin")
        ? role
        : "user";
      const res = await db.insert(properties).values({
        street: input.street,
        houseNumber: input.houseNumber,
        addition: input.addition,
        houseLetter: input.houseLetter,
        postalCode: input.postalCode,
        city: input.city,
        normalizedAddressKey: key,
        propertyType: input.propertyType ?? "tussenwoning",
        buildYear: input.buildYear,
        surfaceM2: input.surfaceM2,
        residents: input.residents,
        subscriptionType: "free",
        addressSource: role === "user" ? "customer" : "admin",
        createdByRole: createdByRole as any,
        createdByUserId: ctx.user.id,
        // Optie A: a property created by a client (non-staff) starts awaiting
        // Comfortabel validation. Score/reports/Mati stay locked until staff
        // validates it. Staff-created properties go straight to "concept".
        status: role === "user" ? "wacht_op_validatie" : "concept",
        isActive: true,
      });
      const propertyId = Number((res[0] as any).insertId);
      await db.insert(propertyMembers).values({
        propertyId,
        userId: ctx.user.id,
        role: "owner",
        status: "active",
        confirmedBy: ctx.user.id,
        confirmedAt: new Date(),
      });
      await writeAudit(db, {
        actorUserId: ctx.user.id,
        action: "property.create",
        entityType: "property",
        entityId: propertyId,
        newValue: { normalizedAddressKey: key, role: "owner" },
        ipAddress: ip,
      });
      // Trojan Horse: sync all initial property fields as data points (fire-and-forget)
      syncNewProperty(propertyId, {
        street: input.street,
        houseNumber: input.houseNumber,
        postalCode: input.postalCode,
        city: input.city,
        propertyType: input.propertyType ?? "tussenwoning",
        buildYear: input.buildYear,
        surfaceM2: input.surfaceM2,
        residents: input.residents,
      }, ctx.user.id).catch(() => {/* silent */});

      // Idempotently ensure the owner has a personal Eigen Huis Dossier shell.
      // Covers accounts created before registration auto-created one (e.g. OAuth).
      try {
        const existingProfile = await db
          .select({ id: userProfile.id })
          .from(userProfile)
          .where(eq(userProfile.userId, ctx.user.id))
          .limit(1);
        if (!existingProfile[0]) {
          await db.insert(userProfile).values({ userId: ctx.user.id, preferredContact: "email", marketingOptIn: false });
        }
      } catch (e) {
        console.error("[passport.createOrClaim] ensureUserProfile failed", e);
      }
      return { outcome: "created" as const, propertyId };
    }),

  /** Personal "Eigen Huis Dossier" profile of the current user (Category C data). */
  myProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(userProfile).where(eq(userProfile.userId, ctx.user.id)).limit(1);
    if (rows[0]) return rows[0];
    // Lazily create the dossier shell if it does not exist yet.
    await db.insert(userProfile).values({ userId: ctx.user.id, preferredContact: "email", marketingOptIn: false });
    const created = await db.select().from(userProfile).where(eq(userProfile.userId, ctx.user.id)).limit(1);
    return created[0];
  }),

  /** Update own personal dossier — only Category C personal fields. */
  updateMyProfile: protectedProcedure
    .input(
      z.object({
        phone: z.string().max(30).optional(),
        preferredContact: z.enum(["email", "phone", "none"]).optional(),
        marketingOptIn: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select({ id: userProfile.id }).from(userProfile).where(eq(userProfile.userId, ctx.user.id)).limit(1);
      if (!existing[0]) {
        await db.insert(userProfile).values({ userId: ctx.user.id, preferredContact: "email", marketingOptIn: false });
      }
      await db.update(userProfile).set({
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.preferredContact !== undefined ? { preferredContact: input.preferredContact } : {}),
        ...(input.marketingOptIn !== undefined ? { marketingOptIn: input.marketingOptIn } : {}),
      }).where(eq(userProfile.userId, ctx.user.id));
      return { success: true };
    }),

  /** Passports the current user can actually see (active membership or legacy link). */
  myPassports: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    // Active memberships.
    const members = await db
      .select()
      .from(propertyMembers)
      .where(and(eq(propertyMembers.userId, ctx.user.id), eq(propertyMembers.status, "active")));
    const ids = new Set<number>(members.map((m) => m.propertyId));
    // Legacy bridge: properties linked via customers.userId.
    const linkedCustomers = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.userId, ctx.user.id));
    for (const c of linkedCustomers) {
      const props = await db
        .select({ id: properties.id })
        .from(properties)
        .where(eq(properties.customerId, c.id));
      props.forEach((p) => ids.add(p.id));
    }
    if (ids.size === 0) return [];
    const all = await db.select().from(properties).orderBy(desc(properties.createdAt));
    return all.filter((p) => ids.has(p.id) && p.isActive);
  }),

  /** Pending claims the current user has submitted (shown as "Aanvraag ontvangen"). */
  myPendingClaims: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db
      .select({
        memberId: propertyMembers.id,
        propertyId: propertyMembers.propertyId,
        status: propertyMembers.status,
        role: propertyMembers.role,
        createdAt: propertyMembers.createdAt,
        street: properties.street,
        houseNumber: properties.houseNumber,
        postalCode: properties.postalCode,
        city: properties.city,
      })
      .from(propertyMembers)
      .innerJoin(properties, eq(properties.id, propertyMembers.propertyId))
      .where(and(eq(propertyMembers.userId, ctx.user.id), eq(propertyMembers.status, "pending")));
    return rows;
  }),

  // ── Admin/staff claim management ──────────────────────────────────────────

  /** List all pending claims awaiting confirmation. */
  listClaims: staffProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db
      .select({
        memberId: propertyMembers.id,
        propertyId: propertyMembers.propertyId,
        userId: propertyMembers.userId,
        role: propertyMembers.role,
        status: propertyMembers.status,
        createdAt: propertyMembers.createdAt,
        userName: users.name,
        userEmail: users.email,
        street: properties.street,
        houseNumber: properties.houseNumber,
        postalCode: properties.postalCode,
        city: properties.city,
      })
      .from(propertyMembers)
      .innerJoin(users, eq(users.id, propertyMembers.userId))
      .innerJoin(properties, eq(properties.id, propertyMembers.propertyId))
      .where(eq(propertyMembers.status, "pending"))
      .orderBy(desc(propertyMembers.createdAt));
    return rows;
  }),

  /**
   * Optie A — properties awaiting Comfortabel validation (self-created by a
   * client). Distinct from claims: here the actor IS the owner, the property
   * just needs a 0-meting/validation before value features unlock.
   */
  listPendingValidation: staffProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db
      .select({
        propertyId: properties.id,
        street: properties.street,
        houseNumber: properties.houseNumber,
        postalCode: properties.postalCode,
        city: properties.city,
        propertyType: properties.propertyType,
        createdAt: properties.createdAt,
        ownerName: users.name,
        ownerEmail: users.email,
      })
      .from(properties)
      .leftJoin(users, eq(users.id, properties.createdByUserId))
      .where(and(eq(properties.status, "wacht_op_validatie"), eq(properties.isActive, true)))
      .orderBy(desc(properties.createdAt));
  }),

  /**
   * Validate (release) a property that was awaiting validation. Moves it out of
   * "wacht_op_validatie" so Woning Score, reports and Mati unlock for the owner.
   */
  validateProperty: staffProcedure
    .input(z.object({ propertyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const before = await db
        .select({ id: properties.id, status: properties.status })
        .from(properties)
        .where(eq(properties.id, input.propertyId))
        .limit(1);
      if (!before[0]) throw new TRPCError({ code: "NOT_FOUND" });
      await db
        .update(properties)
        .set({ status: "gevalideerd" })
        .where(eq(properties.id, input.propertyId));
      await writeAudit(db, {
        actorUserId: ctx.user.id,
        action: "property.validate",
        entityType: "property",
        entityId: input.propertyId,
        previousValue: { status: before[0].status },
        newValue: { status: "gevalideerd" },
        ipAddress: clientIp(ctx.req),
      });
      return { success: true };
    }),

  /** Members of one property (admin role-management view). */
  listMembers: staffProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db
        .select({
          memberId: propertyMembers.id,
          userId: propertyMembers.userId,
          role: propertyMembers.role,
          status: propertyMembers.status,
          confirmedAt: propertyMembers.confirmedAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(propertyMembers)
        .innerJoin(users, eq(users.id, propertyMembers.userId))
        .where(eq(propertyMembers.propertyId, input.propertyId));
    }),

  /** Confirm a pending claim: assign a real role and activate it. */
  confirmClaim: staffProcedure
    .input(
      z.object({
        memberId: z.number(),
        role: z.enum(["owner", "tenant", "partner", "business_manager"]).default("owner"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const before = await db
        .select()
        .from(propertyMembers)
        .where(eq(propertyMembers.id, input.memberId))
        .limit(1);
      if (!before[0]) throw new TRPCError({ code: "NOT_FOUND" });
      await db
        .update(propertyMembers)
        .set({ role: input.role, status: "active", confirmedBy: ctx.user.id, confirmedAt: new Date() })
        .where(eq(propertyMembers.id, input.memberId));
      await writeAudit(db, {
        actorUserId: ctx.user.id,
        action: "member.confirm",
        entityType: "propertyMember",
        entityId: input.memberId,
        previousValue: { role: before[0].role, status: before[0].status },
        newValue: { role: input.role, status: "active" },
        ipAddress: clientIp(ctx.req),
      });
      return { success: true };
    }),

  /** Mark onboarding as completed for the current user and auto-set Founding Member if ≤100 users. */
  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    // Count total users to determine founding member eligibility.
    const countResult = await db.select({ id: users.id }).from(users);
    const isFoundingMember = countResult.length <= 100;
    await db.update(users).set({
      onboardingCompletedAt: new Date(),
      isFoundingMember,
    }).where(eq(users.id, ctx.user.id));
    return { success: true, isFoundingMember };
  }),

  /** Get completeness score for a property (includes document/photo counts). */
  completeness: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await assertPropertyAccess(db, { id: ctx.user.id, role: ctx.user.role as AccountRole }, input.propertyId);
      const [prop] = await db.select().from(properties).where(eq(properties.id, input.propertyId)).limit(1);
      if (!prop) throw new TRPCError({ code: "NOT_FOUND" });
      // Count documents and photos for this property.
      const docs = await db.select({ id: documents.id, type: documents.type }).from(documents).where(eq(documents.propertyId, input.propertyId));
      const documentCount = docs.filter(d => d.type !== "foto").length;
      const photoCount = docs.filter(d => d.type === "foto").length;
      // Get user profile for phone/contact.
      const [profile] = await db.select().from(userProfile).where(eq(userProfile.userId, ctx.user.id)).limit(1);
      return calculateCompleteness({
        buildYear: prop.buildYear,
        surfaceM2: prop.surfaceM2,
        propertyType: prop.propertyType,
        energyLabel: prop.energyLabel,
        ownershipType: prop.ownershipType,
        foundationType: prop.foundationType,
        roofType: prop.roofType,
        heatingSystem: prop.heatingSystem,
        glazingType: prop.glazingType,
        wallInsulation: prop.wallInsulation,
        wozValue: prop.wozValue,
        purchasePrice: prop.purchasePrice,
        documentCount,
        photoCount,
        profilePhone: profile?.phone,
        preferredContact: profile?.preferredContact,
      });
    }),

  /** Request a 0-meting (physical inspection) for a property. */
  requestZeroMeasurement: protectedProcedure
    .input(z.object({
      propertyId: z.number(),
      phone: z.string().min(6).max(30),
      preferredDate: z.string().min(1),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await assertPropertyAccess(db, { id: ctx.user.id, role: ctx.user.role as AccountRole }, input.propertyId);
      const [prop] = await db.select().from(properties).where(eq(properties.id, input.propertyId)).limit(1);
      if (!prop) throw new TRPCError({ code: "NOT_FOUND" });
      const res = await db.insert(zeroMeasurementRequests).values({
        userId: ctx.user.id,
        propertyId: input.propertyId,
        phone: input.phone,
        preferredDate: input.preferredDate,
        notes: input.notes,
        status: "aangevraagd",
      });
      const reqId = Number((res[0] as any).insertId);
      // Notify Comfortabel owner.
      await notifyOwner({
        title: `Nieuwe 0-meting aanvraag — ${prop.street} ${prop.houseNumber}, ${prop.city}`,
        content: `Gebruiker ${ctx.user.name} (${ctx.user.email}) heeft een 0-meting aangevraagd.\n\nAdres: ${prop.street} ${prop.houseNumber}, ${prop.postalCode} ${prop.city}\nTelefoon: ${input.phone}\nVoorkeursdatum: ${input.preferredDate}\n${input.notes ? `Opmerkingen: ${input.notes}` : ""}`,
      });
      return { success: true, requestId: reqId };
    }),

  /** List all 0-meting requests (admin). */
  listZeroMeasurements: staffProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db
      .select({
        id: zeroMeasurementRequests.id,
        status: zeroMeasurementRequests.status,
        phone: zeroMeasurementRequests.phone,
        preferredDate: zeroMeasurementRequests.preferredDate,
        notes: zeroMeasurementRequests.notes,
        createdAt: zeroMeasurementRequests.createdAt,
        propertyId: zeroMeasurementRequests.propertyId,
        street: properties.street,
        houseNumber: properties.houseNumber,
        postalCode: properties.postalCode,
        city: properties.city,
        userName: users.name,
        userEmail: users.email,
      })
      .from(zeroMeasurementRequests)
      .innerJoin(properties, eq(properties.id, zeroMeasurementRequests.propertyId))
      .innerJoin(users, eq(users.id, zeroMeasurementRequests.userId))
      .orderBy(desc(zeroMeasurementRequests.createdAt));
  }),

  /** Update the status of a 0-meting request (staff only). */
  updateZeroMeasurementStatus: staffProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["aangevraagd", "ingepland", "uitgevoerd", "geannuleerd"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(zeroMeasurementRequests)
        .set({ status: input.status })
        .where(eq(zeroMeasurementRequests.id, input.id));
      await writeAudit(db, {
        actorUserId: ctx.user.id,
        action: "zeroMeasurement.statusUpdate",
        entityType: "zeroMeasurementRequest",
        entityId: input.id,
        newValue: { status: input.status },
        ipAddress: clientIp(ctx.req),
      });
      return { success: true };
    }),

  /** Reject or revoke a claim/membership. */
  revokeMember: staffProcedure
    .input(z.object({ memberId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const before = await db
        .select()
        .from(propertyMembers)
        .where(eq(propertyMembers.id, input.memberId))
        .limit(1);
      if (!before[0]) throw new TRPCError({ code: "NOT_FOUND" });
      await db
        .update(propertyMembers)
        .set({ status: "revoked" })
        .where(eq(propertyMembers.id, input.memberId));
      await writeAudit(db, {
        actorUserId: ctx.user.id,
        action: "member.revoke",
        entityType: "propertyMember",
        entityId: input.memberId,
        previousValue: { status: before[0].status },
        newValue: { status: "revoked" },
        ipAddress: clientIp(ctx.req),
      });
      return { success: true };
    }),
});

// ─── Change requests router (A/B field workflow) ──────────────────────────────

const changeRequestsRouter = t.router({
  /** Submit a change request for a locked (A/B) field, or apply C directly. */
  create: protectedProcedure
    .input(
      z.object({
        propertyId: z.number(),
        fieldName: z.string().min(1),
        proposedValue: z.string(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Must at least be able to access the property.
      const role = ctx.user.role as AccountRole;
      const allowed = await canUserAccessProperty(db, { id: ctx.user.id, role }, input.propertyId);
      if (!allowed) throw new TRPCError({ code: "FORBIDDEN" });
      const category = fieldCategory(input.fieldName);
      const membership = await getMembership(db, ctx.user.id, input.propertyId);
      // Category C fields don't use change requests.
      if (
        !requiresChangeRequest({
          category,
          accountRole: role,
          memberRole: membership.memberRole,
          memberStatus: membership.memberStatus,
        })
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Dit veld kan direct gewijzigd worden en vereist geen wijzigverzoek.",
        });
      }
      const prop = await db.select().from(properties).where(eq(properties.id, input.propertyId)).limit(1);
      const currentValue = prop[0] ? String((prop[0] as any)[input.fieldName] ?? "") : "";
      const res = await db.insert(changeRequests).values({
        propertyId: input.propertyId,
        requestedBy: ctx.user.id,
        fieldCategory: category === "C" ? "A" : (category as "A" | "B"),
        fieldName: input.fieldName,
        currentValue,
        proposedValue: input.proposedValue,
        note: input.note,
        status: "open",
      });
      const id = Number((res[0] as any).insertId);
      await writeAudit(db, {
        actorUserId: ctx.user.id,
        action: "changeRequest.create",
        entityType: "changeRequest",
        entityId: id,
        newValue: { fieldName: input.fieldName, proposedValue: input.proposedValue },
        ipAddress: clientIp(ctx.req),
      });
      return { id };
    }),

  /** List the current user's own change requests (any status), newest first. */
  listMine: protectedProcedure
    .input(z.object({ propertyId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conds = [eq(changeRequests.requestedBy, ctx.user.id)];
      if (input?.propertyId) conds.push(eq(changeRequests.propertyId, input.propertyId));
      return db
        .select()
        .from(changeRequests)
        .where(and(...conds))
        .orderBy(desc(changeRequests.createdAt));
    }),

  /** List all open change requests (staff review queue). */
  listOpen: staffProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db
      .select({
        id: changeRequests.id,
        propertyId: changeRequests.propertyId,
        requestedBy: changeRequests.requestedBy,
        fieldCategory: changeRequests.fieldCategory,
        fieldName: changeRequests.fieldName,
        currentValue: changeRequests.currentValue,
        proposedValue: changeRequests.proposedValue,
        note: changeRequests.note,
        status: changeRequests.status,
        createdAt: changeRequests.createdAt,
        requesterName: users.name,
        requesterEmail: users.email,
      })
      .from(changeRequests)
      .innerJoin(users, eq(users.id, changeRequests.requestedBy))
      .where(eq(changeRequests.status, "open"))
      .orderBy(desc(changeRequests.createdAt));
  }),

  /** Approve a change request: apply the proposed value to the property field. */
  approve: staffProcedure
    .input(z.object({ id: z.number(), reviewNote: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const cr = await db.select().from(changeRequests).where(eq(changeRequests.id, input.id)).limit(1);
      if (!cr[0]) throw new TRPCError({ code: "NOT_FOUND" });
      if (cr[0].status !== "open") throw new TRPCError({ code: "BAD_REQUEST", message: "Verzoek is al afgehandeld." });
      // Apply to property (only known columns).
      const field = cr[0].fieldName;
      await db
        .update(properties)
        .set({ [field]: cr[0].proposedValue } as any)
        .where(eq(properties.id, cr[0].propertyId));
      await db
        .update(changeRequests)
        .set({ status: "approved", reviewedBy: ctx.user.id, reviewedAt: new Date(), reviewNote: input.reviewNote })
        .where(eq(changeRequests.id, input.id));
      await writeAudit(db, {
        actorUserId: ctx.user.id,
        action: "changeRequest.approve",
        entityType: "property",
        entityId: cr[0].propertyId,
        previousValue: { [field]: cr[0].currentValue },
        newValue: { [field]: cr[0].proposedValue },
        ipAddress: clientIp(ctx.req),
      });
      return { success: true };
    }),

  /** Reject a change request without applying it. */
  reject: staffProcedure
    .input(z.object({ id: z.number(), reviewNote: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const cr = await db.select().from(changeRequests).where(eq(changeRequests.id, input.id)).limit(1);
      if (!cr[0]) throw new TRPCError({ code: "NOT_FOUND" });
      await db
        .update(changeRequests)
        .set({ status: "rejected", reviewedBy: ctx.user.id, reviewedAt: new Date(), reviewNote: input.reviewNote })
        .where(eq(changeRequests.id, input.id));
      await writeAudit(db, {
        actorUserId: ctx.user.id,
        action: "changeRequest.reject",
        entityType: "changeRequest",
        entityId: input.id,
        ipAddress: clientIp(ctx.req),
      });
      return { success: true };
    }),
});

// ─── App router ───────────────────────────────────────────────────────────────

export const appRouter = t.router({
  auth: authRouter,
  customers: customersRouter,
  properties: propertiesRouter,
  inspections: inspectionsRouter,
  maintenance: maintenanceRouter,
  users: usersRouter,
  documents: documentsRouter,
  subscriptions: subscriptionsRouter,
  invitations: invitationsRouter,
  passport: passportRouter,
  changeRequests: changeRequestsRouter,
});

export type AppRouter = typeof appRouter;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "E" {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "E";
}

function getDefaultChecklistItems(type: string) {
  const base = [
    // Installaties
    { category: "Installaties", subcategory: "CV", question: "CV-ketel: staat en ouderdom" },
    { category: "Installaties", subcategory: "CV", question: "CV-ketel: laatste onderhoud" },
    { category: "Installaties", subcategory: "Ventilatie", question: "Ventilatiesysteem: werking en reiniging" },
    { category: "Installaties", subcategory: "Elektra", question: "Meterkast: staat en veiligheid" },
    { category: "Installaties", subcategory: "Elektra", question: "Rookmelders: aanwezig en werkend" },
    { category: "Installaties", subcategory: "Water", question: "Waterleidingen: zichtbare staat" },
    // Bouwkundig
    { category: "Bouwkundig", subcategory: "Dak", question: "Dakbedekking: staat en leeftijd" },
    { category: "Bouwkundig", subcategory: "Dak", question: "Dakgoten: vrij en functioneel" },
    { category: "Bouwkundig", subcategory: "Gevel", question: "Gevel: schilderwerk en kitwerk" },
    { category: "Bouwkundig", subcategory: "Kozijnen", question: "Kozijnen: staat en afdichting" },
    { category: "Bouwkundig", subcategory: "Fundering", question: "Fundering: zichtbare scheuren of verzakking" },
    // Veiligheid
    { category: "Veiligheid", subcategory: "Brand", question: "Rookmelders: aanwezig op elke verdieping" },
    { category: "Veiligheid", subcategory: "Brand", question: "Koolmonoxidemelder: aanwezig bij CV" },
    { category: "Veiligheid", subcategory: "Inbraak", question: "Sloten: kwaliteit en staat" },
    // Vocht & Ventilatie
    { category: "Vocht & Ventilatie", subcategory: "Vocht", question: "Vochtplekken: aanwezig in muren/plafond" },
    { category: "Vocht & Ventilatie", subcategory: "Vocht", question: "Schimmel: aanwezig in badkamer/keuken" },
    { category: "Vocht & Ventilatie", subcategory: "Ventilatie", question: "Ventilatie badkamer: functioneel" },
    { category: "Vocht & Ventilatie", subcategory: "Ventilatie", question: "Ventilatie keuken: functioneel" },
    // Energie
    { category: "Energie", subcategory: "Isolatie", question: "Dakisolatie: aanwezig en staat" },
    { category: "Energie", subcategory: "Isolatie", question: "Gevelisolatie: aanwezig" },
    { category: "Energie", subcategory: "Glas", question: "Beglazing: dubbel glas aanwezig" },
    { category: "Energie", subcategory: "Label", question: "Energielabel: bekend en actueel" },
  ];

  return base;
}
