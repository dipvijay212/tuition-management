"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { api } from "@/lib/api/server";
import { makeAction } from "@/lib/utilities/action";
import { dateString, optionalEmail, optionalPhone, optionalText, requiredText } from "@/lib/validations/common";
import { assertRole } from "@/lib/auth/session";
import { friendlyError, type ActionResult } from "@/lib/utilities/errors";

const bool = z.preprocess((v) => v === "on" || v === "true", z.boolean());
const intList = z.string().optional().transform((v) => (v ?? "").split(",").map((x) => x.trim()).filter(Boolean).map(Number)).pipe(z.array(z.number().int().min(0).max(90)));

export const saveInstituteProfile = makeAction({
  roles: ["admin"],
  schema: z.object({
    name: requiredText("Institute name", 120),
    address: optionalText,
    phone: optionalPhone,
    email: optionalEmail,
    website: optionalText,
    timezone: requiredText("Timezone", 60),
    working_days: z.array(z.coerce.number().int().min(1).max(7)).min(1, "Select at least one working day"),
  }),
  arrays: ["working_days"],
  handler: async (v, _ctx, form) => {
    try { new Intl.DateTimeFormat("en", { timeZone: v.timezone }); } catch { return { ok: false, error: "Unknown timezone", fieldErrors: { timezone: ["Unknown timezone"] } }; }
    const body = new FormData();
    body.set("data", JSON.stringify(v));
    const logo = form.get("logo");
    if (logo instanceof File && logo.size > 0) body.set("logo", logo);
    await api("/settings/profile", { method: "POST", form: body });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Institute profile saved" };
  },
});

export const savePolicies = makeAction({
  roles: ["admin"],
  schema: z.object({
    admission_prefix: requiredText("Admission prefix", 10).regex(/^[A-Z0-9]+$/i, "Letters and numbers only").transform((s) => s.toUpperCase()),
    receipt_prefix: requiredText("Receipt prefix", 10).regex(/^[A-Z0-9]+$/i, "Letters and numbers only").transform((s) => s.toUpperCase()),
    default_due_day: z.coerce.number().int().min(1, "1–28").max(28, "1–28"),
    late_fee_enabled: bool,
    late_fee_type: z.enum(["fixed", "percent"]),
    late_fee_value: z.coerce.number().min(0),
    late_fee_grace_days: z.coerce.number().int().min(0).max(60),
    receipt_footer: optionalText,
    excused_attendance_policy: z.enum(["exclude", "count_present", "count_absent"]),
    late_counts_as_present: bool,
    attendance_correction_hours: z.coerce.number().int().min(0).max(720),
    notify_parent_on_absence: bool,
    results_require_approval: bool,
    allow_late_submission: bool,
    max_upload_mb: z.coerce.number().int().min(1).max(25),
    fee_reminder_days_before: intList,
    fee_reminder_on_due: bool,
    fee_reminder_days_after: intList,
    email_enabled: bool,
    min_password_length: z.coerce.number().int().min(8).max(64),
    show_birthdays: bool,
  }).refine((v) => v.late_fee_type !== "percent" || v.late_fee_value <= 100, { path: ["late_fee_value"], message: "Percentage cannot exceed 100" }),
  handler: async (v) => {
    await api("/settings/policies", { method: "PATCH", body: { ...v, receipt_footer: v.receipt_footer ?? null } });
    revalidatePath("/admin/settings");
    return { ok: true, message: "Settings saved" };
  },
});

export const saveEmailSettings = makeAction({
  roles: ["admin"],
  schema: z.object({
    email_enabled: bool,
    notify_parent_on_absence: bool,
  }),
  handler: async (v) => {
    await api("/settings/policies", { method: "PATCH", body: v });
    revalidatePath("/admin/settings");
    return { ok: true, message: "Email preferences saved" };
  },
});

export const saveAcademicYear = makeAction({
  roles: ["admin"],
  schema: z.object({ id: z.string().optional(), name: requiredText("Name", 20), start_date: dateString, end_date: dateString, is_current: bool })
    .refine((v) => v.end_date > v.start_date, { path: ["end_date"], message: "End date must be after start date" }),
  handler: async (v) => {
    await api("/settings/academic-years", { method: "POST", body: v });
    revalidatePath("/admin/settings");
    return { ok: true, message: "Academic year saved" };
  },
});

const gradeRow = z.object({ grade: requiredText("Grade", 5), min: z.coerce.number().min(0).max(100), max: z.coerce.number().min(0).max(100), is_pass: z.boolean() });

export async function saveGradingRules(rows: z.input<typeof gradeRow>[]): Promise<ActionResult> {
  try {
    await assertRole("admin");
    const parsed = z.array(gradeRow).min(1, "Add at least one grade").safeParse(rows);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const sorted = [...parsed.data].sort((a, b) => b.min - a.min);
    for (const r of sorted) if (r.max < r.min) return { ok: false, error: `Grade ${r.grade}: max must be ≥ min` };
    for (let i = 1; i < sorted.length; i++) if (sorted[i].max >= sorted[i - 1].min) return { ok: false, error: `Grades ${sorted[i - 1].grade} and ${sorted[i].grade} overlap` };
    if (new Set(sorted.map((r) => r.grade.toUpperCase())).size !== sorted.length) return { ok: false, error: "Grade names must be unique" };
    await api("/settings/grading-rules", { method: "PUT", body: sorted });
    revalidatePath("/admin/settings");
    return { ok: true, message: "Grading rules saved" };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export const sendTestEmailAction = makeAction({
  roles: ["admin"],
  schema: z.object({
    email: z.string().trim().email("Enter a valid email address"),
  }),
  handler: async (v) => {
    // The backend checks SMTP config, verifies the connection and sends the test email.
    const r = await api<{ message: string }>("/settings/test-email", { method: "POST", body: { email: v.email } });
    return { ok: true, message: r.message };
  },
});

export async function getSmtpStatusAction(): Promise<ActionResult<{
  configured: boolean;
  host: string;
  port: number;
  user: string;
  fromName: string;
  fromEmail: string;
}>> {
  try {
    await assertRole("admin");
    const s = await api<{ configured: boolean; host: string; port: number; user: string; fromName: string; fromEmail: string }>("/settings/smtp");
    return { ok: true, data: { configured: s.configured, host: s.host, port: s.port, user: s.user, fromName: s.fromName, fromEmail: s.fromEmail } };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}
