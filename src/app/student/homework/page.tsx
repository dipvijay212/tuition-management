import type { Metadata } from "next";
import { NotebookPen, Check, AlertTriangle, X, Clock } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { formatDate, todayIn } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "My Homework" };

export default async function StudentHomeworkPage() {
  const session = await requireRole("student");
  const supabase = await createClient();
  const today = todayIn();

  if (!session.institute) {
    return (
      <div className="space-y-4">
        <PageHeader title="My Homework" description="Your assigned tasks and completion status." />
        <p className="text-sm text-muted-foreground">Institute not configured.</p>
      </div>
    );
  }

  // Find student ID and active batches
  const { data: student } = await supabase
    .from("students")
    .select("id, student_batches(batch_id, status)")
    .eq("institute_id", session.institute.id)
    .single();

  if (!student) {
    return (
      <div className="space-y-4">
        <PageHeader title="My Homework" description="Your assigned tasks and completion status." />
        <p className="text-sm text-muted-foreground">Student record not found.</p>
      </div>
    );
  }

  const batchIds = (student.student_batches ?? [])
    .filter((b) => b.status === "active")
    .map((b) => b.batch_id);

  const { data: homeworkList, error } = batchIds.length > 0
    ? await supabase
        .from("homework")
        .select(`
          id, title, description, assigned_date, due_at,
          batches(name),
          subjects(name),
          homework_submissions(status, feedback)
        `)
        .in("batch_id", batchIds)
        .order("due_at", { ascending: false })
    : { data: [], error: null };

  if (error) throw error;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Homework"
        description="Review homework assigned by your teachers and check completion status."
      />

      <DataTable
        rows={homeworkList ?? []}
        rowKey={(r) => r.id}
        empty={{
          title: "No homework assigned right now",
          description: "Enjoy your free time! Homework assigned by your teachers will appear here.",
        }}
        columns={[
          {
            key: "title",
            header: "Homework Task",
            cell: (r) => (
              <div className="space-y-0.5">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <NotebookPen className="size-4 text-primary shrink-0" />
                  <span>{r.title}</span>
                </div>
                {r.description && (
                  <p className="text-xs text-muted-foreground">{r.description}</p>
                )}
              </div>
            ),
          },
          {
            key: "batch_sub",
            header: "Batch & Subject",
            cell: (r) => (
              <div className="text-sm">
                <span className="font-medium text-foreground">{r.batches?.name ?? "—"}</span>
                <div className="text-xs text-muted-foreground">{r.subjects?.name ?? "General"}</div>
              </div>
            ),
          },
          {
            key: "due",
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
            key: "status",
            header: "Teacher Check Status",
            cell: (r) => {
              const sub = r.homework_submissions?.[0];
              if (!sub) {
                return (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                    <Clock className="size-3.5" /> Pending Check
                  </span>
                );
              }

              if (sub.status === "reviewed") {
                return (
                  <div>
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <Check className="size-3.5" /> Completed
                    </span>
                    {sub.feedback && (
                      <p className="text-xs text-muted-foreground mt-0.5">{sub.feedback}</p>
                    )}
                  </div>
                );
              }

              if (sub.status === "resubmission_required") {
                return (
                  <div>
                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="size-3.5" /> Incomplete
                    </span>
                    {sub.feedback && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                        {sub.feedback}
                      </p>
                    )}
                  </div>
                );
              }

              return (
                <div>
                  <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                    <X className="size-3.5" /> Not Done
                  </span>
                  {sub.feedback && (
                    <p className="text-xs text-destructive mt-0.5 font-medium">{sub.feedback}</p>
                  )}
                </div>
              );
            },
          },
        ]}
      />
    </div>
  );
}
