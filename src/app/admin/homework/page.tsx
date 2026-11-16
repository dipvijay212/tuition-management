import type { Metadata } from "next";
import { NotebookPen, Check, AlertTriangle, X } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FilterBar, SearchInput, SelectFilter } from "@/components/shared/filters";
import { AssignHomeworkDialog } from "@/features/homework/assign-dialog";
import { CheckHomeworkDialog } from "@/features/homework/check-dialog";
import { DeleteHomeworkButton } from "@/features/homework/homework-actions";
import { formatDate, todayIn } from "@/lib/utilities/format";
import { pageParams, str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "Homework Management" };

export default async function AdminHomeworkPage(props: PageProps<"/admin/homework">) {
  await requireRole("admin");
  const sp = await props.searchParams;
  const { page, pageSize } = pageParams(sp);
  const today = todayIn();

  const selectedBatch = str(sp.batch);
  const selectedSubject = str(sp.subject);
  const searchQ = str(sp.q);
  type HwRow = Pick<Tables<"homework">, "id" | "title" | "description" | "assigned_date" | "due_at" | "batch_id" | "subject_id"> & {
    batches: { id: string; name: string; classes: { name: string } | null } | null;
    subjects: { id: string; name: string } | null;
    homework_submissions: { status: string }[];
  };
  const { rows: homeworkList, count, batches, subjects } = await api<{ rows: HwRow[]; count: number; batches: { id: string; name: string }[]; subjects: { id: string; name: string }[] }>(
    "/learning/homework",
    { query: { page, pageSize, q: searchQ, batch: selectedBatch, subject: selectedSubject } },
  );

  const assignBtn = (
    <AssignHomeworkDialog
      batches={batches ?? []}
      subjects={subjects ?? []}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homework & Notebook Tracking"
        description="Assign homework and record student notebook completion during class."
        actions={assignBtn}
      />

      <FilterBar>
        <SearchInput placeholder="Search homework title..." />
        <SelectFilter
          param="batch"
          label="Batch"
          options={(batches ?? []).map((b) => ({ value: b.id, label: b.name }))}
        />
        <SelectFilter
          param="subject"
          label="Subject"
          options={(subjects ?? []).map((s) => ({ value: s.id, label: s.name }))}
        />
      </FilterBar>

      <DataTable
        rows={homeworkList ?? []}
        rowKey={(r) => r.id}
        total={count ?? 0}
        page={page}
        pageSize={pageSize}
        empty={{
          title: "No homework assigned yet",
          description: "Click 'Assign Homework' to give exercises or questions to any batch.",
          action: assignBtn,
        }}
        columns={[
          {
            key: "title",
            header: "Homework Details",
            cell: (r) => (
              <div className="space-y-0.5">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <NotebookPen className="size-4 text-primary shrink-0" />
                  <span>{r.title}</span>
                </div>
                {r.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{r.description}</p>
                )}
              </div>
            ),
          },
          {
            key: "batch",
            header: "Batch & Class",
            cell: (r) => {
              const b = r.batches as { name: string; classes?: { name: string } | null } | null;
              return (
                <div className="text-sm">
                  <span className="font-semibold text-foreground">{b?.name ?? "—"}</span>
                  {b?.classes?.name && (
                    <div className="text-xs text-muted-foreground">{b.classes.name}</div>
                  )}
                </div>
              );
            },
          },
          {
            key: "subject",
            header: "Subject",
            cell: (r) => (
              <span className="text-sm font-medium">{r.subjects?.name ?? "General"}</span>
            ),
          },
          {
            key: "due_date",
            header: "Due Date",
            cell: (r) => {
              const d = r.due_at.slice(0, 10);
              const isToday = d === today;
              const isPast = d < today;

              return (
                <div className="text-xs">
                  <span className="font-medium text-foreground">{formatDate(d)}</span>
                  {isToday ? (
                    <span className="ml-1.5 inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      Due Today
                    </span>
                  ) : isPast ? (
                    <span className="ml-1.5 inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      Past Due
                    </span>
                  ) : null}
                </div>
              );
            },
          },
          {
            key: "stats",
            header: "Check Status",
            cell: (r) => {
              const subs = r.homework_submissions ?? [];
              if (subs.length === 0) {
                return <span className="text-xs text-amber-500 font-medium">Not checked yet</span>;
              }
              const complete = subs.filter((s) => s.status === "reviewed").length;
              const incomplete = subs.filter((s) => s.status === "resubmission_required").length;
              const notDone = subs.filter((s) => s.status === "pending").length;

              return (
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <Check className="size-3" /> {complete}
                  </span>
                  {incomplete > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-semibold">
                      <AlertTriangle className="size-3" /> {incomplete}
                    </span>
                  )}
                  {notDone > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-destructive font-semibold">
                      <X className="size-3" /> {notDone}
                    </span>
                  )}
                </div>
              );
            },
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            cell: (r) => {
              const b = r.batches as { name: string } | null;
              return (
                <div className="flex items-center justify-end gap-1">
                  <CheckHomeworkDialog
                    homeworkId={r.id}
                    title={r.title}
                    batchName={b?.name ?? "Batch"}
                    dueDate={r.due_at.slice(0, 10)}
                  />
                  <DeleteHomeworkButton id={r.id} title={r.title} />
                </div>
              );
            },
          },
        ]}
      />
    </div>
  );
}
