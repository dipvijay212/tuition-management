"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { api } from "@/lib/api/server";
import { makeAction } from "@/lib/utilities/action";
import { optionalDate, optionalText, optionalUuid, requiredText } from "@/lib/validations/common";
import { assertRole } from "@/lib/auth/session";
import { friendlyError, type ActionResult } from "@/lib/utilities/errors";

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
  handler: async (v) => {
    const r = await api<{ message: string; id: string }>("/batches", { method: "POST", body: v });
    revalidatePath("/admin/batches");
    return { ok: true, message: r.message, data: { id: r.id } };
  },
});

export async function enrollStudents(batchId: string, studentIds: string[], startDate: string, overrideReason?: string): Promise<ActionResult<{ count: number }>> {
  try {
    await assertRole("admin");
    if (!studentIds.length) return { ok: false, error: "Select at least one student." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { ok: false, error: "Choose a valid start date." };
    const r = await api<{ ok: boolean; count: number; message?: string; error?: string }>(`/batches/${encodeURIComponent(batchId)}/enrol`, {
      method: "POST",
      body: { student_ids: studentIds, start_date: startDate, override_reason: overrideReason?.trim() || null },
    });
    revalidatePath(`/admin/batches/${batchId}`);
    return r.ok ? { ok: true, message: r.message, data: { count: r.count } } : { ok: false, error: r.error ?? "Something went wrong." };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function endEnrolment(enrolmentId: string, reason: string): Promise<ActionResult> {
  try {
    await assertRole("admin");
    if (reason.trim().length < 5) return { ok: false, error: "Please give a reason (at least 5 characters)." };
    const r = await api<{ message: string; batch_id: string }>(`/batches/enrolments/${encodeURIComponent(enrolmentId)}/end`, { method: "POST", body: { reason } });
    revalidatePath(`/admin/batches/${r.batch_id}`);
    return { ok: true, message: r.message };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

export async function searchEnrollableStudents(batchId: string, q: string) {
  await assertRole("admin");
  return api<{ id: string; name: string; admission_no: string; class: string | null }[]>(`/batches/${encodeURIComponent(batchId)}/enrollable`, { query: { q: q.trim() } });
}
