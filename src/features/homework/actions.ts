"use server";
import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { check } from "@/lib/utilities/action";
import { friendlyError, type ActionResult } from "@/lib/utilities/errors";
import { todayIn } from "@/lib/utilities/format";

export type HomeworkCheckStudent = {
  id: string;
  full_name: string;
  admission_no: string;
  status: "complete" | "incomplete" | "not_done";
  remarks: string;
};

export type HomeworkCheckRosterData = {
  homeworkId: string;
  title: string;
  batchId: string;
  batchName: string;
  dueDate: string;
  students: HomeworkCheckStudent[];
};

export async function createHomeworkAction(form: FormData): Promise<ActionResult> {
  try {
    const ctx = await assertRole("admin", "teacher");
    const batchId = String(form.get("batch_id") ?? "").trim();
    const subjectId = String(form.get("subject_id") ?? "").trim() || null;
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim() || null;
    const dueDate = String(form.get("due_date") ?? "").trim();

    if (!batchId) return { ok: false, error: "Please select a batch." };
    if (!title) return { ok: false, error: "Please enter a homework title." };
    if (!dueDate) return { ok: false, error: "Please choose a due date." };

    const supabase = await createClient();
    const instId = ctx.institute!.id;
    const today = todayIn();

    check(
      await supabase.from("homework").insert({
        institute_id: instId,
        batch_id: batchId,
        subject_id: subjectId,
        title,
        description,
        assigned_date: today,
        due_at: `${dueDate}T23:59:59+05:30`,
        is_published: true,
        submission_enabled: false,
        created_by: ctx.userId,
      })
    );

    revalidatePath("/admin/homework");
    revalidatePath("/teacher/homework");
    revalidatePath("/student/homework");
    revalidatePath("/parent/homework");

    // Safe background trigger for homework assignment email
    try {
      const { data: stSettings } = await supabase
        .from("institute_settings")
        .select("email_enabled")
        .eq("institute_id", instId)
        .maybeSingle();

      if (stSettings?.email_enabled) {
        const { data: bInfo } = await supabase
          .from("batches")
          .select("name, subjects(name)")
          .eq("id", batchId)
          .maybeSingle();

        const { data: enrollments } = await supabase
          .from("student_batches")
          .select("students(email, parent_students(is_primary, guardians(email)))")
          .eq("batch_id", batchId)
          .eq("status", "active");

        const homeworkRecipients: string[] = [];
        for (const en of enrollments ?? []) {
          const st = en.students as unknown as { email?: string; parent_students?: Array<{ is_primary: boolean; guardians?: { email?: string } }> } | null;
          if (st?.email && !homeworkRecipients.includes(st.email)) {
            homeworkRecipients.push(st.email);
          }
          for (const ps of st?.parent_students ?? []) {
            const gEmail = ps.guardians?.email;
            if (gEmail && !homeworkRecipients.includes(gEmail)) {
              homeworkRecipients.push(gEmail);
            }
          }
        }

        if (homeworkRecipients.length > 0) {
          const { renderHomeworkAlertEmail, sendEmail } = await import("@/lib/email");
          const tpl = renderHomeworkAlertEmail({
            instituteName: ctx.institute?.name,
            batchName: bInfo?.name ?? "Batch",
            subjectName: (bInfo?.subjects as { name?: string } | null)?.name ?? null,
            title,
            dueDate,
            description,
          });

          await sendEmail({
            to: homeworkRecipients,
            subject: tpl.subject,
            html: tpl.html,
            text: tpl.text,
            instituteId: instId,
          });
        }
      }
    } catch (emailErr) {
      console.error("[Homework Email Trigger Failed]", emailErr);
    }

    return { ok: true, message: "Homework assigned successfully!" };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function deleteHomeworkAction(id: string): Promise<ActionResult> {
  try {
    await assertRole("admin", "teacher");
    const supabase = await createClient();

    // Delete submissions first, then homework
    await supabase.from("homework_submissions").delete().eq("homework_id", id);
    check(await supabase.from("homework").delete().eq("id", id));

    revalidatePath("/admin/homework");
    revalidatePath("/teacher/homework");
    revalidatePath("/student/homework");
    revalidatePath("/parent/homework");

    return { ok: true, message: "Homework deleted." };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function loadHomeworkCheckRosterAction(homeworkId: string): Promise<ActionResult<HomeworkCheckRosterData>> {
  try {
    await assertRole("admin", "teacher");
    const supabase = await createClient();

    const { data: hw, error: hwErr } = await supabase
      .from("homework")
      .select("id, title, batch_id, due_at, batches(name)")
      .eq("id", homeworkId)
      .single();

    if (hwErr || !hw) return { ok: false, error: "Homework record not found." };

    // Fetch active students in batch
    const { data: enrolments } = await supabase
      .from("student_batches")
      .select("student_id, students(id, full_name, admission_no, status)")
      .eq("batch_id", hw.batch_id)
      .eq("status", "active");

    const activeStudents = (enrolments ?? [])
      .map((e) => e.students)
      .filter((st): st is NonNullable<typeof st> => !!st && st.status === "active")
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    // Fetch existing submissions
    const { data: existingSubmissions } = await supabase
      .from("homework_submissions")
      .select("student_id, status, feedback")
      .eq("homework_id", homeworkId);

    const subMap = new Map<string, { status: string; feedback: string | null }>();
    for (const sub of existingSubmissions ?? []) {
      subMap.set(sub.student_id, { status: sub.status, feedback: sub.feedback });
    }

    const students: HomeworkCheckStudent[] = activeStudents.map((st) => {
      const existing = subMap.get(st.id);
      let status: "complete" | "incomplete" | "not_done" = "complete";
      if (existing) {
        if (existing.status === "resubmission_required") status = "incomplete";
        else if (existing.status === "pending") status = "not_done";
        else status = "complete";
      }

      return {
        id: st.id,
        full_name: st.full_name,
        admission_no: st.admission_no,
        status,
        remarks: existing?.feedback ?? "",
      };
    });

    const batchName = (hw.batches as { name: string } | null)?.name ?? "Batch";
    const dueDate = hw.due_at.slice(0, 10);

    return {
      ok: true,
      data: {
        homeworkId: hw.id,
        title: hw.title,
        batchId: hw.batch_id,
        batchName,
        dueDate,
        students,
      },
    };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function saveHomeworkCheckAction(form: FormData): Promise<ActionResult> {
  try {
    const ctx = await assertRole("admin", "teacher");
    const homeworkId = String(form.get("homework_id") ?? "");
    const recordsJson = String(form.get("records_json") ?? "");

    if (!homeworkId || !recordsJson) return { ok: false, error: "Invalid homework check data." };

    let records: { student_id: string; status: "complete" | "incomplete" | "not_done"; remarks?: string }[];
    try {
      records = JSON.parse(recordsJson);
    } catch {
      return { ok: false, error: "Failed to parse records." };
    }

    const supabase = await createClient();
    const instId = ctx.institute!.id;
    const now = new Date().toISOString();

    const upsertRows = records.map((r) => {
      let submissionStatus: "reviewed" | "resubmission_required" | "pending" = "reviewed";
      if (r.status === "incomplete") submissionStatus = "resubmission_required";
      else if (r.status === "not_done") submissionStatus = "pending";

      return {
        institute_id: instId,
        homework_id: homeworkId,
        student_id: r.student_id,
        status: submissionStatus,
        feedback: r.remarks?.trim() || null,
        reviewed_by: ctx.userId,
        reviewed_at: now,
      };
    });

    check(
      await supabase
        .from("homework_submissions")
        .upsert(upsertRows, { onConflict: "homework_id, student_id" })
    );

    revalidatePath("/admin/homework");
    revalidatePath("/teacher/homework");
    revalidatePath("/student/homework");
    revalidatePath("/parent/homework");

    return { ok: true, message: `Homework check saved for ${records.length} students!` };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}
