"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  X,
  CheckCircle2,
  CheckCheck,
  Loader2,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { formatDate } from "@/lib/utilities/format";
import { cn } from "@/lib/utils";
import {
  prepareAttendanceSessionAction,
  submitAttendanceAction,
  type PreparedAttendanceSession,
} from "./actions";

type StatusFilter = "all" | "present" | "absent";

type Props = {
  initialSession: PreparedAttendanceSession;
  isFixedSession: boolean;
  backHref: string;
  backLabel: string;
};

function buildInitialRoster(session: PreparedAttendanceSession) {
  const init: Record<
    string,
    { status: "present" | "absent" | "late" | "excused"; remarks: string }
  > = {};
  for (const s of session.students) {
    init[s.id] = { status: s.status, remarks: s.remarks ?? "" };
  }
  return init;
}

export function TakeAttendanceView({
  initialSession,
  isFixedSession,
  backHref,
  backLabel,
}: Props) {
  const router = useRouter();
  const [sessionData, setSessionData] = useState<PreparedAttendanceSession>(initialSession);
  const [sessionDate, setSessionDate] = useState(initialSession.sessionDate);
  const [roster, setRoster] = useState(() => buildInitialRoster(initialSession));
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loadingDate, startDateTransition] = useTransition();
  const [saving, startSave] = useTransition();

  const handleDateChange = (newDate: string) => {
    setSessionDate(newDate);
    if (!newDate || isFixedSession) return;

    startDateTransition(async () => {
      const fd = new FormData();
      fd.set("batch_id", sessionData.batchId);
      fd.set("session_date", newDate);

      const res = await prepareAttendanceSessionAction(undefined, fd);
      if (!res.ok) {
        toast.error(res.error || "Could not load attendance for that date");
        return;
      }
      if (res.data) {
        setSessionData(res.data);
        setRoster(buildInitialRoster(res.data));
        setSearchQuery("");
        setStatusFilter("all");
      }
    });
  };

  const markAll = (status: "present" | "absent") => {
    setRoster((prev) => {
      const next = { ...prev };
      for (const s of sessionData.students) {
        next[s.id] = { ...next[s.id], status };
      }
      return next;
    });
  };

  const setStudentStatus = (studentId: string, status: "present" | "absent") => {
    setRoster((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const handleSaveAttendance = () => {
    startSave(async () => {
      const records = sessionData.students.map((s) => ({
        student_id: s.id,
        status: roster[s.id]?.status ?? "present",
        remarks: roster[s.id]?.remarks || undefined,
      }));

      const fd = new FormData();
      fd.set("session_id", sessionData.sessionId);
      fd.set("records_json", JSON.stringify(records));
      if (sessionData.isAlreadyMarked) {
        fd.set("reason", "Attendance updated");
      }

      const res = await submitAttendanceAction(undefined, fd);
      if (!res.ok) {
        toast.error(res.error || "Failed to save attendance");
        return;
      }

      toast.success(res.message || "Attendance saved successfully!");
      router.push(backHref);
      router.refresh();
    });
  };

  const totalStudents = sessionData.students.length;
  const presentCount = sessionData.students.filter(
    (s) => roster[s.id]?.status === "present" || roster[s.id]?.status === "late",
  ).length;
  const absentCount = sessionData.students.filter(
    (s) => roster[s.id]?.status === "absent",
  ).length;

  const filteredStudents = sessionData.students.filter((st) => {
    const status = roster[st.id]?.status ?? "present";
    const isPresent = status === "present" || status === "late";
    if (statusFilter === "present" && !isPresent) return false;
    if (statusFilter === "absent" && status !== "absent") return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      st.full_name.toLowerCase().includes(q) ||
      st.admission_no.toLowerCase().includes(q)
    );
  });

  const metaParts = [
    sessionData.subjectName,
    sessionData.teacherName ? `Teacher: ${sessionData.teacherName}` : null,
    isFixedSession ? formatDate(sessionData.sessionDate) : null,
  ].filter(Boolean);

  return (
    <div className="space-y-5 pb-24">
      <PageHeader
        back={{ href: backHref, label: backLabel }}
        title={`Attendance: ${sessionData.batchName}`}
        description={
          metaParts.length > 0
            ? metaParts.join(" · ")
            : "Mark present or absent for each student in this batch."
        }
        actions={
          !isFixedSession ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Date:</span>
              <DateInput
                value={sessionDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="h-9 w-44"
                disabled={loadingDate || saving}
              />
            </div>
          ) : undefined
        }
      />

      {sessionData.isAlreadyMarked && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-300">
          Editing existing attendance records for {formatDate(sessionData.sessionDate)}. Saving will update the recorded marks.
        </div>
      )}

      {/* Sticky Toolbar: Summary, Filter Pills, Search & Bulk Actions */}
      <div className="sticky top-2 z-10 rounded-xl border bg-card/95 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={statusFilter === "all" ? "secondary" : "ghost"}
              className="h-8 text-xs font-medium"
              onClick={() => setStatusFilter("all")}
            >
              All ({totalStudents})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={statusFilter === "present" ? "secondary" : "ghost"}
              className="h-8 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
              onClick={() => setStatusFilter("present")}
            >
              <Check className="mr-1 size-3.5" /> Present ({presentCount})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={statusFilter === "absent" ? "secondary" : "ghost"}
              className="h-8 text-xs font-semibold text-destructive"
              onClick={() => setStatusFilter("absent")}
            >
              <X className="mr-1 size-3.5" /> Absent ({absentCount})
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              onClick={() => markAll("present")}
              disabled={loadingDate || saving || totalStudents === 0}
            >
              <CheckCheck className="mr-1.5 size-3.5" /> Mark All Present
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs text-destructive hover:text-destructive"
              onClick={() => markAll("absent")}
              disabled={loadingDate || saving || totalStudents === 0}
            >
              Mark All Absent
            </Button>
          </div>
        </div>

        {totalStudents > 0 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search student by name or admission number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>
        )}
      </div>

      {/* Full-page Student Roster */}
      {loadingDate ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border py-20 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading attendance for {formatDate(sessionDate)}...</p>
        </div>
      ) : totalStudents === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Users className="mx-auto mb-3 size-10 text-muted-foreground/50" />
          <h3 className="text-base font-semibold">No students enrolled</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No active students are currently enrolled in this batch for {formatDate(sessionData.sessionDate)}.
          </p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No students match the current filter{searchQuery.trim() ? ` ("${searchQuery.trim()}")` : ""}.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card divide-y">
          {filteredStudents.map((st, idx) => {
            const currentStatus = roster[st.id]?.status ?? "present";
            const isPresent = currentStatus === "present" || currentStatus === "late";
            const isAbsent = currentStatus === "absent";

            return (
              <div
                key={st.id}
                className={cn(
                  "flex items-center justify-between gap-3 px-4 py-3 transition-colors",
                  isAbsent ? "bg-destructive/5" : "hover:bg-muted/30",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="w-7 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
                    {idx + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">{st.full_name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      Adm: {st.admission_no}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={isPresent ? "default" : "outline"}
                    className={cn(
                      "h-8 px-3 text-xs font-semibold sm:min-w-24",
                      isPresent
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setStudentStatus(st.id, "present")}
                    disabled={saving}
                  >
                    <Check className="mr-1 size-3.5" /> Present
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={isAbsent ? "destructive" : "outline"}
                    className={cn(
                      "h-8 px-3 text-xs font-semibold sm:min-w-24",
                      !isAbsent && "text-muted-foreground hover:text-destructive",
                    )}
                    onClick={() => setStudentStatus(st.id, "absent")}
                    disabled={saving}
                  >
                    <X className="mr-1 size-3.5" /> Absent
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="flex items-center gap-3 text-xs sm:text-sm">
          <span className="text-muted-foreground">
            Total: <strong className="text-foreground tabular-nums">{totalStudents}</strong>
          </span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {presentCount} Present
          </span>
          <span className="font-semibold text-destructive tabular-nums">
            {absentCount} Absent
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={<Link href={backHref} />}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSaveAttendance}
            disabled={saving || loadingDate || totalStudents === 0}
            className="px-6 font-semibold"
          >
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 size-4" />
            )}
            Save Attendance
          </Button>
        </div>
      </div>
    </div>
  );
}
