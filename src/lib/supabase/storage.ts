import "server-only";
import { createClient } from "./server";

export function publicBrandingUrl(path: string | null) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branding/${path}`;
}

/** Short-lived signed URL for a private file. Storage RLS decides whether the caller may read it. */
export async function signedUrl(path: string | null | undefined, expiresIn = 600) {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("files").createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

export async function signedUrls(paths: string[], expiresIn = 600) {
  if (paths.length === 0) return {} as Record<string, string>;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("files").createSignedUrls(paths, expiresIn);
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl]));
}

export const ALLOWED_UPLOADS: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "text/plain": ["txt"],
};

/** Validate both MIME type and extension, and size. */
export function validateUpload(file: File, maxMb: number, allowedMimes = Object.keys(ALLOWED_UPLOADS)): string | null {
  if (!file || file.size === 0) return "Please choose a file.";
  if (file.size > maxMb * 1024 * 1024) return `File is too large (max ${maxMb} MB).`;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedMimes.includes(file.type) || !ALLOWED_UPLOADS[file.type]?.includes(ext)) return "This file type is not allowed.";
  return null;
}

export function safeFileName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "bin";
  const base = name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "file";
  return `${Date.now()}-${base}.${ext}`;
}
