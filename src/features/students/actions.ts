"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertRole } from "@/lib/auth/session";
import { provisionAccount } from "@/lib/auth/provision";
import { friendlyError, type ActionResult } from "@/lib/utilities/errors";
import { check, makeAction } from "@/lib/utilities/action";
import { fieldErrors, optionalEmail, optionalPhone, optionalText, requiredText } from "@/lib/validations/common";
import { safeFileName, validateUpload } from "@/lib/supabase/storage";
import { admissionSchema, type AdmissionInput } from "./schema";
import { todayIn } from "@/lib/utilities/format";

export async function admitStudent(input: AdmissionInput): Promise<ActionResult<{ id: string; admission_no: string; notes: string[] }>> {
  let ctx;
  try { ctx = await assertRole("admin"); } catch (e) { return { ok: false, error: (e as Error).message }; }
  const parsed = admissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  if (v.guardians.filter((g) => g.is_primary).length !== 1) return { ok: false, error: "Mark exactly one parent/guardian as primary contact." };

  const supabase = await createClient();
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
  };
  const { data, error } = await supabase.rpc("admit_student", { p: payload });
  if (error) return { ok: false, error: friendlyError(error) };
  const result = data as { student_id: string; admission_no: string; obligations_created: number };

  // Account invitations (after the admission transaction committed; failures don't undo the admission).
  const notes: string[] = [];
  if (result.obligations_created) notes.push(`${result.obligations_created} fee installment(s) created`);
  const primary = v.guardians.find((g) => g.is_primary)!;
  if (v.create_parent_login) {
    if (!primary.email) notes.push("Parent login not created: primary parent has no email");
    else {
      try {
        const acc = await provisionAccount(ctx, { email: primary.email, phone: primary.phone, fullName: primary.full_name, role: "parent", mode: "invite" });
        const admin = createAdminClient();
        await admin.from("guardians").update({ profile_id: acc.userId }).eq("institute_id", ctx.institute!.id).eq("phone", primary.phone);
        notes.push(acc.invited ? "Parent invitation emailed" : "Linked to the parent's existing login");
      } catch (e) { notes.push(`Parent login not created: ${(e as Error).message}`); }
    }
  }
  if (v.create_student_login) {
    if (!v.email) notes.push("Student login not created: student has no email");
    else {
      try {
        const acc = await provisionAccount(ctx, { email: v.email, phone: v.phone || null, fullName: v.full_name, role: "student", mode: "invite" });
        await createAdminClient().from("students").update({ profile_id: acc.userId }).eq("id", result.student_id);
        notes.push(acc.invited ? "Student invitation emailed" : "Linked to the student's existing login");
      } catch (e) { notes.push(`Student login not created: ${(e as Error).message}`); }
    }
  }
  revalidatePath("/admin/students");
  return { ok: true, message: `Admitted with number ${result.admission_no}`, data: { id: result.student_id, admission_no: result.admission_no, notes } };
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
    const supabase = await createClient();
    const { id, ...rest } = v;
    check(await supabase.from("students").update({
      ...rest, date_of_birth: rest.date_of_birth ?? null, gender: rest.gender || null, blood_group: rest.blood_group ?? null, phone: rest.phone ?? null,
      email: rest.email ?? null, address: rest.address ?? null, city: rest.city ?? null, state: rest.state ?? null, pin_code: rest.pin_code || null,
      school_name: rest.school_name ?? null, class_id: rest.class_id || null, previous_academics: rest.previous_academics ?? null,
    }).eq("id", id));
    revalidatePath(`/admin/students/${id}`);
    return { ok: true, message: "Student updated" };
  },
});

export async function changeStudentStatus(studentId: string, status: "active" | "inactive" | "on_hold" | "discontinued" | "completed", reason: string): Promise<ActionResult> {
  try {
    await assertRole("admin");
    const supabase = await createClient();
    check(await supabase.rpc("change_student_status", { p_student: studentId, p_status: status, p_reason: reason }));
    revalidatePath(`/admin/students/${studentId}`);
    return { ok: true, message: "Status updated" };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function transferStudent(enrolmentId: string, toBatch: string, date: string, reason: string, override?: string): Promise<ActionResult> {
  try {
    await assertRole("admin");
    const supabase = await createClient();
    check(await supabase.rpc("transfer_student_batch", { p_enrolment: enrolmentId, p_to_batch: toBatch, p_date: date, p_reason: reason, p_capacity_override: override || undefined }));
    revalidatePath("/admin/students", "layout");
    return { ok: true, message: "Student transferred" };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function uploadStudentDocument(form: FormData): Promise<ActionResult> {
  try {
    const ctx = await assertRole("admin");
    const studentId = String(form.get("student_id"));
    const title = String(form.get("title") ?? "").trim();
    const file = form.get("file");
    if (!title) return { ok: false, error: "Enter a document title." };
    if (!(file instanceof File)) return { ok: false, error: "Choose a file." };
    const supabase = await createClient();
    const { data: s } = await supabase.from("institute_settings").select("max_upload_mb").single();
    const err = validateUpload(file, s?.max_upload_mb ?? 10, ["application/pdf", "image/png", "image/jpeg", "image/webp"]);
    if (err) return { ok: false, error: err };
    const path = `${ctx.institute!.id}/students/${studentId}/${safeFileName(file.name)}`;
    check(await supabase.storage.from("files").upload(path, file, { contentType: file.type }));
    check(await supabase.from("student_documents").insert({ institute_id: ctx.institute!.id, student_id: studentId, title, file_path: path, mime_type: file.type, size_bytes: file.size, uploaded_by: ctx.userId }));
    revalidatePath(`/admin/students/${studentId}`);
    return { ok: true, message: "Document uploaded" };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function uploadStudentPhoto(form: FormData): Promise<ActionResult> {
  try {
    const ctx = await assertRole("admin");
    const studentId = String(form.get("student_id"));
    const file = form.get("file");
    if (!(file instanceof File)) return { ok: false, error: "Choose a photo." };
    const err = validateUpload(file, 2, ["image/png", "image/jpeg", "image/webp"]);
    if (err) return { ok: false, error: err };
    const supabase = await createClient();
    const path = `${ctx.institute!.id}/students/${studentId}/photo-${safeFileName(file.name)}`;
    check(await supabase.storage.from("files").upload(path, file, { contentType: file.type }));
    check(await supabase.from("students").update({ photo_path: path }).eq("id", studentId));
    revalidatePath(`/admin/students/${studentId}`);
    return { ok: true, message: "Photo updated" };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function createFamilyLogin(kind: "student" | "parent", id: string): Promise<ActionResult> {
  try {
    const ctx = await assertRole("admin");
    const supabase = await createClient();
    const admin = createAdminClient();
    if (kind === "student") {
      const { data: s } = await supabase.from("students").select("id, full_name, email, phone, profile_id").eq("id", id).single();
      if (!s) return { ok: false, error: "Student not found." };
      if (s.profile_id) return { ok: false, error: "This student already has a login." };
      if (!s.email) return { ok: false, error: "Add the student's email first." };
      const acc = await provisionAccount(ctx, { email: s.email, phone: s.phone, fullName: s.full_name, role: "student", mode: "invite" });
      await admin.from("students").update({ profile_id: acc.userId }).eq("id", id);
      revalidatePath(`/admin/students/${id}`);
      return { ok: true, message: acc.invited ? "Invitation emailed to the student" : "Linked to existing login" };
    }
    const { data: g } = await supabase.from("guardians").select("id, full_name, email, phone, profile_id").eq("id", id).single();
    if (!g) return { ok: false, error: "Parent not found." };
    if (g.profile_id) return { ok: false, error: "This parent already has a login." };
    if (!g.email) return { ok: false, error: "Add the parent's email first." };
    const acc = await provisionAccount(ctx, { email: g.email, phone: g.phone, fullName: g.full_name, role: "parent", mode: "invite" });
    await admin.from("guardians").update({ profile_id: acc.userId }).eq("id", id);
    revalidatePath("/admin/students", "layout");
    return { ok: true, message: acc.invited ? "Invitation emailed to the parent" : "Linked to the parent's existing login" };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export const saveGuardian = makeAction({
  roles: ["admin"],
  schema: z.object({ id: z.uuid(), full_name: requiredText("Name", 100), alt_phone: optionalPhone, email: optionalEmail }),
  handler: async (v) => {
    const supabase = await createClient();
    check(await supabase.from("guardians").update({ full_name: v.full_name, alt_phone: v.alt_phone ?? null, email: v.email ?? null }).eq("id", v.id));
    revalidatePath("/admin/students", "layout");
    return { ok: true, message: "Parent details updated" };
  },
});

export async function admissionDefaults() {
  const ctx = await assertRole("admin");
  return { today: todayIn(ctx.timezone) };
}
