"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { check, makeAction } from "@/lib/utilities/action";
import { optionalDate, optionalText, optionalUuid, requiredText } from "@/lib/validations/common";
import { assertRole } from "@/lib/auth/session";
import { friendlyError, type ActionResult } from "@/lib/utilities/errors";
import { todayIn } from "@/lib/utilities/format";

const time = z.string().optional().transform((v) => v || undefined).pipe(z.string().regex(/^\d{2}:\d{2}/, "Enter a valid time").optional());

export const saveBatch = makeAction({
  roles: ["admin"],
  arrays: ["class_days", "teacher_ids", "subject_ids"],
  schema: z.object({
    id: optionalUuid,
    name: requiredText("Batch name", 80),
    class_id: z.uuid("Select a class"),
    academic_year_id: optionalUuid,
    start_date: optionalDate,
    end_date: optionalDate,
    class_days: z.array(z.coerce.number().int().min(1).max(7)).min(1, "Select at least one day"),
    start_time: time,
    end_time: time,
    capacity: z.string().optional().transform((v) => (v ? Number(v) : null)).refine((v) => v === null || (Number.isInteger(v) && v > 0), "Capacity must be a positive whole number"),
    room: optionalText,
    status: z.enum(["active", "inactive"]).default("active"),
    teacher_ids: z.array(z.uuid()),
    subject_ids: z.array(z.uuid()),
  }).superRefine((v, c) => {
    if (v.start_time && v.end_time && v.end_time <= v.start_time) c.addIssue({ code: "custom", path: ["end_time"], message: "End time must be after start time" });
    if (v.start_date && v.end_date && v.end_date < v.start_date) c.addIssue({ code: "custom", path: ["end_date"], message: "End date must be on or after start date" });
  }),
  handler: async (v, ctx) => {
    const supabase = await createClient();
    const inst = ctx.institute!.id;
    const row = {
      institute_id: inst, name: v.name, class_id: v.class_id, academic_year_id: v.academic_year_id ?? null,
      start_date: v.start_date ?? null, end_date: v.end_date ?? null, class_days: v.class_days,
      start_time: v.start_time ?? null, end_time: v.end_time ?? null, capacity: v.capacity, room: v.room ?? null, status: v.status,
    };
    const saved = v.id
      ? check(await supabase.from("batches").update(row).eq("id", v.id).select("id").single())
      : check(await supabase.from("batches").insert(row).select("id").single());
    const batchId = saved.id;

    // Sync teachers (history kept: removed assignments are deactivated, not deleted).
    const { data: current } = await supabase.from("teacher_batches").select("id, teacher_id").eq("batch_id", batchId).eq("is_active", true);
    const currentIds = new Set((current ?? []).map((c) => c.teacher_id));
    const toRemove = (current ?? []).filter((c) => !v.teacher_ids.includes(c.teacher_id)).map((c) => c.id);
    const toAdd = v.teacher_ids.filter((t) => !currentIds.has(t));
    if (toRemove.length) check(await supabase.from("teacher_batches").update({ is_active: false, end_date: todayIn(ctx.timezone) }).in("id", toRemove));
    if (toAdd.length) check(await supabase.from("teacher_batches").insert(toAdd.map((t) => ({ institute_id: inst, teacher_id: t, batch_id: batchId }))));

    // Sync subjects.
    const { data: subs } = await supabase.from("batch_subjects").select("id, subject_id").eq("batch_id", batchId);
    const subIds = new Set((subs ?? []).map((s) => s.subject_id));
    const subRemove = (subs ?? []).filter((s) => !v.subject_ids.includes(s.subject_id)).map((s) => s.id);
    const subAdd = v.subject_ids.filter((s) => !subIds.has(s));
    if (subRemove.length) check(await supabase.from("batch_subjects").delete().in("id", subRemove));
    if (subAdd.length) check(await supabase.from("batch_subjects").insert(subAdd.map((s) => ({ institute_id: inst, batch_id: batchId, subject_id: s }))));

    await supabase.rpc("write_audit", { p_action: v.id ? "batch_updated" : "batch_created", p_entity: "batches", p_entity_id: batchId, p_new: { ...row, teacher_ids: v.teacher_ids, subject_ids: v.subject_ids } });
    revalidatePath("/admin/batches");
    return { ok: true, message: v.id ? "Batch updated" : "Batch created", data: { id: batchId } };
  },
});

export async function enrollStudents(batchId: string, studentIds: string[], startDate: string, overrideReason?: string): Promise<ActionResult<{ count: number }>> {
  try {
    const ctx = await assertRole("admin");
    if (!studentIds.length) return { ok: false, error: "Select at least one student." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { ok: false, error: "Choose a valid start date." };
    const supabase = await createClient();
    // Insert one at a time so the capacity trigger counts correctly and errors are specific.
    let count = 0;
    for (const sid of studentIds) {
      const { error } = await supabase.from("student_batches").insert({ institute_id: ctx.institute!.id, student_id: sid, batch_id: batchId, start_date: startDate, capacity_override_reason: overrideReason?.trim() || null, created_by: ctx.userId });
      if (error) {
        revalidatePath(`/admin/batches/${batchId}`);
        return { ok: false, error: `${count} enrolled. Stopped: ${friendlyError(error)}` };
      }
      count++;
    }
    revalidatePath(`/admin/batches/${batchId}`);
    return { ok: true, message: `${count} student(s) enrolled`, data: { count } };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function endEnrolment(enrolmentId: string, reason: string): Promise<ActionResult> {
  try {
    const ctx = await assertRole("admin");
    if (reason.trim().length < 5) return { ok: false, error: "Please give a reason (at least 5 characters)." };
    const supabase = await createClient();
    const { data: e } = await supabase.from("student_batches").select("id, batch_id, start_date, status").eq("id", enrolmentId).single();
    if (!e || e.status !== "active") return { ok: false, error: "Active enrolment not found." };
    const today = todayIn(ctx.timezone);
    check(await supabase.from("student_batches").update({ status: "ended", end_date: today < e.start_date ? e.start_date : today, end_reason: reason.trim() }).eq("id", enrolmentId));
    revalidatePath(`/admin/batches/${e.batch_id}`);
    return { ok: true, message: "Student removed from batch (history kept)" };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

export async function searchEnrollableStudents(batchId: string, q: string) {
  await assertRole("admin");
  const supabase = await createClient();
  const { data: enrolled } = await supabase.from("student_batches").select("student_id").eq("batch_id", batchId).eq("status", "active");
  const exclude = (enrolled ?? []).map((e) => e.student_id);
  let query = supabase.from("students").select("id, full_name, admission_no, classes(name)").eq("status", "active").order("full_name").limit(20);
  if (q.trim()) { const t = `%${q.trim().replace(/[%_,()\\]/g, "")}%`; query = query.or(`full_name.ilike.${t},admission_no.ilike.${t}`); }
  if (exclude.length) query = query.not("id", "in", `(${exclude.join(",")})`);
  const { data } = await query;
  return (data ?? []).map((s) => ({ id: s.id, name: s.full_name, admission_no: s.admission_no, class: s.classes?.name ?? null }));
}
