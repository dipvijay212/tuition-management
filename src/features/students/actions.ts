"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { api } from "@/lib/api/server";
import { assertRole } from "@/lib/auth/session";
import { friendlyError, type ActionResult } from "@/lib/utilities/errors";
import { makeAction } from "@/lib/utilities/action";
import { fieldErrors, optionalEmail, optionalPhone, optionalText, requiredText } from "@/lib/validations/common";
import { admissionSchema, type AdmissionInput } from "./schema";
import { todayIn } from "@/lib/utilities/format";

export async function admitStudent(input: AdmissionInput): Promise<ActionResult<{ id: string; admission_no: string; notes: string[] }>> {
  try { await assertRole("admin"); } catch (e) { return { ok: false, error: (e as Error).message }; }
  const parsed = admissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  if (v.guardians.filter((g) => g.is_primary).length !== 1) return { ok: false, error: "Mark exactly one parent/guardian as primary contact." };

  const payload = {
    student: {
      full_name: v.full_name, date_of_birth: v.date_of_birth || null, gender: v.gender || null, blood_group: v.blood_group || null,
      address: v.address || null, city: v.city || null, state: v.state || null, pin_code: v.pin_code || null, phone: v.phone || null, email: v.email || null,
      school_name: v.school_name || null, class_id: v.class_id, academic_year_id: v.academic_year_id || null, subject_ids: v.subject_ids,
      admission_date: v.admission_date, previous_academics: v.previous_academics || null, admission_no: v.admission_no || null,
    },
    guardians: v.guardians.map((g) => ({ ...g, alt_phone: g.alt_phone || null, email: g.email || null })),
    batch_ids: v.batch_ids,
    capacity_override_reason: v.capacity_override_reason || null,
    fees: v.fees.map((f) => ({ ...f, fee_structure_id: f.fee_structure_id || null, discount_id: f.discount_id || null, discount_reason: f.discount_reason || null })),
    create_parent_login: !!v.create_parent_login,
    create_student_login: !!v.create_student_login,
  };
  try {
    // The backend admits in one transaction, then sends invitations and the welcome email.
    const r = await api<{ message: string; id: string; admission_no: string; notes: string[] }>("/students/admit", { method: "POST", body: payload });
    revalidatePath("/admin/students");
    return { ok: true, message: r.message, data: { id: r.id, admission_no: r.admission_no, notes: r.notes } };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export const updateStudent = makeAction({
  roles: ["admin"],
  arrays: ["subject_ids"],
  schema: z.object({
    id: z.uuid(), full_name: requiredText("Student name", 100), date_of_birth: optionalText, gender: z.enum(["", "male", "female", "other"]).optional(),
    blood_group: optionalText, phone: optionalPhone, email: optionalEmail, address: optionalText, city: optionalText, state: optionalText,
    pin_code: z.string().trim().optional().refine((v) => !v || /^\d{6}$/.test(v), "PIN code must be 6 digits"),
    school_name: optionalText, class_id: z.string().optional(), subject_ids: z.array(z.uuid()), previous_academics: optionalText,
  }),
  handler: async (v) => {
    const { id, ...rest } = v;
    await api(`/students/${encodeURIComponent(id)}`, { method: "PATCH", body: rest });
    revalidatePath(`/admin/students/${id}`);
    return { ok: true, message: "Student updated" };
  },
});

export async function changeStudentStatus(studentId: string, status: "active" | "inactive" | "on_hold" | "discontinued" | "completed", reason: string): Promise<ActionResult> {
  try {
    await assertRole("admin");
    await api(`/students/${encodeURIComponent(studentId)}/status`, { method: "POST", body: { status, reason } });
    revalidatePath(`/admin/students/${studentId}`);
    return { ok: true, message: "Status updated" };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function transferStudent(enrolmentId: string, toBatch: string, date: string, reason: string, override?: string): Promise<ActionResult> {
  try {
    await assertRole("admin");
    await api(`/students/enrolments/${encodeURIComponent(enrolmentId)}/transfer`, { method: "POST", body: { to_batch: toBatch, date, reason, override: override || null } });
    revalidatePath("/admin/students", "layout");
    return { ok: true, message: "Student transferred" };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function uploadStudentDocument(form: FormData): Promise<ActionResult> {
  try {
    await assertRole("admin");
    const studentId = String(form.get("student_id"));
    const title = String(form.get("title") ?? "").trim();
    const file = form.get("file");
    if (!title) return { ok: false, error: "Enter a document title." };
    if (!(file instanceof File)) return { ok: false, error: "Choose a file." };
    const body = new FormData();
    body.set("data", JSON.stringify({ title }));
    body.set("file", file);
    await api(`/students/${encodeURIComponent(studentId)}/documents`, { method: "POST", form: body });
    revalidatePath(`/admin/students/${studentId}`);
    return { ok: true, message: "Document uploaded" };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function uploadStudentPhoto(form: FormData): Promise<ActionResult> {
  try {
    await assertRole("admin");
    const studentId = String(form.get("student_id"));
    const file = form.get("file");
    if (!(file instanceof File)) return { ok: false, error: "Choose a photo." };
    const body = new FormData();
    body.set("file", file);
    await api(`/students/${encodeURIComponent(studentId)}/photo`, { method: "POST", form: body });
    revalidatePath(`/admin/students/${studentId}`);
    return { ok: true, message: "Photo updated" };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function createFamilyLogin(kind: "student" | "parent", id: string): Promise<ActionResult> {
  try {
    await assertRole("admin");
    const r = await api<{ message: string }>("/students/family-login", { method: "POST", body: { kind, id } });
    revalidatePath(kind === "student" ? `/admin/students/${id}` : "/admin/students", kind === "student" ? undefined : "layout");
    return { ok: true, message: r.message };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export const saveGuardian = makeAction({
  roles: ["admin"],
  schema: z.object({ id: z.uuid(), full_name: requiredText("Name", 100), alt_phone: optionalPhone, email: optionalEmail }),
  handler: async (v) => {
    await api(`/students/guardians/${encodeURIComponent(v.id)}`, { method: "PATCH", body: { full_name: v.full_name, alt_phone: v.alt_phone ?? null, email: v.email ?? null } });
    revalidatePath("/admin/students", "layout");
    return { ok: true, message: "Parent details updated" };
  },
});

export async function admissionDefaults() {
  const ctx = await assertRole("admin");
  return { today: todayIn(ctx.timezone) };
}
