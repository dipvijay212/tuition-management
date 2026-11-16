import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utilities/format";
import { CheckCircle, XCircle, Percent } from "lucide-react";

export const metadata: Metadata = { title: "Children Attendance" };

export default async function ParentAttendancePage() {
  await requireRole("parent");
  const supabase = await createClient();

  const { data: records, error } = await supabase
    .from("attendance")
    .select("id, session_date, status, remarks, students(full_name), batches(name)")
    .order("session_date", { ascending: false });

  if (error) throw error;

  const total = records?.length ?? 0;
  const present = records?.filter((r) => r.status === "present").length ?? 0;
  const absent = records?.filter((r) => r.status === "absent").length ?? 0;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Children Attendance"
        description="Monitor daily attendance and punctuality for your children."
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Overall Attendance" value={`${percentage}%`} icon={Percent} />
        <StatCard label="Total Present" value={present} tone="success" icon={CheckCircle} />
        <StatCard label="Total Absent" value={absent} tone="danger" icon={XCircle} />
      </div>

      <DataTable
        rows={records ?? []}
        rowKey={(r) => r.id}
        empty={{
          title: "No attendance records found",
          description: "Attendance records for your children will appear here.",
        }}
        columns={[
          {
            key: "student",
            header: "Child",
            cell: (r) => <span className="font-medium text-foreground">{r.students?.full_name}</span>,
          },
          {
            key: "date",
            header: "Date",
            cell: (r) => formatDate(r.session_date),
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
