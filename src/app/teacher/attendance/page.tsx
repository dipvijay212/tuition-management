import type { Metadata } from "next";
import {
  Layers,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  CalendarCheck,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar, SelectFilter, DateFilter } from "@/components/shared/filters";
import { Button } from "@/components/ui/button";
import { TakeAttendanceDialog } from "@/features/attendance/take-attendance-dialog";
import { formatDate, formatTime, todayIn, DAYS } from "@/lib/utilities/format";
import { pageParams, str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "Session Attendance" };

export default async function TeacherAttendancePage(props: PageProps<"/teacher/attendance">) {
  await requireRole("teacher");
  const sp = await props.searchParams;
  const today = todayIn();

  const { page, pageSize } = pageParams(sp);
  const selectedBatchFilter = str(sp.batch);
  const selectedDateFilter = str(sp.date);

  type Att = { status: string }[];
  type B = Pick<Tables<"batches">, "id" | "name" | "room" | "status" | "class_days" | "start_time" | "end_time" | "capacity"> & {
    classes: { id: string; name: string } | null;
    student_batches: { status: string }[];
    batch_subjects: { subjects: { id: string; name: string } | null }[];
  };
  type TodayS = Pick<Tables<"class_sessions">, "id" | "batch_id" | "session_date" | "attendance_submitted_at" | "status"> & { attendance: Att };
  type HistS = Pick<Tables<"class_sessions">, "id" | "batch_id" | "session_date" | "start_time" | "end_time" | "room" | "status" | "attendance_submitted_at"> & {
    batches: { id: string; name: string } | null;
    subjects: { name: string } | null;
    attendance: Att;
  };
  const data = await api<{ batches: B[]; todaySessions: TodayS[]; history: { rows: HistS[]; count: number } }>("/attendance/teacher", {
    query: { page, pageSize, batch: selectedBatchFilter, date: selectedDateFilter },
  });
  const todaySessions = data.todaySessions;
  const historySessions = data.history.rows;
  const historyCount = data.history.count;

  const batches = data.batches;

  // Collect unique subjects for the dialog
  const subjectMap = new Map<string, { id: string; name: string }>();
  for (const b of batches) {
    for (const bs of b.batch_subjects ?? []) {
      if (bs.subjects) subjectMap.set(bs.subjects.id, bs.subjects);
    }
  }
  const subjectsList = Array.from(subjectMap.values());

  const todaySessionByBatch = new Map((todaySessions ?? []).map((s) => [s.batch_id, s]));
  const todayStatsBySession = new Map<string, { present: number; absent: number }>();
  for (const sess of todaySessions ?? []) {
    if (!sess.attendance?.length) continue;
    const cur = { present: 0, absent: 0 };
    for (const a of sess.attendance ?? []) {
      if (a.status === "present" || a.status === "late") cur.present += 1;
      else if (a.status === "absent") cur.absent += 1;
    }
    todayStatsBySession.set(sess.id, cur);
  }

  const historyStatsBySession = new Map<string, { total: number; present: number; absent: number }>();
  for (const sess of historySessions ?? []) {
    if (!sess.attendance?.length) continue; // no records yet: the table falls back to enrolment count
    const cur = { total: 0, present: 0, absent: 0 };
    for (const a of sess.attendance ?? []) {
      cur.total += 1;
      if (a.status === "present" || a.status === "late") cur.present += 1;
      else if (a.status === "absent") cur.absent += 1;
    }
    historyStatsBySession.set(sess.id, cur);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Attendance"
        description="Mark and review student attendance for your assigned batches."
      />

      {/* Teacher's Assigned Batches */}
      {batches.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Layers className="mx-auto size-10 text-muted-foreground/50 mb-2" />
          <h3 className="text-base font-semibold">No batches assigned</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your institute administrator will assign your teaching batches.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {batches.map((b) => {
            const enrolledCount = b.student_batches?.filter((sb) => sb.status === "active").length ?? 0;
            const todaySession = todaySessionByBatch.get(b.id);
            const todayStats = todaySession ? todayStatsBySession.get(todaySession.id) : null;
            const isMarkedToday = !!todaySession?.attendance_submitted_at;
            const subjectNames = b.batch_subjects?.map((bs) => bs.subjects?.name).filter(Boolean).join(", ");

            return (
              <Card key={b.id} className="overflow-hidden flex flex-col justify-between">
                <CardHeader className="bg-muted/20 border-b pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        {b.name}
                      </CardTitle>
                      {b.classes?.name && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {b.classes.name}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px] mb-0.5">Schedule</span>
                      <span className="font-medium text-foreground block">
                        {b.class_days.map((d) => DAYS[d]).join(", ")}
                      </span>
                      <span className="text-muted-foreground text-[11px] flex items-center gap-1 mt-0.5">
                        <Clock className="size-3" />
                        {formatTime(b.start_time)} – {formatTime(b.end_time)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] mb-0.5">Students</span>
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <Users className="size-3.5 text-muted-foreground" />
                        {enrolledCount} {enrolledCount === 1 ? "student" : "students"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] mb-0.5">Subject</span>
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <BookOpen className="size-3.5 text-muted-foreground" />
                        {subjectNames || "General"}
                      </span>
                    </div>
                  </div>

                  {/* Today's Status Banner & Action */}
                  <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-3">
                    {isMarkedToday ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3.5" /> Marked Today ({todayStats?.present ?? 0} Present, {todayStats?.absent ?? 0} Absent)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <AlertCircle className="size-3.5" /> Attendance not taken today
                      </span>
                    )}

                    <TakeAttendanceDialog
                      batches={[{ id: b.id, name: b.name }]}
                      subjects={subjectsList}
                      defaultDate={today}
                      defaultBatchId={b.id}
                      autoStart={true}
                      initialSessionId={todaySession?.id}
                      trigger={
                        <Button
                          size="sm"
                          variant={isMarkedToday ? "outline" : "default"}
                          className="font-semibold"
                        >
                          <CheckCircle2 className="size-3.5 mr-1.5" />
                          {isMarkedToday ? "Edit Today's Attendance" : "Take Attendance"}
                        </Button>
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Attendance History Section */}
      <div className="pt-6 border-t space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalendarCheck className="size-5 text-primary" />
            Attendance History
          </h3>
          <p className="text-xs text-muted-foreground">
            Previous attendance records for your batch sessions.
          </p>
        </div>

        <FilterBar>
          <SelectFilter
            param="batch"
            label="Batch"
            options={batches.map((b) => ({ value: b.id, label: b.name }))}
          />
          <DateFilter param="date" label="Date" />
        </FilterBar>

        <DataTable
          rows={historySessions ?? []}
          rowKey={(r) => r.id}
          total={historyCount ?? 0}
          page={page}
          pageSize={pageSize}
          empty={{
            title: "No past attendance records found",
            description: "Attendance records you submit will appear here.",
          }}
          columns={[
            {
              key: "batch",
              header: "Batch Name",
              cell: (r) => (
                <div>
                  <span className="font-semibold text-foreground">{r.batches?.name ?? "—"}</span>
                  {r.subjects?.name && (
                    <div className="text-xs text-muted-foreground">{r.subjects.name}</div>
                  )}
                </div>
              ),
            },
            {
              key: "date",
              header: "Attendance Date",
              cell: (r) => (
                <div>
                  <span className="font-medium">{formatDate(r.session_date)}</span>
                  {r.session_date === today && (
                    <span className="ml-2 inline-flex items-center rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      Today
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: "total",
              header: "Total Students",
              cell: (r) => {
                const stats = historyStatsBySession.get(r.id);
                const b = batches.find((x) => x.id === r.batch_id);
                const total = stats?.total ?? (b?.student_batches?.filter((sb) => sb.status === "active").length ?? 0);
                return <span className="font-medium tabular-nums">{total}</span>;
              },
            },
            {
              key: "present",
              header: "Present",
              cell: (r) => {
                const stats = historyStatsBySession.get(r.id);
                if (!stats || !r.attendance_submitted_at) return <span className="text-xs text-muted-foreground">—</span>;
                return (
                  <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {stats.present}
                  </span>
                );
              },
            },
            {
              key: "absent",
              header: "Absent",
              cell: (r) => {
                const stats = historyStatsBySession.get(r.id);
                if (!stats || !r.attendance_submitted_at) return <span className="text-xs text-muted-foreground">—</span>;
                return (
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${
                      stats.absent > 0
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {stats.absent}
                  </span>
                );
              },
            },
            {
              key: "action",
              header: "",
              className: "text-right",
              cell: (r) => {
                const isMarked = !!r.attendance_submitted_at;
                return (
                  <TakeAttendanceDialog
                    batches={batches.map((x) => ({ id: x.id, name: x.name }))}
                    subjects={subjectsList}
                    defaultDate={r.session_date}
                    defaultBatchId={r.batch_id}
                    initialSessionId={r.id}
                    trigger={
                      <Button variant={isMarked ? "outline" : "default"} size="sm">
                        {isMarked ? "View / Edit Attendance" : "Take Attendance"}
                      </Button>
                    }
                  />
                );
              },
            },
          ]}
        />
      </div>
    </div>
  );
}
