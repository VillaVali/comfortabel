import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { users, passwordResetTokens } from "../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import { randomBytes } from "crypto";
import { createSessionToken, verifySessionToken, COOKIE_NAME } from "./context";
import { sendPasswordResetEmail, sendWelcomeEmail, sendAdminNewUserEmail } from "./email";

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

// POST /api/auth/register
authRouter.post("/register", async (req, res) => {
  try {
    const { name, email, password, inviteToken } = req.body as { name?: string; email?: string; password?: string; inviteToken?: string };
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Naam, e-mail en wachtwoord zijn verplicht" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Wachtwoord moet minimaal 8 tekens bevatten" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Ongeldig e-mailadres" });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database niet beschikbaar" });

    // Check if email already in use
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Dit e-mailadres is al in gebruik" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.insert(users).values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "user",
      isActive: true,
    });
    const userId = Number((result[0] as any).insertId);

    // Handle invite token — link user to existing customer
    const { customers, invitations } = await import("../drizzle/schema");
    if (inviteToken) {
      const now = new Date();
      const inviteRows = await db.select().from(invitations)
        .where(and(eq(invitations.token, inviteToken), gt(invitations.expiresAt, now)))
        .limit(1);
      const invite = inviteRows[0];
      if (invite && !invite.acceptedAt) {
        // Link user to the invited customer
        await db.update(customers).set({ userId }).where(eq(customers.id, invite.customerId));
        // Mark invitation as accepted
        await db.update(invitations).set({ acceptedAt: now }).where(eq(invitations.id, invite.id));
        console.log(`[Auth] Invite accepted: user ${userId} linked to customer ${invite.customerId}`);
      }
    } else {
      // No invite — create a new customer record linked to this user
      try {
        await db.insert(customers).values({
          userId,
          email: email.toLowerCase().trim(),
          firstName: name.trim().split(" ")[0] || name.trim(),
          lastName: name.trim().split(" ").slice(1).join(" ") || null,
          type: "particulier",
          // createdBy omitted for self-registration (no admin context)
        });
        console.log(`[Auth] Customer record created for user ${userId}`);
      } catch (customerErr) {
        console.error(`[Auth] Failed to create customer for user ${userId}:`, customerErr);
        // Don't fail registration if customer creation fails
      }
    }

    // Send welcome email to new user
    const origin = req.headers.origin || `${req.protocol}://${req.headers.host}`;
    const loginUrl = `${origin}/inloggen`;
    sendWelcomeEmail({ to: email.toLowerCase().trim(), name: name.trim(), loginUrl }).catch((err) =>
      console.error(`[Auth] Welcome email failed for ${email}:`, err)
    );

    // Notify admin about new registration
    const adminEmail = process.env.ADMIN_EMAIL || "info@villavali.nl";
    sendAdminNewUserEmail({
      adminEmail,
      userName: name.trim(),
      userEmail: email.toLowerCase().trim(),
      registeredAt: new Date().toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" }),
    }).catch((err) => console.error(`[Auth] Admin notification failed:`, err));

    // Auto-login: create session
    const token = await createSessionToken(userId);
    res.cookie(COOKIE_NAME, token, getCookieOptions(req));

    return res.status(201).json({
      id: userId,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      role: "user",
    });
  } catch (err) {
    console.error("[Auth] Register error:", err);
    return res.status(500).json({ error: "Registratie mislukt" });
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

// POST /api/auth/forgot-password
authRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) return res.status(400).json({ error: "E-mail is verplicht" });

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database niet beschikbaar" });

    const result = await db.select({ id: users.id, name: users.name, email: users.email })
      .from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    const user = result[0];

    // Always return success to prevent email enumeration
    if (!user) return res.json({ success: true, message: "Als dit e-mailadres bekend is, ontvangt u een resetlink." });

    // Generate token (valid for 2 hours)
    const token = randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    await db.insert(passwordResetTokens).values({ userId: user.id, token, expiresAt });

    // Build reset URL from request origin
    const origin = req.headers.origin || `${req.protocol}://${req.headers.host}`;
    const resetUrl = `${origin}/wachtwoord-reset?token=${token}`;

    // Send reset email via Resend
    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      name: user.name || user.email,
      resetUrl,
    });

    if (!emailResult.success) {
      console.error(`[Auth] Failed to send reset email to ${user.email}:`, emailResult.error);
      // Still log the URL as fallback
      console.log(`[Auth] Password reset URL for ${user.email}: ${resetUrl}`);
    } else {
      console.log(`[Auth] Password reset email sent to ${user.email}`);
    }

    return res.json({
      success: true,
      message: "Als dit e-mailadres bekend is, ontvangt u een e-mail met een resetlink.",
      // In development, expose the token for testing
      ...(process.env.NODE_ENV === "development" ? { resetUrl } : {}),
    });
  } catch (err) {
    console.error("[Auth] Forgot password error:", err);
    return res.status(500).json({ error: "Verzoek mislukt" });
  }
});

// POST /api/auth/reset-password
authRouter.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token || !password) return res.status(400).json({ error: "Token en wachtwoord zijn verplicht" });
    if (password.length < 8) return res.status(400).json({ error: "Wachtwoord moet minimaal 8 tekens bevatten" });

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database niet beschikbaar" });

    const now = new Date();
    const tokenRows = await db.select().from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.token, token), gt(passwordResetTokens.expiresAt, now)))
      .limit(1);
    const resetToken = tokenRows[0];

    if (!resetToken || resetToken.usedAt) {
      return res.status(400).json({ error: "Ongeldige of verlopen resetlink" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await db.update(users).set({ passwordHash }).where(eq(users.id, resetToken.userId));
    await db.update(passwordResetTokens).set({ usedAt: now }).where(eq(passwordResetTokens.id, resetToken.id));

    return res.json({ success: true, message: "Wachtwoord succesvol gewijzigd" });
  } catch (err) {
    console.error("[Auth] Reset password error:", err);
    return res.status(500).json({ error: "Wachtwoord reset mislukt" });
  }
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
