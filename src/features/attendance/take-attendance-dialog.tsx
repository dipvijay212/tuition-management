"use client";
import { useState, useTransition } from "react";
import { Check, X, CheckCircle2, ChevronRight, ChevronLeft, Loader2, CheckCheck, Search } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/shared/form";
import { formatDate } from "@/lib/utilities/format";
import { cn } from "@/lib/utils";
import {
  prepareAttendanceSessionAction,
  loadSessionAttendanceAction,
  submitAttendanceAction,
  type PreparedAttendanceSession,
} from "./actions";

type Props = {
  batches: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  defaultDate: string;
  defaultBatchId?: string;
  initialSessionId?: string;
  autoStart?: boolean;
  trigger?: React.ReactElement;
  onSuccess?: () => void;
};

export function TakeAttendanceDialog({
  batches,
  subjects,
  defaultDate,
  defaultBatchId = "",
  initialSessionId,
  autoStart,
  trigger,
  onSuccess,
}: Props) {
  const isDirect = Boolean(defaultBatchId || initialSessionId || autoStart);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(isDirect ? 2 : 1);
  const [batchId, setBatchId] = useState(defaultBatchId);
  const [sessionDate, setSessionDate] = useState(defaultDate);
  const [subjectId, setSubjectId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editReason, setEditReason] = useState("");

  const [loading, startTransition] = useTransition();
  const [saving, startSave] = useTransition();
  const [sessionData, setSessionData] = useState<PreparedAttendanceSession | null>(null);
  const [roster, setRoster] = useState<Record<string, { status: "present" | "absent" | "late" | "excused"; remarks: string }>>({});

  const loadBatchDate = (bId: string, dDate: string, sId?: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("batch_id", bId);
      fd.set("session_date", dDate);
      if (sId) fd.set("subject_id", sId);

      const res = await prepareAttendanceSessionAction(undefined, fd);
      if (!res.ok) {
        toast.error(res.error || "Could not prepare attendance session");
        return;
      }
      if (res.data) {
        setSessionData(res.data);
        const init: Record<string, { status: "present" | "absent" | "late" | "excused"; remarks: string }> = {};
        for (const s of res.data.students) {
          init[s.id] = { status: s.status, remarks: s.remarks ?? "" };
        }
        setRoster(init);
        setStep(2);
      }
    });
  };

  const loadSession = (sId: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("session_id", sId);
      const loaded = await loadSessionAttendanceAction(undefined, fd);
      if (!loaded.ok) {
        toast.error(loaded.error || "Failed to load attendance session");
        return;
      }
      if (loaded.data) {
        setSessionData(loaded.data);
        setSessionDate(loaded.data.sessionDate);
        const init: Record<string, { status: "present" | "absent" | "late" | "excused"; remarks: string }> = {};
        for (const s of loaded.data.students) {
          init[s.id] = { status: s.status, remarks: s.remarks ?? "" };
        }
        setRoster(init);
        setStep(2);
      }
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setSearchQuery("");
      setEditReason("");
      if (initialSessionId) {
        setStep(2);
        loadSession(initialSessionId);
      } else if (defaultBatchId || autoStart) {
        setStep(2);
        setBatchId(defaultBatchId);
        loadBatchDate(defaultBatchId, sessionDate || defaultDate, subjectId);
      } else {
        setStep(1);
        setSessionData(null);
      }
    } else {
      setSessionData(null);
      if (isDirect) {
        setStep(2);
      }
    }
  };

  const handleDateChange = (newDate: string) => {
    setSessionDate(newDate);
    const targetBatch = batchId || defaultBatchId;
    if (targetBatch && newDate) {
      loadBatchDate(targetBatch, newDate, subjectId);
    }
  };

  const handleContinue = () => {
    if (!batchId) {
      toast.error("Please select a batch");
      return;
    }
    if (!sessionDate) {
      toast.error("Please select a date");
      return;
    }
    loadBatchDate(batchId, sessionDate, subjectId);
  };

  const markAll = (status: "present" | "absent") => {
    if (!sessionData) return;
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
    if (!sessionData) return;

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
        fd.set("reason", editReason.trim() || "Attendance updated by administrator");
      }

      const res = await submitAttendanceAction(undefined, fd);
      if (!res.ok) {
        toast.error(res.error || "Failed to save attendance");
        return;
      }

      toast.success(res.message || "Attendance saved successfully!");
      setOpen(false);
      onSuccess?.();
    });
  };

  // Count live stats
  const totalStudents = sessionData?.students.length ?? 0;
  const presentCount = sessionData?.students.filter((s) => roster[s.id]?.status === "present" || roster[s.id]?.status === "late").length ?? 0;
  const absentCount = sessionData?.students.filter((s) => roster[s.id]?.status === "absent").length ?? 0;

  const filteredStudents = (sessionData?.students ?? []).filter((st) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return st.full_name.toLowerCase().includes(q) || st.admission_no.toLowerCase().includes(q);
  });

  const currentBatchName =
    sessionData?.batchName ??
    batches.find((b) => b.id === (batchId || defaultBatchId))?.name ??
    "Batch";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <CheckCircle2 className="size-4 mr-1" /> Take Attendance
            </Button>
          )
        }
      />
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Take Attendance" : `Attendance: ${currentBatchName}`}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Mark or review student presence for this batch session.
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
            {step === 1 ? (
              <span>Select batch and date to record student presence.</span>
            ) : (
              <>
                <span className="font-medium text-foreground">Date:</span>
                {!initialSessionId ? (
                  <Input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="h-7 w-36 text-xs font-semibold py-0 px-2"
                    disabled={loading || saving}
                  />
                ) : (
                  <span className="font-semibold text-foreground">
                    {formatDate(sessionData?.sessionDate || sessionDate)}
                  </span>
                )}
                {sessionData?.subjectName && (
                  <span className="text-muted-foreground font-medium">
                    • {sessionData.subjectName}
                  </span>
                )}
              </>
            )}
          </div>
        </DialogHeader>

        {/* STEP 1: ONLY SHOWN IF USER DID NOT CLICK ON A SPECIFIC BATCH */}
        {step === 1 && (
          <div className="space-y-4 pt-2">
            <Field label="Batch" name="batch_id" required>
              <NativeSelect
                id="batch_id"
                name="batch_id"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                required
              >
                <option value="" disabled>Select batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Attendance Date" name="session_date" required>
              <Input
                id="session_date"
                name="session_date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
              />
            </Field>

            <Field label="Subject (optional)" name="subject_id" hint="Only if tracking subject-specific attendance">
              <NativeSelect
                id="subject_id"
                name="subject_id"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                <option value="">(General Class / All Subjects)</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <div className="pt-2">
              <Button type="button" className="w-full" onClick={handleContinue} disabled={loading || !batchId}>
                {loading ? <Loader2 className="animate-spin size-4 mr-2" /> : null}
                Continue to Attendance <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: DIRECT ROSTER (NO FLICKER / JUMP) */}
        {step === 2 && (
          loading || !sessionData ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Loading {currentBatchName} students...</p>
            </div>
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden space-y-4">
              {sessionData.isAlreadyMarked && (
                <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400">
                  Editing existing attendance records. Updates will be saved directly.
                </div>
              )}

              {/* Top Summary & Quick Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-medium">
                    Total: <strong className="text-foreground">{totalStudents}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <Check className="size-3" /> {presentCount} Present
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                    <X className="size-3" /> {absentCount} Absent
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                    onClick={() => markAll("present")}
                  >
                    <CheckCheck className="size-3.5 mr-1" /> Mark All Present
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => markAll("absent")}
                  >
                    Mark All Absent
                  </Button>
                </div>
              </div>

              {totalStudents > 6 && (
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search student by name or admission number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              )}

              {/* Students Roster */}
              {totalStudents === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No active students are currently enrolled in this batch.
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No students match &quot;{searchQuery}&quot;.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[200px] max-h-[50vh]">
                  {filteredStudents.map((st) => {
                    const currentStatus = roster[st.id]?.status ?? "present";
                    const isPresent = currentStatus === "present" || currentStatus === "late";
                    const isAbsent = currentStatus === "absent";

                    return (
                      <div
                        key={st.id}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                          isAbsent ? "border-destructive/30 bg-destructive/5" : "bg-card"
                        )}
                      >
                        <div>
                          <div className="font-medium text-foreground">{st.full_name}</div>
                          <div className="text-xs text-muted-foreground">Adm: {st.admission_no}</div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant={isPresent ? "default" : "outline"}
                            className={cn(
                              "h-8 px-3 text-xs font-semibold",
                              isPresent
                                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => setStudentStatus(st.id, "present")}
                          >
                            <Check className="size-3.5 mr-1" /> Present
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={isAbsent ? "destructive" : "outline"}
                            className={cn(
                              "h-8 px-3 text-xs font-semibold",
                              !isAbsent && "text-muted-foreground hover:text-destructive"
                            )}
                            onClick={() => setStudentStatus(st.id, "absent")}
                          >
                            <X className="size-3.5 mr-1" /> Absent
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex items-center justify-between pt-3 border-t">
                {!isDirect ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(1)}
                    disabled={saving}
                  >
                    <ChevronLeft className="size-4 mr-1" /> Change Batch
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={saving || totalStudents === 0}
                  className="px-6 font-semibold"
                >
                  {saving ? <Loader2 className="animate-spin size-4 mr-2" /> : <CheckCircle2 className="size-4 mr-2" />}
                  Save Attendance
                </Button>
              </div>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
