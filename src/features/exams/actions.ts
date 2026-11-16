"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { check, makeAction } from "@/lib/utilities/action";
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
  handler: async (v, ctx) => {
    const supabase = await createClient();
    const inst = ctx.institute!.id;
    const row = {
      institute_id: inst,
      name: v.name,
      exam_type: v.exam_type,
      class_id: v.class_id ?? null,
      batch_id: v.batch_id ?? null,
      start_date: v.start_date,
      end_date: v.end_date,
      result_publish_date: v.result_publish_date ?? null,
      status: v.status,
      created_by: ctx.userId,
    };

    let examId = v.id;
    if (v.id) {
      check(await supabase.from("examinations").update(row).eq("id", v.id));
    } else {
      const created = check(await supabase.from("examinations").insert(row).select("id").single());
      examId = created.id;
    }

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
  handler: async (v, ctx) => {
    const supabase = await createClient();
    const inst = ctx.institute!.id;

    check(
      await supabase.from("examination_subjects").upsert(
        {
          institute_id: inst,
          examination_id: v.examination_id,
          subject_id: v.subject_id,
          exam_date: v.exam_date ?? null,
          max_marks: v.max_marks,
          passing_marks: v.passing_marks,
        },
        { onConflict: "examination_id,subject_id" }
      )
    );

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
  handler: async (v, ctx) => {
    const supabase = await createClient();
    const inst = ctx.institute!.id;

    let entries: { student_id: string; obtained_marks?: number | null; is_absent: boolean; remarks?: string }[];
    try {
      entries = JSON.parse(v.marks_json);
    } catch {
      throw new Error("Invalid marks payload");
    }

    const rows = entries.map((e) => ({
      institute_id: inst,
      examination_subject_id: v.examination_subject_id,
      student_id: e.student_id,
      obtained_marks: e.is_absent ? null : e.obtained_marks ?? 0,
      is_absent: e.is_absent,
      remarks: e.remarks || null,
      entered_by: ctx.userId,
    }));

    check(
      await supabase
        .from("marks")
        .upsert(rows, { onConflict: "examination_subject_id,student_id" })
    );

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
    const supabase = await createClient();
    check(await supabase.from("examinations").update({ status: v.status }).eq("id", v.exam_id));
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
    const supabase = await createClient();
    const { data: count, error } = await supabase.rpc("publish_examination", {
      p_exam: v.exam_id,
      p_reason: v.reason ?? undefined,
    });
    if (error) throw error;

    revalidatePath(`/admin/examinations/${v.exam_id}`);
    revalidatePath("/admin/examinations");
    revalidatePath("/admin/results");
    revalidatePath("/teacher/results");
    revalidatePath("/student/results");
    revalidatePath("/parent/results");
    return { ok: true, message: `Exam published! ${count ?? 0} results computed.` };
  },
});
