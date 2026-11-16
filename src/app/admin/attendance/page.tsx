import type { Metadata } from "next";
import Link from "next/link";
import {
  GraduationCap,
  Layers,
  Users,
  ArrowRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  CalendarCheck,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar, SelectFilter, DateFilter, SearchInput } from "@/components/shared/filters";
import { Button } from "@/components/ui/button";
import { TakeAttendanceDialog } from "@/features/attendance/take-attendance-dialog";
import { formatDate, formatTime, todayIn, DAYS } from "@/lib/utilities/format";
import { pageParams, str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "Attendance Management" };

type Att = { status: string }[];
type DetailBatch = Pick<Tables<"batches">, "id" | "class_id" | "name" | "capacity" | "room" | "status" | "class_days" | "start_time" | "end_time"> & {
  teacher_batches: { is_active: boolean; teachers: { id: string; full_name: string } | null }[];
  student_batches: { id: string; status: string; student_id: string }[];
};
type TodaySession = Pick<Tables<"class_sessions">, "id" | "batch_id" | "session_date" | "attendance_submitted_at" | "status"> & { attendance: Att };
type HistorySession = Pick<Tables<"class_sessions">, "id" | "batch_id" | "session_date" | "start_time" | "end_time" | "room" | "status" | "attendance_submitted_at"> & {
  batches: { id: string; name: string } | null;
  subjects: { name: string } | null;
  teachers: { full_name: string } | null;
  attendance: Att;
};

/** Class-detail data for the attendance page (one backend call). Shaped like the old query results. */
async function loadClassDetail(classId: string, sp: Record<string, string | string[] | undefined>) {
  const { page, pageSize } = pageParams(sp);
  const d = await api<{ batches: DetailBatch[]; subjects: { id: string; name: string; class_id: string | null }[]; todaySessions: TodaySession[]; history: { rows: HistorySession[]; count: number } }>(
    `/attendance/admin/classes/${encodeURIComponent(classId)}`,
    { query: { page, pageSize, batch: str(sp.batch), date: str(sp.date) } },
  );
  return {
    batchesRes: { data: d.batches, error: null },
    subjectsRes: { data: d.subjects },
    todayRes: { data: d.todaySessions },
    historyRes: { data: d.history.rows, count: d.history.count, error: null },
  };
}


export default async function AdminAttendancePage(props: PageProps<"/admin/attendance">) {
  await requireRole("admin");
  const sp = await props.searchParams;
  const today = todayIn();

  const selectedClassId = str(sp.class);

  // 1. Active classes with their batch and student counts.
  type ClassRow = Pick<Tables<"classes">, "id" | "name" | "description" | "sort_order" | "status"> & {
    academic_years: { name: string } | null;
    batches: { id: string; status: string }[];
    students: { id: string; status: string }[];
  };
  // When a class is selected, its detail loads in parallel with the class list.
  const detailP = selectedClassId ? loadClassDetail(selectedClassId, sp) : null;
  detailP?.catch(() => {});
  const rawClasses = await api<ClassRow[]>("/attendance/admin/classes", { query: { q: !selectedClassId ? str(sp.q) : undefined } });

  const classes = (rawClasses ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    status: c.status,
    academic_year: c.academic_years?.name,
    batchCount: c.batches?.filter((b) => b.status === "active").length ?? 0,
    studentCount: c.students?.filter((s) => s.status === "active").length ?? 0,
  }));

  // =========================================================================
  // VIEW 1: NO CLASS SELECTED -> ONLY SHOW THE CLASSES!
  // =========================================================================
  if (!selectedClassId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Attendance Management"
          description="Select a class to take attendance or review batch presence records."
        />

        <FilterBar>
          <SearchInput placeholder="Search classes..." />
        </FilterBar>

        {classes.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <GraduationCap className="mx-auto size-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-base font-semibold">No classes found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {str(sp.q) ? "No classes matched your search." : "Start by adding your first academic class."}
            </p>
            <Button nativeButton={false} render={<Link href="/admin/classes" />}>
              Go to Classes
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes.map((c) => (
              <Card
                key={c.id}
                className="group hover:border-primary/50 hover:shadow-sm transition-all duration-200 flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                          <GraduationCap className="size-5" />
                        </div>
                        <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                          {c.name}
                        </CardTitle>
                      </div>
                      {c.academic_year && (
                        <p className="text-xs text-muted-foreground font-medium pl-9">
                          {c.academic_year}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {c.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {c.description}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Standard academic batch stream
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Layers className="size-4 text-muted-foreground" />
                      <div>
                        <span className="font-semibold text-foreground block">
                          {c.batchCount}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {c.batchCount === 1 ? "Batch" : "Batches"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-muted-foreground" />
                      <div>
                        <span className="font-semibold text-foreground block">
                          {c.studentCount}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {c.studentCount === 1 ? "Student" : "Students"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    nativeButton={false}
                    render={<Link href={`/admin/attendance?class=${c.id}`} />}
                    className="w-full font-medium"
                  >
                    View Batches & Take Attendance
                    <ArrowRight className="size-4 ml-1.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: CLASS SELECTED -> SHOW ITS BATCHES & ATTENDANCE ACTIONS
  // =========================================================================
  const currentClass = classes.find((c) => c.id === selectedClassId) ?? {
    id: selectedClassId,
    name: "Class",
    academic_year: undefined,
  };

  const detail = await detailP!;
  const { data: batches, error: batchError } = detail.batchesRes;
  const { data: subjects } = detail.subjectsRes;
  const { data: todaySessions } = detail.todayRes;
  const { data: historySessions, count: historyCount, error: historyError } = detail.historyRes;
  if (batchError) throw batchError;
  if (historyError) throw historyError;

  const batchList = batches ?? [];

  const todaySessionByBatch = new Map((todaySessions ?? []).map((s) => [s.batch_id, s]));
  const todayStatsBySession = new Map<string, { present: number; absent: number }>();
  for (const sess of todaySessions ?? []) {
    if (!sess.attendance?.length) continue;
    const cur = { present: 0, absent: 0 };
    for (const a of sess.attendance) {
      if (a.status === "present" || a.status === "late") cur.present += 1;
      else if (a.status === "absent") cur.absent += 1;
    }
    todayStatsBySession.set(sess.id, cur);
  }

  const { page, pageSize } = pageParams(sp);

  const historyStatsBySession = new Map<string, { total: number; present: number; absent: number }>();
  for (const sess of historySessions ?? []) {
    if (!sess.attendance?.length) continue; // no records yet: the table falls back to enrolment count
    const cur = { total: 0, present: 0, absent: 0 };
    for (const a of sess.attendance) {
      cur.total += 1;
      if (a.status === "present" || a.status === "late") cur.present += 1;
      else if (a.status === "absent") cur.absent += 1;
    }
    historyStatsBySession.set(sess.id, cur);
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/admin/attendance" />}
          className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ChevronLeft className="size-4" /> Back to all classes
        </Button>
      </div>

      <PageHeader
        title={`${currentClass.name} — Batches`}
        description="Choose a batch below to take attendance for today or review previous history."
      />

      {/* Batches Grid */}
      {batchList.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Layers className="mx-auto size-10 text-muted-foreground/50 mb-2" />
          <h3 className="text-base font-semibold">No active batches in {currentClass.name}</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Create batches for this class to start taking attendance.
          </p>
          <Button nativeButton={false} render={<Link href="/admin/batches/new" />}>
            Create Batch
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {batchList.map((b) => {
            const activeTeacher = b.teacher_batches
              ?.filter((tb) => tb.is_active)
              .map((tb) => tb.teachers?.full_name)
              .join(", ");
            const enrolledCount = b.student_batches?.filter((sb) => sb.status === "active").length ?? 0;
            const todaySession = todaySessionByBatch.get(b.id);
            const todayStats = todaySession ? todayStatsBySession.get(todaySession.id) : null;
            const isMarkedToday = !!todaySession?.attendance_submitted_at;

            return (
              <Card key={b.id} className="overflow-hidden flex flex-col justify-between">
                <CardHeader className="bg-muted/20 border-b pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base font-bold text-foreground">
                      {b.name}
                    </CardTitle>
                    <StatusBadge status={b.status} />
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px] mb-0.5">Teacher</span>
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <User className="size-3.5 text-muted-foreground" />
                        {activeTeacher || "Not assigned"}
                      </span>
                    </div>
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
                      <span className="text-muted-foreground block text-[11px] mb-0.5">Enrolled Students</span>
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <Users className="size-3.5 text-muted-foreground" />
                        {enrolledCount} {enrolledCount === 1 ? "student" : "students"}
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
                      subjects={subjects ?? []}
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

      {/* Attendance History Section for this Class */}
      <div className="pt-6 border-t space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalendarCheck className="size-5 text-primary" />
            Attendance History for {currentClass.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            Review past attendance records for batches in this class.
          </p>
        </div>

        <FilterBar>
          <SelectFilter
            param="batch"
            label="Batch"
            options={batchList.map((b) => ({ value: b.id, label: b.name }))}
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
            description: "Mark attendance using the batch cards above to build attendance history.",
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
                const b = batchList.find((x) => x.id === r.batch_id);
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
                    batches={batchList.map((x) => ({ id: x.id, name: x.name }))}
                    subjects={subjects ?? []}
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
