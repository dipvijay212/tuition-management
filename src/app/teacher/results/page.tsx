import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";

export const metadata: Metadata = { title: "Exam Results" };

export default async function TeacherResultsPage() {
  await requireRole("teacher");
  const supabase = await createClient();

  const { data: results, error } = await supabase
    .from("published_results")
    .select("id, total_obtained, total_max, percentage, grade, is_pass, rank, examinations(name), students(full_name, admission_no)")
    .order("rank", { ascending: true, nullsFirst: false });

  if (error) throw error;

  return (
    <>
      <PageHeader
        title="Student Results"
        description="Published examination results for your students."
      />
      <DataTable
        rows={results ?? []}
        rowKey={(r) => r.id}
        empty={{
          title: "No published results",
          description: "Results will appear here once examinations are published by the admin.",
        }}
        columns={[
          {
            key: "rank",
            header: "Rank",
            cell: (r) => <span className="font-semibold text-primary">{r.rank ? `#${r.rank}` : "—"}</span>,
          },
          {
            key: "student",
            header: "Student",
            cell: (r) => (
              <div>
                <span className="font-medium">{r.students?.full_name}</span>
                <div className="text-xs text-muted-foreground">Adm: {r.students?.admission_no}</div>
              </div>
            ),
          },
          {
            key: "exam",
            header: "Examination",
            cell: (r) => r.examinations?.name ?? "—",
          },
          {
            key: "marks",
            header: "Marks",
            cell: (r) => `${r.total_obtained} / ${r.total_max}`,
          },
          {
            key: "percentage",
            header: "Percentage",
            cell: (r) => <span className="font-semibold">{r.percentage}%</span>,
          },
          {
            key: "grade",
            header: "Grade",
            cell: (r) => <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">{r.grade ?? "—"}</span>,
          },
          {
            key: "status",
            header: "Result",
            cell: (r) => (
              <StatusBadge
                status={r.is_pass ? "passed" : "failed"}
                tone={r.is_pass ? "success" : "danger"}
                label={r.is_pass ? "Pass" : "Fail"}
              />
            ),
          },
        ]}
      />
    </>
  );
}

