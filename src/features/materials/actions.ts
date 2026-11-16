"use server";
import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { validateUpload, safeFileName, ALLOWED_UPLOADS, signedUrl } from "@/lib/supabase/storage";
import { check } from "@/lib/utilities/action";
import { friendlyError, type ActionResult } from "@/lib/utilities/errors";

export async function uploadStudyMaterialAction(form: FormData): Promise<ActionResult> {
  try {
    const ctx = await assertRole("admin", "teacher");
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim() || null;
    const classId = String(form.get("class_id") ?? "") || null;
    const batchId = String(form.get("batch_id") ?? "") || null;
    const subjectId = String(form.get("subject_id") ?? "") || null;
    const file = form.get("file");

    if (!title) return { ok: false, error: "Please enter a material title." };
    if (!classId && !batchId) return { ok: false, error: "Please select a class or batch." };
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Please select a file to upload." };

    const err = validateUpload(file, 25, Object.keys(ALLOWED_UPLOADS));
    if (err) return { ok: false, error: err };

    const supabase = await createClient();
    const instId = ctx.institute!.id;
    const path = `${instId}/materials/${safeFileName(file.name)}`;

    check(await supabase.storage.from("files").upload(path, file, { contentType: file.type }));

    check(
      await supabase.from("study_materials").insert({
        institute_id: instId,
        title,
        description,
        class_id: classId,
        batch_id: batchId,
        subject_id: subjectId,
        file_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        visibility: batchId ? "batch" : "class",
        uploaded_by: ctx.userId,
        is_active: true,
      })
    );

    revalidatePath("/admin/materials");
    revalidatePath("/teacher/materials");
    revalidatePath("/student/materials");
    revalidatePath("/parent/materials");

    return { ok: true, message: "Study material uploaded successfully!" };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function deleteStudyMaterialAction(id: string): Promise<ActionResult> {
  try {
    await assertRole("admin", "teacher");
    const supabase = await createClient();

    const { data: item } = await supabase
      .from("study_materials")
      .select("id, file_path, uploaded_by")
      .eq("id", id)
      .single();

    if (!item) return { ok: false, error: "Material not found." };

    // Delete database entry (or set is_active = false)
    check(await supabase.from("study_materials").update({ is_active: false }).eq("id", id));

    // Try removing file from storage
    if (item.file_path) {
      await supabase.storage.from("files").remove([item.file_path]);
    }

    revalidatePath("/admin/materials");
    revalidatePath("/teacher/materials");
    revalidatePath("/student/materials");
    revalidatePath("/parent/materials");

    return { ok: true, message: "Material deleted." };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function getMaterialSignedUrlAction(path: string): Promise<ActionResult<string>> {
  try {
    await assertRole("admin", "teacher", "student", "parent");
    const url = await signedUrl(path, 3600); // 1 hour download link
    if (!url) return { ok: false, error: "Unable to generate file download URL." };
    return { ok: true, data: url };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}
