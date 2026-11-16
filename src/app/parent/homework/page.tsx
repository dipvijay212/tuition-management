import type { Metadata } from "next";
import { Check, AlertTriangle, X, Clock, Baby } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { formatDate, todayIn } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "Child's Homework" };

export default async function ParentHomeworkPage() {
  await requireRole("parent");
  const supabase = await createClient();
  const today = todayIn();

  // Find linked children
  const { data: links } = await supabase
    .from("parent_students")
    .select("student_id, students(id, full_name, student_batches(batch_id, status))");

  const students = (links ?? []).map((l) => l.students).filter(Boolean);
  const studentMap = new Map<string, string>();
  for (const s of students) {
    if (s) studentMap.set(s.id, s.full_name);
  }

  const batchStudentMap = new Map<string, string>();
  for (const s of students) {
    if (s) {
      for (const sb of s.student_batches ?? []) {
        if (sb.status === "active") {
          batchStudentMap.set(sb.batch_id, s.full_name);
        }
      }
    }
  }

  const batchIds = Array.from(batchStudentMap.keys());

  const { data: homeworkList, error } = batchIds.length > 0
    ? await supabase
        .from("homework")
        .select(`
          id, title, description, assigned_date, due_at, batch_id,
          batches(name),
          subjects(name),
          homework_submissions(student_id, status, feedback)
        `)
        .in("batch_id", batchIds)
        .order("due_at", { ascending: false })
    : { data: [], error: null };

  if (error) throw error;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Children's Homework & Discipline"
        description="Track daily homework completion and teacher feedback for your children."
      />

      <DataTable
        rows={homeworkList ?? []}
        rowKey={(r) => r.id}
        empty={{
          title: "No homework currently assigned",
          description: "Homework given to your children will appear here.",
        }}
        columns={[
          {
            key: "child",
            header: "Student",
            cell: (r) => (
              <div className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                <Baby className="size-4 text-primary shrink-0" />
                <span>{batchStudentMap.get(r.batch_id) ?? "Child"}</span>
              </div>
            ),
          },
          {
            key: "title",
            header: "Homework Task",
            cell: (r) => (
              <div className="space-y-0.5">
                <div className="font-semibold text-foreground text-sm">{r.title}</div>
                {r.description && (
                  <p className="text-xs text-muted-foreground">{r.description}</p>
                )}
              </div>
            ),
          },
          {
            key: "subject",
            header: "Subject & Batch",
            cell: (r) => (
              <div className="text-sm">
                <span className="font-medium text-foreground">{r.subjects?.name ?? "General"}</span>
                <div className="text-xs text-muted-foreground">{r.batches?.name}</div>
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
            header: "Homework Status",
            cell: (r) => {
              // Find the submission for the linked child
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
