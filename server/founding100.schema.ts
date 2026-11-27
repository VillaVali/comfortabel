import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform(value => value || undefined);

export const founding100LeadSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    email: z.string().trim().email().max(320),
    phone: optionalText(30),
    postalCode: optionalText(10),
    message: optionalText(1000),
    privacyAccepted: z.literal(true),
    contactConsent: z.literal(true),
    marketingOptIn: z.boolean().optional().default(false),
    company: optionalText(200),
    attribution: z
      .object({
        utmSource: optionalText(200),
        utmMedium: optionalText(200),
        utmCampaign: optionalText(200),
        utmTerm: optionalText(200),
        utmContent: optionalText(200),
        referrer: optionalText(2000),
        landingPath: optionalText(500),
      })
      .optional(),
  })
  .strict();

export function normalizePostalCode(value?: string): string | undefined {
  return value ? value.replace(/\s+/g, "").toUpperCase() : undefined;
}
