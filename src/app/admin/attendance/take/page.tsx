import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { todayIn } from "@/lib/utilities/format";
import { str } from "@/lib/utilities/query";
import { loadTakeAttendanceSession } from "@/features/attendance/take-attendance-loader";
import { TakeAttendanceView } from "@/features/attendance/take-attendance-view";

export const metadata: Metadata = { title: "Take Attendance" };

export default async function AdminTakeAttendancePage(props: PageProps<"/admin/attendance/take">) {
  await requireRole("admin");
  const sp = await props.searchParams;

  const classId = str(sp.class);
  const backHref = classId ? `/admin/attendance?class=${encodeURIComponent(classId)}` : "/admin/attendance";

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
      backLabel={classId ? "Back to batches" : "Back to attendance"}
    />
  );
}
