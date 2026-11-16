import type { Metadata } from "next";
import { NotebookPen, Check, AlertTriangle, X } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FilterBar, SearchInput, SelectFilter } from "@/components/shared/filters";
import { AssignHomeworkDialog } from "@/features/homework/assign-dialog";
import { CheckHomeworkDialog } from "@/features/homework/check-dialog";
import { DeleteHomeworkButton } from "@/features/homework/homework-actions";
import { formatDate, todayIn } from "@/lib/utilities/format";
import { pageParams, str, likeTerm } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "Homework Management" };

export default async function TeacherHomeworkPage(props: PageProps<"/teacher/homework">) {
  await requireRole("teacher");
  const sp = await props.searchParams;
  const { page, pageSize, from, to } = pageParams(sp);
  const supabase = await createClient();
  const today = todayIn();

  const selectedBatch = str(sp.batch);
  const selectedSubject = str(sp.subject);
  const searchQ = str(sp.q);

  // Homework is scoped to the teacher's active assignments with an inner join, so it loads in
  // parallel with the batch list instead of waiting for batch ids (one round trip, not three).
  let q = supabase
    .from("homework")
    .select(
      "id, title, description, assigned_date, due_at, batch_id, subject_id, batches(id, name, classes(name)), subjects(id, name), homework_submissions(status), assigned:batches!inner(teacher_batches!inner(is_active))",
      { count: "exact" }
    )
    .eq("assigned.teacher_batches.is_active", true)
    .order("due_at", { ascending: false })
    .range(from, to);

  if (searchQ) q = q.ilike("title", likeTerm(searchQ));
  if (selectedBatch) q = q.eq("batch_id", selectedBatch);
  if (selectedSubject) q = q.eq("subject_id", selectedSubject);

  const [{ data: assignments }, { data: homeworkList, count, error }] = await Promise.all([
    supabase
      .from("teacher_batches")
      .select("batches!inner(id, name, classes(name), batch_subjects(subjects(id, name)))")
      .eq("is_active", true)
      .eq("batches.status", "active"),
    q,
  ]);
  if (error) throw error;

  const seen = new Set<string>();
  const batches = (assignments ?? [])
    .map((a) => a.batches)
    .filter((b) => b && !seen.has(b.id) && seen.add(b.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const subjectMap = new Map<string, { id: string; name: string }>();
  for (const b of batches) {
    for (const bs of b.batch_subjects ?? []) {
      if (bs.subjects) subjectMap.set(bs.subjects.id, bs.subjects);
    }
  }
  const subjects = Array.from(subjectMap.values());

  const assignBtn = (
    <AssignHomeworkDialog
      batches={batches.map((b) => ({ id: b.id, name: b.name }))}
      subjects={subjects}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homework & Notebook Tracking"
        description="Assign homework exercises and record student notebook completion during class."
        actions={assignBtn}
      />

      <FilterBar>
        <SearchInput placeholder="Search homework title..." />
        {batches.length > 0 && (
          <SelectFilter
            param="batch"
            label="Batch"
            options={batches.map((b) => ({ value: b.id, label: b.name }))}
          />
        )}
        {subjects.length > 0 && (
          <SelectFilter
            param="subject"
            label="Subject"
            options={subjects.map((s) => ({ value: s.id, label: s.name }))}
          />
        )}
      </FilterBar>

      <DataTable
        rows={homeworkList ?? []}
        rowKey={(r) => r.id}
        total={count ?? 0}
        page={page}
        pageSize={pageSize}
        empty={{
          title: "No homework assigned yet",
          description: "Click 'Assign Homework' to give tasks to your batches.",
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
