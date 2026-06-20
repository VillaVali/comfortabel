import type { MySql2Database } from "drizzle-orm/mysql2";
import { auditLog } from "../../drizzle/schema";

/**
 * Write an audit-log entry. ALL mutations in the 1.0 model should call this so
 * that "who did what, when, on which entity, old → new value" is always traceable.
 *
 * Never throws: an audit failure must not break the underlying business action,
 * but it is logged to the server console for monitoring.
 */
export async function writeAudit(
  db: MySql2Database,
  entry: {
    actorUserId?: number | null;
    action: string; // e.g. "property.create", "member.confirm", "field.update", "passport.merge"
    entityType: string; // e.g. "property", "propertyMember", "user", "changeRequest"
    entityId?: number | null;
    previousValue?: unknown;
    newValue?: unknown;
    ipAddress?: string | null;
  },
): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actorUserId: entry.actorUserId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      previousValue:
        entry.previousValue === undefined ? null : JSON.stringify(entry.previousValue),
      newValue: entry.newValue === undefined ? null : JSON.stringify(entry.newValue),
      ipAddress: entry.ipAddress ?? null,
    });
  } catch (err) {
    console.warn("[audit] failed to write audit entry:", entry.action, err);
  }
}

/** Extract a best-effort client IP from an Express-style request. */
export function clientIp(req: {
  headers?: Record<string, unknown>;
  ip?: string;
  socket?: { remoteAddress?: string };
}): string | null {
  const xff = req.headers?.["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    return xff.split(",")[0]?.trim() ?? null;
  }
  return req.ip ?? req.socket?.remoteAddress ?? null;
}
