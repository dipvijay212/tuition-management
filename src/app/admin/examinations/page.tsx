import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { FilterBar, SelectFilter } from "@/components/shared/filters";
import { NewExamDialog } from "@/features/exams/exam-dialog";
import { formatDate, titleCase } from "@/lib/utilities/format";
import { pageParams, str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "Examinations" };

export default async function AdminExaminationsPage(props: PageProps<"/admin/examinations">) {
  await requireRole("admin");
  const sp = await props.searchParams;
  const { page, pageSize } = pageParams(sp);
  type Row = Pick<Tables<"examinations">, "id" | "name" | "exam_type" | "start_date" | "end_date" | "status"> & { classes: { name: string } | null; batches: { name: string } | null };
  const { rows: data, count, classes, batches } = await api<{ rows: Row[]; count: number; classes: { id: string; name: string }[]; batches: { id: string; name: string }[] }>("/exams", {
    query: { page, pageSize, status: str(sp.status) },
  });

  const actions = <NewExamDialog classes={classes ?? []} batches={batches ?? []} />;

  return (
    <>
      <PageHeader
        title="Examinations"
        description="Schedule exams, record subject marks, and publish results."
        actions={actions}
      />
      <FilterBar>
        <SelectFilter
          param="status"
          label="Status"
          options={[
            { value: "draft", label: "Draft" },
            { value: "scheduled", label: "Scheduled" },
            { value: "marks_entry", label: "Marks Entry" },
            { value: "published", label: "Published" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
      </FilterBar>
      <DataTable
        rows={data ?? []}
        rowKey={(r) => r.id}
        total={count ?? 0}
        page={page}
        pageSize={pageSize}
        empty={{
          title: "No examinations found",
          description: "Create an examination to test your students and record marks.",
          action: actions,
        }}
        columns={[
          {
            key: "name",
            header: "Examination",
            cell: (r) => (
              <div>
                <Link href={`/admin/examinations/${r.id}`} className="font-medium hover:text-primary transition-colors">
                  {r.name}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {r.classes?.name ? `Class: ${r.classes.name}` : ""} {r.batches?.name ? `(Batch: ${r.batches.name})` : ""}
                </div>
              </div>
            ),
          },
          {
            key: "type",
            header: "Type",
            cell: (r) => <span className="text-sm">{titleCase(r.exam_type)}</span>,
          },
          {
            key: "dates",
            header: "Dates",
            cell: (r) => (
              <span className="text-sm">
                {formatDate(r.start_date)} – {formatDate(r.end_date)}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            cell: (r) => <StatusBadge status={r.status} />,
          },
          {
            key: "view",
            header: "",
            className: "text-right",
            cell: (r) => (
              <Link href={`/admin/examinations/${r.id}`} className="text-xs font-medium text-primary hover:underline">
                Manage &rarr;
              </Link>
            ),
          },
        ]}
      />
    </>
  );
}

