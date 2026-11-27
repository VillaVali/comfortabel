const productionRequired = [
  "DATABASE_URL",
  "JWT_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "LEAD_NOTIFICATION_EMAIL",
  "PUBLIC_APP_URL",
] as const;

export function validateProductionEnvironment(): void {
  if (process.env.NODE_ENV !== "production") return;

  const missing = productionRequired.filter(name => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(", ")}`
    );
  }

  if ((process.env.JWT_SECRET?.length ?? 0) < 32) {
    throw new Error(
      "JWT_SECRET must contain at least 32 characters in production"
    );
  }

  if (process.env.FOUNDING100_STORAGE_MODE !== "database") {
    throw new Error("FOUNDING100_STORAGE_MODE must be database in production");
  }

  if (process.env.FOUNDING100_EMAIL_MODE !== "live") {
    throw new Error("FOUNDING100_EMAIL_MODE must be live in production");
  }
}
