import type { MySql2Database } from "drizzle-orm/mysql2";
import { and, desc, eq } from "drizzle-orm";
import { propertyMembers, customers, properties } from "../../drizzle/schema";
import {
  canAccessSensitiveData,
  type AccountRole,
  type MemberRole,
  type MemberStatus,
} from "./passport";

export interface MembershipInfo {
  memberRole: MemberRole | null;
  memberStatus: MemberStatus | null;
}

/**
 * Resolve the most relevant membership row for (user, property).
 * Prefers an active row; otherwise returns the most recent row.
 */
export async function getMembership(
  db: MySql2Database,
  userId: number,
  propertyId: number,
): Promise<MembershipInfo> {
  const rows = await db
    .select()
    .from(propertyMembers)
    .where(and(eq(propertyMembers.userId, userId), eq(propertyMembers.propertyId, propertyId)))
    .orderBy(desc(propertyMembers.updatedAt));

  if (rows.length === 0) return { memberRole: null, memberStatus: null };

  const active = rows.find((r) => r.status === "active");
  const chosen = active ?? rows[0];
  return {
    memberRole: chosen.role as MemberRole,
    memberStatus: chosen.status as MemberStatus,
  };
}

/**
 * Whether `user` may read sensitive data for `property`.
 *
 * Bridge logic during transition: a property may still be linked only through
 * the legacy customers.userId path (no propertyMembers row yet). We treat such a
 * legacy owner link as an active "owner" membership so existing clients keep
 * access until migration backfills propertyMembers.
 */
export async function canUserAccessProperty(
  db: MySql2Database,
  user: { id: number; role: AccountRole },
  propertyId: number,
): Promise<boolean> {
  // Staff override.
  if (canAccessSensitiveData({ accountRole: user.role })) return true;

  const membership = await getMembership(db, user.id, propertyId);
  if (
    canAccessSensitiveData({
      accountRole: user.role,
      memberRole: membership.memberRole,
      memberStatus: membership.memberStatus,
    })
  ) {
    return true;
  }

  // Legacy bridge: linked via customers.userId.
  const prop = await db
    .select({ customerId: properties.customerId })
    .from(properties)
    .where(eq(properties.id, propertyId))
    .limit(1);
  const customerId = prop[0]?.customerId;
  if (customerId == null) return false;

  const cust = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.userId, user.id)))
    .limit(1);
  return Boolean(cust[0]);
}

/**
 * Throw a tRPC FORBIDDEN error unless `user` may read sensitive data for
 * `property`. Use this in every sensitive read endpoint (inspections,
 * documents, chat, pdf, maintenance) so the rights model is enforced
 * consistently — staff roles AND propertyMembers AND legacy bridge — instead of
 * ad-hoc `role !== "admin"` checks.
 */
export async function assertPropertyAccess(
  db: MySql2Database,
  user: { id: number; role: AccountRole },
  propertyId: number,
): Promise<void> {
  const ok = await canUserAccessProperty(db, user, propertyId);
  if (!ok) {
    // Lazy import to avoid a hard dependency cycle at module load.
    const { TRPCError } = await import("@trpc/server");
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Geen toegang tot deze woning.",
    });
  }
}
