"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { check, makeAction } from "@/lib/utilities/action";
import { dateString, optionalDate, optionalEmail, optionalText, optionalUuid, passwordSchema, phoneSchema, requiredText } from "@/lib/validations/common";
import { provisionAccount } from "@/lib/auth/provision";

const teacherSchema = z.object({
  id: optionalUuid,
  full_name: requiredText("Full name", 100),
  phone: phoneSchema,
  email: optionalEmail,
  address: optionalText,
  qualification: optionalText,
  specialization: optionalText,
  subject_ids: z.array(z.uuid()),
  joining_date: optionalDate,
  employment_status: z.enum(["active", "on_leave", "resigned", "terminated"]).default("active"),
  monthly_salary: z.string().optional().transform((v) => (v ? Number(v) : null)).refine((v) => v === null || (Number.isFinite(v) && v >= 0), "Enter a valid salary"),
  account_mode: z.enum(["none", "invite", "password"]).default("none"),
  password: z.string().optional(),
}).superRefine((v, c) => {
  if (v.account_mode !== "none" && !v.email) c.addIssue({ code: "custom", path: ["email"], message: "Email is required to create a login" });
  if (v.account_mode === "password") {
    const r = passwordSchema(8).safeParse(v.password ?? "");
    if (!r.success) c.addIssue({ code: "custom", path: ["password"], message: r.error.issues[0].message });
  }
});

export const saveTeacher = makeAction({
  roles: ["admin"],
  schema: teacherSchema,
  arrays: ["subject_ids"],
  handler: async (v, ctx, form) => {
    const supabase = await createClient();
    const photo = form.get("photo");
    const row = {
      institute_id: ctx.institute!.id, full_name: v.full_name, phone: v.phone, email: v.email ?? null, address: v.address ?? null,
      qualification: v.qualification ?? null, specialization: v.specialization ?? null, subject_ids: v.subject_ids,
      joining_date: v.joining_date ?? null, employment_status: v.employment_status, monthly_salary: v.monthly_salary,
    };
    const saved = v.id
      ? check(await supabase.from("teachers").update(row).eq("id", v.id).select("id, profile_id").single())
      : check(await supabase.from("teachers").insert(row).select("id, profile_id").single());

    if (photo instanceof File && photo.size > 0) {
      if (!["image/png", "image/jpeg", "image/webp"].includes(photo.type) || photo.size > 2 * 1024 * 1024) return { ok: false, error: "Photo must be a PNG/JPG/WebP image under 2 MB." };
      const path = `${ctx.institute!.id}/teachers/${saved.id}/photo-${Date.now()}.${photo.type.split("/")[1]}`;
      check(await supabase.storage.from("files").upload(path, photo, { contentType: photo.type }));
      check(await supabase.from("teachers").update({ photo_path: path }).eq("id", saved.id));
    }

    let message = v.id ? "Teacher updated" : "Teacher added";
    if (v.account_mode !== "none" && !saved.profile_id) {
      const acc = await provisionAccount(ctx, { email: v.email!, phone: v.phone, fullName: v.full_name, role: "teacher", mode: v.account_mode, password: v.password });
      check(await supabase.from("teachers").update({ profile_id: acc.userId }).eq("id", saved.id));
      message += acc.invited ? ". Invitation email sent." : acc.created ? ". Login created." : ". Linked to existing login.";
    }
    // Deactivating staff: suspend login too (history is kept).
    if (saved.profile_id && ["resigned", "terminated"].includes(v.employment_status)) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      await createAdminClient().from("profiles").update({ status: "inactive" }).eq("id", saved.profile_id);
    }
    revalidatePath("/admin/teachers");
    return { ok: true, message, data: { id: saved.id } };
  },
});

export const markTeacherAttendance = makeAction({
  roles: ["admin"],
  schema: z.object({ teacher_id: z.uuid(), attendance_date: dateString, status: z.enum(["present", "absent", "late", "leave"]), remarks: optionalText }),
  handler: async (v, ctx) => {
    const supabase = await createClient();
    check(await supabase.from("teacher_attendance").upsert({ ...v, remarks: v.remarks ?? null, institute_id: ctx.institute!.id, marked_by: ctx.userId }, { onConflict: "teacher_id,attendance_date" }));
    revalidatePath(`/admin/teachers/${v.teacher_id}`);
    return { ok: true, message: "Attendance saved" };
  },
});
