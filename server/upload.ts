import express from "express";
import multer from "multer";
import { getDb } from "./db";
import { documents } from "../drizzle/schema";
import { jwtVerify } from "jose";
import { COOKIE_NAME } from "./context";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL!;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY!;
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "mijncomfortabel-secret-key-2025"
);

// Middleware: require admin
async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) { res.status(401).json({ error: "Niet ingelogd" }); return; }
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
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
