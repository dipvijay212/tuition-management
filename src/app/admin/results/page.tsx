import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { FilterBar, SelectFilter } from "@/components/shared/filters";
import { pageParams, str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "Exam Results" };

export default async function AdminResultsPage(props: PageProps<"/admin/results">) {
  await requireRole("admin");
  const sp = await props.searchParams;
  const { page, pageSize, from, to } = pageParams(sp);
  const supabase = await createClient();

  let q = supabase
    .from("published_results")
    .select(
      "id, total_obtained, total_max, percentage, grade, is_pass, rank, examinations(id, name), students(id, full_name, admission_no)",
      { count: "exact" }
    )
    .order("rank", { ascending: true, nullsFirst: false })
    .order("percentage", { ascending: false })
    .range(from, to);

  if (str(sp.exam)) q = q.eq("examination_id", str(sp.exam)!);

  const [{ data, count, error }, { data: exams }] = await Promise.all([
    q,
    supabase.from("examinations").select("id, name").order("name"),
  ]);

  if (error) throw error;

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

