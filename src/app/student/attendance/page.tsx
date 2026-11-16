import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { familyAttendance, myStudent } from "@/features/family/data";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utilities/format";
import { CheckCircle, XCircle, Clock, Percent } from "lucide-react";

export const metadata: Metadata = { title: "My Attendance" };

export default async function StudentAttendancePage() {
  const session = await requireRole("student");
  if (!session.institute) {
    return (
      <>
        <PageHeader title="My Attendance" description="Your attendance history and statistics." />
        <p className="text-sm text-muted-foreground">Institute not configured.</p>
      </>
    );
  }

  const [student, attendance] = await Promise.all([myStudent(), familyAttendance()]);

  if (!student) {
    return (
      <>
        <PageHeader title="My Attendance" description="Your attendance history and statistics." />
        <p className="text-sm text-muted-foreground">Student record not found.</p>
      </>
    );
  }

  const records = attendance;

  const total = records?.length ?? 0;
  const present = records?.filter((r) => r.status === "present").length ?? 0;
  const absent = records?.filter((r) => r.status === "absent").length ?? 0;
  const late = records?.filter((r) => r.status === "late").length ?? 0;
  const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  return (
    <>
      <PageHeader title="My Attendance" description="Your attendance history and statistics." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Attendance Rate" value={`${percentage}%`} icon={Percent} />
        <StatCard label="Present" value={present} tone="success" icon={CheckCircle} />
        <StatCard label="Absent" value={absent} tone="danger" icon={XCircle} />
        <StatCard label="Late" value={late} tone="warning" icon={Clock} />
      </div>

      <DataTable
        rows={records ?? []}
        rowKey={(r) => r.id}
        empty={{
          title: "No attendance records yet",
          description: "Your attendance will appear here once marked by your teacher.",
        }}
        columns={[
          {
            key: "date",
            header: "Date",
            cell: (r) => <span className="font-medium text-foreground">{formatDate(r.session_date)}</span>,
          },
          {
            key: "batch",
            header: "Batch",
            cell: (r) => r.batches?.name ?? "—",
          },
          {
            key: "status",
            header: "Status",
            cell: (r) => <StatusBadge status={r.status} />,
          },
          {
            key: "remarks",
            header: "Remarks",
            cell: (r) => r.remarks || "—",
          },
        ]}
      />
    </>
  );
}
