import { z } from "zod";

/** Normalise Indian mobile numbers to 10 digits. */
export function normalizePhone(v: string) {
  let d = (v ?? "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
}

export const phoneSchema = z
  .string()
  .trim()
  .transform(normalizePhone)
  .refine((v) => /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit mobile number");

export const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? normalizePhone(v) : undefined))
  .refine((v) => !v || /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit mobile number");

export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .refine((v) => !v || z.email().safeParse(v).success, "Enter a valid email address")
  .transform((v) => v || undefined);

export const optionalText = z.string().trim().optional().transform((v) => v || undefined);
export const requiredText = (label: string, max = 200) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);
export const uuid = z.uuid("Invalid selection");
export const optionalUuid = z.string().optional().transform((v) => v || undefined).pipe(z.uuid().optional());
export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");
export const optionalDate = z.string().optional().transform((v) => v || undefined).pipe(dateString.optional());
export const money = z.coerce.number({ message: "Enter an amount" }).refine((n) => Number.isFinite(n), "Enter an amount").refine((n) => Math.round(n * 100) === n * 100, "At most 2 decimal places");

export function passwordSchema(min = 8) {
  return z
    .string()
    .min(min, `Password must be at least ${min} characters`)
    .max(72, "Password is too long")
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/\d/, "Password must contain a number");
}

export function fieldErrors(err: z.ZodError) {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const k = issue.path.join(".") || "_";
    (out[k] ??= []).push(issue.message);
  }
  return out;
}
