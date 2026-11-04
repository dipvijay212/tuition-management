/** Turn Postgres / Supabase errors into messages a person can act on. */
export function friendlyError(err: unknown): string {
  const e = err as { message?: string; code?: string; details?: string; hint?: string } | null;
  const msg = e?.message ?? (typeof err === "string" ? err : "");
  if (!msg) return "Something went wrong. Please try again.";
  if (e?.code === "23505") {
    if (/admission_no/.test(msg + (e.details ?? ""))) return "This admission number is already in use.";
    if (/phone/.test(msg + (e.details ?? ""))) return "This mobile number is already registered.";
    if (/student_batches_active_unique/.test(msg)) return "The student is already in this batch.";
    if (/attendance/.test(msg)) return "Attendance for this student and session already exists.";
    if (/marks/.test(msg)) return "Marks for this student and subject already exist.";
    return "A record with these details already exists.";
  }
  if (e?.code === "23503") return "This record is linked to other data and cannot be changed this way.";
  if (e?.code === "23514") return "Some values are not allowed. Please check amounts, dates and required fields.";
  if (e?.code === "42501" || /row-level security/i.test(msg)) return "You do not have permission to do this.";
  if (e?.code === "22P02") return "One of the values has an invalid format.";
  if (/JWT|session/i.test(msg)) return "Your session has expired. Please sign in again.";
  // Our own RAISE EXCEPTION messages are written for people already.
  return msg.replace(/^ERROR:\s*/, "");
}

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
