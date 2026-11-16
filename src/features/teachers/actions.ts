"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { api } from "@/lib/api/server";
import { makeAction } from "@/lib/utilities/action";
import { dateString, optionalDate, optionalEmail, optionalText, optionalUuid, passwordSchema, phoneSchema, requiredText } from "@/lib/validations/common";

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
  handler: async (v, _ctx, form) => {
    // Forward fields + optional photo to the backend as multipart.
    const body = new FormData();
    body.set("data", JSON.stringify(v));
    const photo = form.get("photo");
    if (photo instanceof File && photo.size > 0) body.set("photo", photo);
    const r = await api<{ message: string; id: string }>("/teachers", { method: "POST", form: body });
    revalidatePath("/admin/teachers");
    return { ok: true, message: r.message, data: { id: r.id } };
  },
});

export const markTeacherAttendance = makeAction({
  roles: ["admin"],
  schema: z.object({ teacher_id: z.uuid(), attendance_date: dateString, status: z.enum(["present", "absent", "late", "leave"]), remarks: optionalText }),
  handler: async (v) => {
    await api(`/teachers/${encodeURIComponent(v.teacher_id)}/attendance`, { method: "POST", body: { attendance_date: v.attendance_date, status: v.status, remarks: v.remarks ?? null } });
    revalidatePath(`/admin/teachers/${v.teacher_id}`);
    return { ok: true, message: "Attendance saved" };
  },
});
