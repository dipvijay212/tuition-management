"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { api } from "@/lib/api/server";
import { makeAction } from "@/lib/utilities/action";
import { optionalDate, optionalText, optionalUuid, requiredText } from "@/lib/validations/common";

const examTypeSchema = z.enum(["unit_test", "weekly_test", "monthly_test", "half_yearly", "final", "practice"]);

export const saveExamination = makeAction({
  roles: ["admin", "teacher"],
  schema: z.object({
    id: optionalUuid,
    name: requiredText("Examination name", 120),
    exam_type: examTypeSchema,
    class_id: optionalUuid,
    batch_id: optionalUuid,
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter start date"),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter end date"),
    result_publish_date: optionalDate,
    status: z.enum(["draft", "scheduled", "marks_entry", "pending_approval", "published", "cancelled"]).default("scheduled"),
  }).superRefine((v, c) => {
    if (v.end_date < v.start_date) c.addIssue({ code: "custom", path: ["end_date"], message: "End date must be on or after start date" });
    if (!v.class_id && !v.batch_id) c.addIssue({ code: "custom", path: ["class_id"], message: "Select either a class or a batch" });
  }),
  handler: async (v) => {
    const r = await api<{ id: string }>("/exams", { method: "POST", body: v });
    const examId = r.id;

    revalidatePath("/admin/examinations");
    revalidatePath("/teacher/examinations");
    return { ok: true, message: "Examination saved", data: { id: examId } };
  },
});

export const addExamSubject = makeAction({
  roles: ["admin", "teacher"],
  schema: z.object({
    examination_id: z.uuid("Examination ID is required"),
    subject_id: z.uuid("Select a subject"),
    exam_date: optionalDate,
    max_marks: z.coerce.number().positive("Maximum marks must be greater than zero"),
    passing_marks: z.coerce.number().min(0, "Passing marks must be non-negative"),
  }).superRefine((v, c) => {
    if (v.passing_marks > v.max_marks) c.addIssue({ code: "custom", path: ["passing_marks"], message: "Passing marks cannot exceed maximum marks" });
  }),
  handler: async (v) => {
    const { examination_id, ...body } = v;
    await api(`/exams/${encodeURIComponent(examination_id)}/subjects`, { method: "POST", body });

    revalidatePath(`/admin/examinations/${v.examination_id}`);
    revalidatePath(`/teacher/examinations/${v.examination_id}`);
    return { ok: true, message: "Subject added to examination" };
  },
});

export const saveSubjectMarks = makeAction({
  roles: ["admin", "teacher"],
  schema: z.object({
    examination_id: z.uuid(),
    examination_subject_id: z.uuid(),
    marks_json: z.string().min(2, "Invalid marks data"),
  }),
  handler: async (v) => {
    let entries: { student_id: string; obtained_marks?: number | null; is_absent: boolean; remarks?: string }[];
    try {
      entries = JSON.parse(v.marks_json);
    } catch {
      throw new Error("Invalid marks payload");
    }
    await api(`/exams/${encodeURIComponent(v.examination_id)}/marks`, { method: "POST", body: { examination_subject_id: v.examination_subject_id, entries } });

    revalidatePath(`/admin/examinations/${v.examination_id}`);
    revalidatePath(`/teacher/examinations/${v.examination_id}`);
    return { ok: true, message: "Marks saved successfully" };
  },
});

export const updateExamStatusAction = makeAction({
  roles: ["admin", "teacher"],
  schema: z.object({
    exam_id: z.uuid(),
    status: z.enum(["draft", "scheduled", "marks_entry", "pending_approval", "published", "cancelled"]),
  }),
  handler: async (v) => {
    await api(`/exams/${encodeURIComponent(v.exam_id)}/status`, { method: "POST", body: { status: v.status } });
    revalidatePath(`/admin/examinations/${v.exam_id}`);
    revalidatePath("/admin/examinations");
    revalidatePath("/teacher/examinations");
    return { ok: true, message: `Exam status changed to ${v.status}` };
  },
});

export const publishExamAction = makeAction({
  roles: ["admin"],
  schema: z.object({
    exam_id: z.uuid("Examination ID required"),
    reason: optionalText,
  }),
  handler: async (v) => {
    const r = await api<{ message: string }>(`/exams/${encodeURIComponent(v.exam_id)}/publish`, { method: "POST", body: { reason: v.reason ?? null } });

    revalidatePath(`/admin/examinations/${v.exam_id}`);
    revalidatePath("/admin/examinations");
    revalidatePath("/admin/results");
    revalidatePath("/teacher/results");
    revalidatePath("/student/results");
    revalidatePath("/parent/results");
    return { ok: true, message: r.message };
  },
});
