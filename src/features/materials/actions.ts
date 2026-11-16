"use server";
import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import { friendlyError, type ActionResult } from "@/lib/utilities/errors";

function revalidateMaterials() {
  revalidatePath("/admin/materials");
  revalidatePath("/teacher/materials");
  revalidatePath("/student/materials");
  revalidatePath("/parent/materials");
}

export async function uploadStudyMaterialAction(form: FormData): Promise<ActionResult> {
  try {
    await assertRole("admin", "teacher");
    const title = String(form.get("title") ?? "").trim();
    const classId = String(form.get("class_id") ?? "") || null;
    const batchId = String(form.get("batch_id") ?? "") || null;
    const file = form.get("file");

    if (!title) return { ok: false, error: "Please enter a material title." };
    if (!classId && !batchId) return { ok: false, error: "Please select a class or batch." };
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Please select a file to upload." };

    // File type/size are validated by the backend.
    const body = new FormData();
    body.set(
      "data",
      JSON.stringify({
        title,
        description: String(form.get("description") ?? "").trim() || null,
        class_id: classId,
        batch_id: batchId,
        subject_id: String(form.get("subject_id") ?? "") || null,
      }),
    );
    body.set("file", file);
    const r = await api<{ message: string }>("/learning/materials", { method: "POST", form: body });
    revalidateMaterials();
    return { ok: true, message: r.message };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function deleteStudyMaterialAction(id: string): Promise<ActionResult> {
  try {
    await assertRole("admin", "teacher");
    const r = await api<{ message: string }>(`/learning/materials/${encodeURIComponent(id)}`, { method: "DELETE" });
    revalidateMaterials();
    return { ok: true, message: r.message };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function getMaterialSignedUrlAction(path: string): Promise<ActionResult<string>> {
  try {
    await assertRole("admin", "teacher", "student", "parent");
    // The backend checks the caller may read this file before issuing a 1-hour link.
    const r = await api<{ url: string }>("/learning/files/url", { query: { path } });
    return { ok: true, data: r.url };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}
