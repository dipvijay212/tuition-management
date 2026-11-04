"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { check, makeAction } from "@/lib/utilities/action";
import { dateString, optionalEmail, optionalPhone, optionalText, requiredText } from "@/lib/validations/common";
import { assertRole } from "@/lib/auth/session";
import { friendlyError, type ActionResult } from "@/lib/utilities/errors";
import { safeFileName } from "@/lib/supabase/storage";

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
  handler: async (v, ctx, form) => {
    const supabase = await createClient();
    const inst = ctx.institute!.id;
    const update: { name: string; address: string | null; phone: string | null; email: string | null; website: string | null; logo_path?: string } = { name: v.name, address: v.address ?? null, phone: v.phone ?? null, email: v.email ?? null, website: v.website ?? null };
    const logo = form.get("logo");
    if (logo instanceof File && logo.size > 0) {
      if (!["image/png", "image/jpeg", "image/webp"].includes(logo.type)) return { ok: false, error: "Logo must be PNG, JPG or WebP." };
      if (logo.size > 2 * 1024 * 1024) return { ok: false, error: "Logo must be smaller than 2 MB." };
      const path = `${inst}/${safeFileName(logo.name)}`;
      check(await supabase.storage.from("branding").upload(path, logo, { contentType: logo.type, upsert: false }));
      update.logo_path = path;
    }
    try { new Intl.DateTimeFormat("en", { timeZone: v.timezone }); } catch { return { ok: false, error: "Unknown timezone", fieldErrors: { timezone: ["Unknown timezone"] } }; }
    check(await supabase.from("institutes").update(update).eq("id", inst));
    check(await supabase.from("institute_settings").update({ timezone: v.timezone, working_days: v.working_days }).eq("institute_id", inst));
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
  handler: async (v, ctx) => {
    const supabase = await createClient();
    check(await supabase.from("institute_settings").update({ ...v, receipt_footer: v.receipt_footer ?? null }).eq("institute_id", ctx.institute!.id));
    revalidatePath("/admin/settings");
    return { ok: true, message: "Settings saved" };
  },
});

export const saveAcademicYear = makeAction({
  roles: ["admin"],
  schema: z.object({ id: z.string().optional(), name: requiredText("Name", 20), start_date: dateString, end_date: dateString, is_current: bool })
    .refine((v) => v.end_date > v.start_date, { path: ["end_date"], message: "End date must be after start date" }),
  handler: async (v, ctx) => {
    const supabase = await createClient();
    const inst = ctx.institute!.id;
    if (v.is_current) check(await supabase.from("academic_years").update({ is_current: false }).eq("institute_id", inst).eq("is_current", true));
    const row = { institute_id: inst, name: v.name, start_date: v.start_date, end_date: v.end_date, is_current: v.is_current };
    const saved = v.id
      ? check(await supabase.from("academic_years").update(row).eq("id", v.id).select("id").single())
      : check(await supabase.from("academic_years").insert(row).select("id").single());
    if (v.is_current) check(await supabase.from("institute_settings").update({ current_academic_year_id: saved.id }).eq("institute_id", inst));
    revalidatePath("/admin/settings");
    return { ok: true, message: "Academic year saved" };
  },
});

const gradeRow = z.object({ grade: requiredText("Grade", 5), min: z.coerce.number().min(0).max(100), max: z.coerce.number().min(0).max(100), is_pass: z.boolean() });

export async function saveGradingRules(rows: z.input<typeof gradeRow>[]): Promise<ActionResult> {
  try {
    const ctx = await assertRole("admin");
    const parsed = z.array(gradeRow).min(1, "Add at least one grade").safeParse(rows);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const sorted = [...parsed.data].sort((a, b) => b.min - a.min);
    for (const r of sorted) if (r.max < r.min) return { ok: false, error: `Grade ${r.grade}: max must be ≥ min` };
    for (let i = 1; i < sorted.length; i++) if (sorted[i].max >= sorted[i - 1].min) return { ok: false, error: `Grades ${sorted[i - 1].grade} and ${sorted[i].grade} overlap` };
    if (new Set(sorted.map((r) => r.grade.toUpperCase())).size !== sorted.length) return { ok: false, error: "Grade names must be unique" };
    const supabase = await createClient();
    const inst = ctx.institute!.id;
    check(await supabase.from("grading_rules").delete().eq("institute_id", inst));
    check(await supabase.from("grading_rules").insert(sorted.map((r, i) => ({ institute_id: inst, grade: r.grade, min_percentage: r.min, max_percentage: r.max, is_pass: r.is_pass, sort_order: i + 1 }))));
    await supabase.rpc("write_audit", { p_action: "grading_rules_updated", p_entity: "grading_rules", p_entity_id: inst, p_new: sorted });
    revalidatePath("/admin/settings");
    return { ok: true, message: "Grading rules saved" };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}
