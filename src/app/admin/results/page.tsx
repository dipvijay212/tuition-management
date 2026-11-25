import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { FilterBar, SelectFilter } from "@/components/shared/filters";
import { pageParams, str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "Exam Results" };

export default async function AdminResultsPage(props: PageProps<"/admin/results">) {
  await requireRole("admin");
  const sp = await props.searchParams;
  const { page, pageSize } = pageParams(sp);
  type Row = Pick<Tables<"published_results">, "id" | "total_obtained" | "total_max" | "percentage" | "grade" | "is_pass" | "rank"> & {
    examinations: { id: string; name: string } | null;
    students: { id: string; full_name: string; admission_no: string } | null;
  };
  const { rows: data, count, exams } = await api<{ rows: Row[]; count: number; exams: { id: string; name: string }[] }>("/exams/results", { query: { page, pageSize, exam: str(sp.exam) } });

  return (
    <>
      <PageHeader
        title="Examination Results"
        description="Published student results, grades, and class rankings."
      />
      <FilterBar>
        <SelectFilter param="exam" label="Examination" options={(exams ?? []).map((e) => ({ value: e.id, label: e.name }))} />
      </FilterBar>
      <DataTable
        rows={data ?? []}
        rowKey={(r) => r.id}
        total={count ?? 0}
        page={page}
        pageSize={pageSize}
        empty={{
          title: "No published results found",
          description: "Publish an examination from the Examinations page to generate rankings and report cards.",
        }}
        columns={[
          {
            key: "rank",
            header: "Rank",
            cell: (r) => (
              <span className="font-semibold text-primary">
                {r.rank ? `#${r.rank}` : "—"}
              </span>
            ),
          },
          {
            key: "student",
            header: "Student",
            cell: (r) => (
              <div>
                {r.students?.id ? (
                  <Link href={`/admin/students/${r.students.id}`} className="font-medium text-primary hover:underline">
                    {r.students.full_name}
                  </Link>
                ) : (
                  <span className="font-medium">{r.students?.full_name}</span>
                )}
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
            key: "score",
            header: "Marks",
            cell: (r) => (
              <span>
                {r.total_obtained} / {r.total_max}
              </span>
            ),
          },
          {
            key: "percentage",
            header: "Percentage",
            cell: (r) => <span className="font-semibold">{r.percentage}%</span>,
          },
          {
            key: "grade",
            header: "Grade",
            cell: (r) => (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">
                {r.grade ?? "—"}
              </span>
            ),
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

