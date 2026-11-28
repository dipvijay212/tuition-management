import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { todayIn } from "@/lib/utilities/format";
import { str } from "@/lib/utilities/query";
import { loadTakeAttendanceSession } from "@/features/attendance/take-attendance-loader";
import { TakeAttendanceView } from "@/features/attendance/take-attendance-view";

export const metadata: Metadata = { title: "Take Attendance" };

export default async function TeacherTakeAttendancePage(props: PageProps<"/teacher/attendance/take">) {
  await requireRole("teacher");
  const sp = await props.searchParams;
  const backHref = "/teacher/attendance";

  const { initialSession, isFixedSession } = await loadTakeAttendanceSession({
    sessionId: str(sp.session),
    batchId: str(sp.batch),
    sessionDate: str(sp.date) || todayIn(),
    fallbackHref: backHref,
  });

  return (
    <TakeAttendanceView
      initialSession={initialSession}
      isFixedSession={isFixedSession}
      backHref={backHref}
      backLabel="Back to attendance"
    />
  );
}
