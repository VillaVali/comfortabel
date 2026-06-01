import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { createSessionToken, verifySessionToken, COOKIE_NAME } from "./context";

export const authRouter = Router();

function getCookieOptions(req: any) {
  const isSecure =
    req.headers["x-forwarded-proto"] === "https" || req.protocol === "https";
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

// POST /api/auth/login
authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail en wachtwoord zijn verplicht" });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database niet beschikbaar" });

    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    const user = result[0];

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Onjuist e-mailadres of wachtwoord" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Dit account is gedeactiveerd" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Onjuist e-mailadres of wachtwoord" });
    }

    // Update lastSignedIn
    await db
      .update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.id, user.id));

    const token = await createSessionToken(user.id);
    res.cookie(COOKIE_NAME, token, getCookieOptions(req));

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (err) {
    console.error("[Auth] Login error:", err);
    return res.status(500).json({ error: "Inloggen mislukt" });
  }
});

// POST /api/auth/logout
authRouter.post("/logout", (req, res) => {
  const isSecure =
    req.headers["x-forwarded-proto"] === "https" || req.protocol === "https";
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? "none" : "lax",
    path: "/",
  });
  return res.json({ success: true });
});

// GET /api/auth/me
authRouter.get("/me", async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.json(null);

    const payload = await verifySessionToken(token);
    if (!payload) return res.json(null);

    const db = await getDb();
    if (!db) return res.json(null);

    const result = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    const user = result[0];
    if (!user || !user.isActive) return res.json(null);

    return res.json(user);
  } catch {
    return res.json(null);
  }
});
