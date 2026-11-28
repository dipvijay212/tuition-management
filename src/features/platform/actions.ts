"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { api, ApiError } from "@/lib/api/server";
import { assertPlatform } from "@/lib/auth/session";
import { friendlyError, type ActionResult } from "@/lib/utilities/errors";
import { formToObject } from "@/lib/utilities/action";
import { fieldErrors } from "@/lib/validations/common";

/** Platform-only server action: auth check -> zod -> handler -> friendly errors. The API checks the platform role again. */
function platformAction<S extends z.ZodType>(schema: S, handler: (v: z.infer<S>) => Promise<ActionResult>, arrays: string[] = []) {
  return async (_prev: ActionResult<unknown> | undefined, form: FormData): Promise<ActionResult> => {
    try {
      await assertPlatform();
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
    const parsed = schema.safeParse(formToObject(form, arrays));
    if (!parsed.success) return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    try {
      return await handler(parsed.data);
    } catch (e) {
      if (e instanceof ApiError) return { ok: false, error: e.message, fieldErrors: e.fieldErrors };
      return { ok: false, error: friendlyError(e) };
    }
  };
}

const optStr = z.string().trim().optional().transform((v) => v || null);
const optDate = z.string().optional().transform((v) => v || null).pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date").nullable());
/** Empty = unlimited (null). */
const optLimit = z.string().trim().optional().transform((v) => (v ? Number(v) : null)).pipe(z.number().int("Whole numbers only").min(0).nullable());
const bool = z.string().optional().transform((v) => v === "on" || v === "true");

const done = (message: string, ...paths: string[]): ActionResult => {
  paths.forEach((p) => revalidatePath(p));
  return { ok: true, message };
};

export const renewSubscription = platformAction(
  z.object({
    institute_id: z.uuid(),
    plan_id: z.uuid("Choose a plan"),
    billing_cycle: z.enum(["monthly", "yearly"]),
    periods: z.coerce.number().int().min(1, "At least 1").max(36),
    amount: z.string().trim().optional().transform((v) => (v ? Number(v) : null)).pipe(z.number().min(0, "Enter a valid amount").nullable()),
    method: optStr,
    reference: optStr,
    note: optStr,
  }),
  async ({ institute_id, ...v }) => {
    const r = await api<{ message: string }>(`/platform/institutes/${institute_id}/renew`, { method: "POST", body: v });
    return done(r.message, `/platform/institutes/${institute_id}`, "/platform");
  },
);

export const updateSubscription = platformAction(
  z.object({
    institute_id: z.uuid(),
    plan_id: z.uuid("Choose a plan"),
    status: z.enum(["trialing", "active", "cancelled"]),
    billing_cycle: z.enum(["monthly", "yearly"]),
    trial_ends_at: optDate,
    current_period_end: optDate,
    grace_days: z.coerce.number().int().min(0).max(60),
    notes: optStr,
  }),
  async ({ institute_id, ...v }) => {
    const r = await api<{ message: string }>(`/platform/institutes/${institute_id}/subscription`, { method: "PUT", body: v });
    return done(r.message, `/platform/institutes/${institute_id}`, "/platform");
  },
);

export const setInstituteStatus = platformAction(
  z.object({ institute_id: z.uuid(), status: z.enum(["active", "suspended"]), reason: z.string().trim().min(3, "Please give a reason") }),
  async ({ institute_id, ...v }) => {
    const r = await api<{ message: string }>(`/platform/institutes/${institute_id}/status`, { method: "POST", body: v });
    return done(r.message, `/platform/institutes/${institute_id}`, "/platform/institutes");
  },
);

export const updateInstitute = platformAction(
  z.object({
    institute_id: z.uuid(),
    name: z.string().trim().min(1, "Name is required").max(120),
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/, "4–12 letters or numbers"),
  }),
  async ({ institute_id, ...v }) => {
    const r = await api<{ message: string }>(`/platform/institutes/${institute_id}`, { method: "PATCH", body: v });
    return done(r.message, `/platform/institutes/${institute_id}`, "/platform/institutes");
  },
);

export const savePlan = platformAction(
  z.object({
    id: z.string().optional().transform((v) => v || null),
    code: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{2,30}$/, "Lowercase letters, numbers, - or _"),
    name: z.string().trim().min(1, "Name is required").max(60),
    description: optStr,
    price_monthly: z.coerce.number().min(0),
    price_yearly: z.coerce.number().min(0),
    max_students: optLimit,
    max_teachers: optLimit,
    max_batches: optLimit,
    storage_mb: optLimit,
    features: z.array(z.enum(["exams", "homework", "materials"])),
    trial_days: z.coerce.number().int().min(0).max(365),
    sort_order: z.coerce.number().int().min(0).max(1000),
    is_trial_default: bool,
    is_public: bool,
    is_active: bool,
  }),
  async ({ id, ...v }) => {
    const r = await api<{ message: string }>(id ? `/platform/plans/${id}` : "/platform/plans", { method: id ? "PUT" : "POST", body: v });
    return done(r.message, "/platform/plans");
  },
  ["features"],
);
