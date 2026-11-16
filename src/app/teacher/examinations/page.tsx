import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, titleCase } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "Examinations" };

export default async function TeacherExaminationsPage() {
  await requireRole("teacher");
  const supabase = await createClient();

  const { data: exams, error } = await supabase
    .from("examinations")
    .select("id, name, exam_type, start_date, end_date, status, batches(name)")
    .order("start_date", { ascending: false });

  if (error) throw error;

  return (
    <>
      <PageHeader
        title="Examinations"
        description="View examinations and enter marks for your batches."
      />
      <DataTable
        rows={exams ?? []}
        rowKey={(r) => r.id}
        empty={{
          title: "No examinations scheduled",
          description: "Examinations scheduled for your batches will appear here.",
        }}
        columns={[
          {
            key: "name",
            header: "Examination",
            cell: (r) => (
              <div>
                <Link href={`/teacher/examinations/${r.id}`} className="font-medium hover:text-primary">
                  {r.name}
                </Link>
                <div className="text-xs text-muted-foreground">Batch: {r.batches?.name ?? "All"}</div>
              </div>
            ),
          },
          {
            key: "type",
            header: "Type",
            cell: (r) => titleCase(r.exam_type),
          },
          {
            key: "dates",
            header: "Dates",
            cell: (r) => `${formatDate(r.start_date)} – ${formatDate(r.end_date)}`,
          },
          {
            key: "status",
            header: "Status",
            cell: (r) => <StatusBadge status={r.status} />,
          },
          {
            key: "action",
            header: "",
            className: "text-right",
            cell: (r) => (
              <Link href={`/teacher/examinations/${r.id}`} className="text-xs font-medium text-primary hover:underline">
                Enter Marks &rarr;
              </Link>
            ),
          },
        ]}
      />
    </>
  );
}

