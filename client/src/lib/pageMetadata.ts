type PageMetadata = {
  title: string;
  description: string;
  canonicalUrl: string;
};

function setMeta(
  selector: string,
  attribute: "name" | "property",
  key: string,
  content: string
) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function setPageMetadata({
  title,
  description,
  canonicalUrl,
}: PageMetadata): () => void {
  const previousTitle = document.title;
  document.title = title;
  setMeta('meta[name="description"]', "name", "description", description);
  setMeta('meta[property="og:title"]', "property", "og:title", title);
  setMeta(
    'meta[property="og:description"]',
    "property",
    "og:description",
    description
  );
  setMeta('meta[property="og:type"]', "property", "og:type", "website");
  setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);

  let canonical = document.head.querySelector<HTMLLinkElement>(
    'l…172986 tokens truncated…_URL!;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY!;

// Middleware: require admin
async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) { res.status(401).json({ error: "Niet ingelogd" }); return; }
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload.sub) { res.status(401).json({ error: "Ongeldige sessie" }); return; }
    // Fetch user role from DB
    const db = await getDb();
    if (!db) { res.status(500).json({ error: "Database niet beschikbaar" }); return; }
    const { users } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const result = await db.select({ role: users.role, isActive: users.isActive }).from(users).where(eq(users.id, Number(payload.sub))).limit(1);
    if (!result[0] || !result[0].isActive || result[0].role !== "admin") { res.status(403).json({ error: "Geen toegang" }); return; }
    next();
  } catch {
    res.status(401).json({ error: "Ongeldige sessie" });
  }
}

// Middleware: require any authenticated user (client upload)
async function requireUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) { res.status(401).json({ error: "Niet ingelogd" }); return; }
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload.sub) { res.status(401).json({ error: "Ongeldige sessie" }); return; }
    const db = await getDb();
    if (!db) { res.status(500).json({ error: "Database niet beschikbaar" }); return; }
    const { users } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const result = await db.select({ id: users.id, role: users.role, isActive: users.isActive }).from(users).where(eq(users.id, Number(payload.sub))).limit(1);
    if (!result[0] || !result[0].isActive) { res.status(403).json({ error: "Geen toegang" }); return; }
    (req as any).userId = result[0].id;
    (req as any).userRole = result[0].role;
    next();
  } catch {
    res.status(401).json({ error: "Ongeldige sessie" });
  }
}

// POST /api/upload/client — client-side document/photo upload (any authenticated user)
// Allowed types: foto, keuring, overig (not rapport/factuur which are staff-generated)
const ALLOWED_CLIENT_TYPES = ["foto", "keuring", "overig"];
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const clientUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

router.post("/client", requireUser, clientUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: "Geen bestand ontvangen" }); return; }
    if (!ALLOWED_MIME.includes(req.file.mimetype)) {
      res.status(400).json({ error: "Bestandstype niet toegestaan. Gebruik PDF, JPG, PNG of Word." }); return;
    }
    const { propertyId, title, type = "foto" } = req.body;
    if (!propertyId) { res.status(400).json({ error: "propertyId is verplicht" }); return; }
    if (!ALLOWED_CLIENT_TYPES.includes(type)) {
      res.status(400).json({ error: "Type niet toegestaan voor klant-upload" }); return;
    }
    // Verify the user has access to this property.
    const db = await getDb();
    if (!db) { res.status(500).json({ error: "Database niet beschikbaar" }); return; }
    const { propertyMembers, customers, properties } = await import("../drizzle/schema");
    const { eq, or, and } = await import("drizzle-orm");
    const userId = (req as any).userId as number;
    const userRole = (req as any).userRole as string;
    const propId = Number(propertyId);
    // Staff always has access; clients need an active membership or customer link.
    if (userRole !== "admin" && userRole !== "manager" && userRole !== "comfortabel_employee") {
      const member = await db.select({ id: propertyMembers.id })
        .from(propertyMembers)
        .where(and(eq(propertyMembers.propertyId, propId), eq(propertyMembers.userId, userId), eq(propertyMembers.status, "active")))
        .limit(1);
      if (!member[0]) {
        // Legacy: check via customer link
        const cust = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, userId)).limit(1);
        if (cust[0]) {
          const prop = await db.select({ id: properties.id }).from(properties)
            .where(and(eq(properties.id, propId), eq(properties.customerId, cust[0].id))).limit(1);
          if (!prop[0]) { res.status(403).json({ error: "Geen toegang tot deze woning" }); return; }
        } else {
          res.status(403).json({ error: "Geen toegang tot deze woning" }); return;
        }
      }
    }
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileKey = `documents/client/${Date.now()}_${safeName}`;
    const form = new FormData();
    form.append("file", new Blob([req.file.buffer], { type: req.file.mimetype }), safeName);
    form.append("path", fileKey);
    const forgeRes = await fetch(`${FORGE_URL}/v1/storage/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${FORGE_KEY}` },
      body: form as unknown as BodyInit,
    });
    if (!forgeRes.ok) { res.status(500).json({ error: "Upload mislukt" }); return; }
    const { url: fileUrl } = await forgeRes.json() as { url: string };
    const result = await db.insert(documents).values({
      propertyId: propId,
      uploadedBy: userId,
      type: type as "foto" | "keuring" | "overig",
      title: title || req.file.originalname,
      fileUrl,
      fileKey,
      mimeType: req.file.mimetype,
    });
    res.json({ id: Number((result[0] as { insertId: number }).insertId), fileUrl, fileKey });
  } catch (err) {
    console.error("Client upload error:", err);
    res.status(500).json({ error: "Onverwachte fout bij upload" });
  }
});

// POST /api/upload — upload a document and save to DB
router.post("/", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: "Geen bestand ontvangen" }); return; }

    const { propertyId, title, type = "overig" } = req.body;
    if (!propertyId) { res.status(400).json({ error: "propertyId is verplicht" }); return; }

    const fileExt = req.file.originalname.split(".").pop() || "bin";
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileKey = `documents/${Date.now()}_${safeName}`;

    // Upload to Forge storage
    const form = new FormData();
    form.append("file", new Blob([req.file.buffer], { type: req.file.mimetype }), safeName);
    form.append("path", fileKey);

    const forgeRes = await fetch(`${FORGE_URL}/v1/storage/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${FORGE_KEY}` },
      body: form as unknown as BodyInit,
    });

    if (!forgeRes.ok) {
      const err = await forgeRes.text();
      console.error("Forge upload error:", err);
      res.status(500).json({ error: "Upload mislukt" }); return;
    }

    const { url: fileUrl } = await forgeRes.json() as { url: string };

    // Save to DB
    const db = await getDb();
    if (!db) { res.status(500).json({ error: "Database niet beschikbaar" }); return; }

    const result = await db.insert(documents).values({
      propertyId: Number(propertyId),
      type: type as "rapport" | "offerte" | "factuur" | "keuring" | "foto" | "overig",
      title: title || req.file.originalname,
      fileUrl,
      fileKey,
      mimeType: req.file.mimetype,
    });

    res.json({ id: Number((result[0] as { insertId: number }).insertId), fileUrl, fileKey });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Onverwachte fout bij upload" });
  }
});

export { router as uploadRouter };
