import "server-only";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/server";
import type { PreparedAttendanceSession } from "./actions";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Loads the attendance roster for either an existing session ID or a (batch, date) pair.
 * Redirects to fallbackHref if required query params are missing or invalid.
 */
export async function loadTakeAttendanceSession({
  sessionId,
  batchId,
  sessionDate,
  fallbackHref,
}: {
  sessionId?: string;
  batchId?: string;
  sessionDate: string;
  fallbackHref: string;
}): Promise<{ initialSession: PreparedAttendanceSession; isFixedSession: boolean }> {
  if (sessionId && UUID_RE.test(sessionId)) {
    const initialSession = await api<PreparedAttendanceSession>(
      `/attendance/sessions/${encodeURIComponent(sessionId)}/roster`,
    );
    return { initialSession, isFixedSession: true };
  }

  if (batchId && UUID_RE.test(batchId)) {
    const validDate = DATE_RE.test(sessionDate) ? sessionDate : undefined;
    if (!validDate) redirect(fallbackHref);
    const initialSession = await api<PreparedAttendanceSession>("/attendance/prepare", {
      method: "POST",
      body: { batch_id: batchId, session_date: validDate },
    });
    return { initialSession, isFixedSession: false };
  }

  redirect(fallbackHref);
}
