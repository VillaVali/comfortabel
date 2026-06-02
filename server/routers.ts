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
} from "../drizzle/schema";
import { eq, desc, and, asc } from "drizzle-orm";

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
    // Find customer linked to this user
    const cust = await db
      .select()
      .from(customers)
      .where(eq(customers.userId, ctx.user.id))
      .limit(1);
    if (!cust[0]) return [];
    return db
      .select()
      .from(properties)
      .where(eq(properties.customerId, cust[0].id))
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
      // Access check for non-admin
      if (ctx.user.role !== "admin") {
        const cust = await db
          .select()
          .from(customers)
          .where(and(eq(customers.id, result[0].customerId), eq(customers.userId, ctx.user.id)))
          .limit(1);
        if (!cust[0]) throw new TRPCError({ code: "FORBIDDEN" });
      }
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
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(properties).values(input);
      return { id: Number(result[0].insertId) };
    }),

  update: adminProcedure
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
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(properties).set(data).where(eq(properties.id, id));
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
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Find or create customer record for this user
      let cust = await db
        .select()
        .from(customers)
        .where(eq(customers.userId, ctx.user.id))
        .limit(1);
      if (!cust[0]) {
        const res = await db.insert(customers).values({
          userId: ctx.user.id,
          email: ctx.user.email || "",
          firstName: ctx.user.name?.split(" ")[0] || ctx.user.name || "",
          lastName: ctx.user.name?.split(" ").slice(1).join(" ") || null,
          type: "particulier",
          createdBy: ctx.user.id,
        });
        cust = await db
          .select()
          .from(customers)
          .where(eq(customers.id, Number((res[0] as any).insertId)))
          .limit(1);
      }
      if (!cust[0]) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(properties).values({
        customerId: cust[0].id,
        street: input.street,
        houseNumber: input.houseNumber,
        postalCode: input.postalCode,
        city: input.city,
        propertyType: (input.propertyType as any) || "tussenwoning",
        buildYear: input.buildYear,
        surfaceM2: input.area,
        residents: input.residents,
        energyLabel: (input.energyLabel as any) || undefined,
        subscriptionType: "free",
      });
      return { id: Number((result[0] as any).insertId) };
    }),
});

// ─── Inspections router ───────────────────────────────────────────────────────

const inspectionsRouter = t.router({
  listByProperty: protectedProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Ownership check for non-admin
      if (ctx.user.role !== "admin") {
        const [prop] = await db.select().from(properties).where(eq(properties.id, input.propertyId)).limit(1);
        if (!prop) throw new TRPCError({ code: "NOT_FOUND" });
        const [cust] = await db.select().from(customers).where(and(eq(customers.id, prop.customerId), eq(customers.userId, ctx.user.id))).limit(1);
        if (!cust) throw new TRPCError({ code: "FORBIDDEN" });
      }
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
      // Ownership check for non-admin
      if (ctx.user.role !== "admin") {
        const [prop] = await db.select().from(properties).where(eq(properties.id, input.propertyId)).limit(1);
        if (!prop) throw new TRPCError({ code: "NOT_FOUND" });
        const [cust] = await db.select().from(customers).where(and(eq(customers.id, prop.customerId), eq(customers.userId, ctx.user.id))).limit(1);
        if (!cust) throw new TRPCError({ code: "FORBIDDEN" });
      }
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
      // Ownership check for non-admin
      if (ctx.user.role !== "admin") {
        const [prop] = await db.select().from(properties).where(eq(properties.id, input.propertyId)).limit(1);
        if (!prop) throw new TRPCError({ code: "NOT_FOUND" });
        const [cust] = await db.select().from(customers).where(and(eq(customers.id, prop.customerId), eq(customers.userId, ctx.user.id))).limit(1);
        if (!cust) throw new TRPCError({ code: "FORBIDDEN" });
      }
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
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastSignedIn: users.lastSignedIn,
    }).from(users).orderBy(desc(users.createdAt));
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        role: z.enum(["user", "admin"]).default("user"),
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

  setRole: adminProcedure
    .input(z.object({ id: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.id));
      return { success: true };
    }),

  setActive: adminProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set({ isActive: input.isActive }).where(eq(users.id, input.id));
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
      // Ownership check for non-admin
      if (ctx.user.role !== "admin") {
        const [prop] = await db.select().from(properties).where(eq(properties.id, input.propertyId)).limit(1);
        if (!prop) throw new TRPCError({ code: "NOT_FOUND" });
        const [cust] = await db.select().from(customers).where(and(eq(customers.id, prop.customerId), eq(customers.userId, ctx.user.id))).limit(1);
        if (!cust) throw new TRPCError({ code: "FORBIDDEN" });
      }
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
