"use client";
import { useState } from "react";
import { Check, X, Clock, HelpCircle, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionForm } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { submitAttendanceAction } from "./actions";
import { cn } from "@/lib/utils";

type Status = "present" | "absent" | "late" | "excused";

type StudentRow = {
  id: string;
  full_name: string;
  admission_no: string;
  current_status?: Status;
  current_remarks?: string;
};

export function AttendanceSheet({
  sessionId,
  students,
  onComplete,
}: {
  sessionId: string;
  students: StudentRow[];
  onComplete?: () => void;
}) {
  const [records, setRecords] = useState<Record<string, { status: Status; remarks: string }>>(() => {
    const init: Record<string, { status: Status; remarks: string }> = {};
    for (const s of students) {
      init[s.id] = {
        status: s.current_status ?? "present",
        remarks: s.current_remarks ?? "",
      };
    }
    return init;
  });

  const markAll = (status: Status) => {
    setRecords((prev) => {
      const next = { ...prev };
      for (const s of students) {
        next[s.id] = { ...next[s.id], status };
      }
      return next;
    });
  };

  const setStatus = (studentId: string, status: Status) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const setRemarks = (studentId: string, remarks: string) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks },
    }));
  };

  const recordsPayload = JSON.stringify(
    students.map((s) => ({
      student_id: s.id,
      status: records[s.id]?.status ?? "present",
      remarks: records[s.id]?.remarks || undefined,
    }))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="text-sm font-medium text-muted-foreground">
          {students.length} student{students.length === 1 ? "" : "s"} enrolled
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => markAll("present")}
            className="text-xs text-emerald-600 hover:text-emerald-700"
          >
            <CheckCheck className="size-3.5 mr-1" /> Mark all present
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => markAll("absent")}
            className="text-xs text-destructive hover:text-destructive"
          >
            Mark all absent
          </Button>
        </div>
      </div>

      <ActionForm action={submitAttendanceAction} onSuccess={onComplete}>
        {() => (
          <>
            <input type="hidden" name="session_id" value={sessionId} />
            <input type="hidden" name="records_json" value={recordsPayload} />

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {students.map((s) => {
                const cur = records[s.id] ?? { status: "present", remarks: "" };
                return (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <div className="font-medium text-foreground">{s.full_name}</div>
                      <div className="text-xs text-muted-foreground">Adm: {s.admission_no}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center rounded-lg border bg-background p-0.5">
                        <button
                          type="button"
                          onClick={() => setStatus(s.id, "present")}
                          className={cn(
                            "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                            cur.status === "present"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Check className="size-3.5" /> P
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus(s.id, "absent")}
                          className={cn(
                            "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                            cur.status === "absent"
                              ? "bg-destructive/15 text-destructive font-semibold shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <X className="size-3.5" /> A
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus(s.id, "late")}
                          className={cn(
                            "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                            cur.status === "late"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Clock className="size-3.5" /> L
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus(s.id, "excused")}
                          className={cn(
                            "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                            cur.status === "excused"
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 font-semibold shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <HelpCircle className="size-3.5" /> E
                        </button>
                      </div>

                      <Input
                        placeholder="Remarks..."
                        value={cur.remarks}
                        onChange={(e) => setRemarks(s.id, e.target.value)}
                        className="h-8 w-32 text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <SubmitButton className="w-full">Submit Attendance</SubmitButton>
            </div>
          </>
        )}
      </ActionForm>
    </div>
  );
}

