"use server";
import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import { friendlyError, type ActionResult } from "@/lib/utilities/errors";

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
    await assertRole("admin", "teacher");
    const batchId = String(form.get("batch_id") ?? "").trim();
    const subjectId = String(form.get("subject_id") ?? "").trim() || null;
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim() || null;
    const dueDate = String(form.get("due_date") ?? "").trim();

    if (!batchId) return { ok: false, error: "Please select a batch." };
    if (!title) return { ok: false, error: "Please enter a homework title." };
    if (!dueDate) return { ok: false, error: "Please choose a due date." };

    // The backend saves it and emails students/parents when email is enabled.
    const r = await api<{ message: string }>("/learning/homework", { method: "POST", body: { batch_id: batchId, subject_id: subjectId, title, description, due_date: dueDate } });
    revalidateHomework();
    return { ok: true, message: r.message };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

function revalidateHomework() {
  revalidatePath("/admin/homework");
  revalidatePath("/teacher/homework");
  revalidatePath("/student/homework");
  revalidatePath("/parent/homework");
}

export async function deleteHomeworkAction(id: string): Promise<ActionResult> {
  try {
    await assertRole("admin", "teacher");
    const r = await api<{ message: string }>(`/learning/homework/${encodeURIComponent(id)}`, { method: "DELETE" });
    revalidateHomework();
    return { ok: true, message: r.message };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function loadHomeworkCheckRosterAction(homeworkId: string): Promise<ActionResult<HomeworkCheckRosterData>> {
  try {
    await assertRole("admin", "teacher");
    const data = await api<HomeworkCheckRosterData>(`/learning/homework/${encodeURIComponent(homeworkId)}/check`);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function saveHomeworkCheckAction(form: FormData): Promise<ActionResult> {
  try {
    await assertRole("admin", "teacher");
    const homeworkId = String(form.get("homework_id") ?? "");
    const recordsJson = String(form.get("records_json") ?? "");
    if (!homeworkId || !recordsJson) return { ok: false, error: "Invalid homework check data." };

    let records: { student_id: string; status: "complete" | "incomplete" | "not_done"; remarks?: string }[];
    try {
      records = JSON.parse(recordsJson);
    } catch {
      return { ok: false, error: "Failed to parse records." };
    }
    const r = await api<{ message: string }>(`/learning/homework/${encodeURIComponent(homeworkId)}/check`, { method: "POST", body: { records } });
    revalidateHomework();
    return { ok: true, message: r.message };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}
