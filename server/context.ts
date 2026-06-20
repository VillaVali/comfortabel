import { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "mijncomfortabel-secret-key-2025"
);

export const COOKIE_NAME = "mc_session";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: "user" | "comfortabel_employee" | "manager" | "admin";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date | null;
};

export type TrpcContext = {
  req: Request;
  res: Response;
  user: SessionUser | null;
};

export async function verifySessionToken(token: string): Promise<{ userId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.sub) return null;
    return { userId: Number(payload.sub) };
  } catch {
    return null;
  }
}

export async function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<TrpcContext> {
  let user: SessionUser | null = null;

  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
      const parsed = await verifySessionToken(token);
      if (parsed) {
        const db = await getDb();
        if (db) {
          const result = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              role: users.role,
              isActive: users.isActive,
              createdAt: users.createdAt,
              updatedAt: users.updatedAt,
              lastSignedIn: users.lastSignedIn,
            })
            .from(users)
            .where(eq(users.id, parsed.userId))
            .limit(1);
          if (result[0] && result[0].isActive) {
            user = result[0] as SessionUser;
          }
        }
      }
    }
  } catch {
    // Invalid or expired token — ignore
  }

  return { req, res, user };
}

export async function createSessionToken(userId: number): Promise<string> {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}
