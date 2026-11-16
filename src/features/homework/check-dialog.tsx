"use client";
import { useState, useTransition } from "react";
import { Check, AlertTriangle, X, CheckCheck, Loader2, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utilities/format";
import { cn } from "@/lib/utils";
import { loadHomeworkCheckRosterAction, saveHomeworkCheckAction, type HomeworkCheckRosterData } from "./actions";

type Props = {
  homeworkId: string;
  title: string;
  batchName: string;
  dueDate: string;
  trigger?: React.ReactElement;
  onSuccess?: () => void;
};

export function CheckHomeworkDialog({
  homeworkId,
  title,
  batchName,
  dueDate,
  trigger,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<HomeworkCheckRosterData | null>(null);
  const [roster, setRoster] = useState<Record<string, { status: "complete" | "incomplete" | "not_done"; remarks: string }>>({});
  const [loading, startTransition] = useTransition();
  const [saving, startSave] = useTransition();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      startTransition(async () => {
        const res = await loadHomeworkCheckRosterAction(homeworkId);
        if (!res.ok) {
          toast.error(res.error || "Failed to load students roster");
          return;
        }
        if (!res.data) return;
        setData(res.data);
        const init: Record<string, { status: "complete" | "incomplete" | "not_done"; remarks: string }> = {};
        for (const s of res.data.students) {
          init[s.id] = { status: s.status, remarks: s.remarks };
        }
        setRoster(init);
      });
    } else {
      setData(null);
    }
  };

  const setStudentStatus = (studentId: string, status: "complete" | "incomplete" | "not_done") => {
    setRoster((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const setStudentRemarks = (studentId: string, remarks: string) => {
    setRoster((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks },
    }));
  };

  const markAll = (status: "complete" | "incomplete" | "not_done") => {
    if (!data) return;
    setRoster((prev) => {
      const next = { ...prev };
      for (const s of data.students) {
        next[s.id] = { ...next[s.id], status };
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!data) return;

    startSave(async () => {
      const records = data.students.map((s) => ({
        student_id: s.id,
        status: roster[s.id]?.status ?? "complete",
        remarks: roster[s.id]?.remarks || undefined,
      }));

      const fd = new FormData();
      fd.set("homework_id", homeworkId);
      fd.set("records_json", JSON.stringify(records));

      const res = await saveHomeworkCheckAction(fd);
      if (!res.ok) {
        toast.error(res.error || "Failed to save homework check");
        return;
      }

      toast.success(res.message || "Homework check saved!");
      setOpen(false);
      onSuccess?.();
    });
  };

  // Stats
  const total = data?.students.length ?? 0;
  const completeCount = data?.students.filter((s) => roster[s.id]?.status === "complete").length ?? 0;
  const incompleteCount = data?.students.filter((s) => roster[s.id]?.status === "incomplete").length ?? 0;
  const notDoneCount = data?.students.filter((s) => roster[s.id]?.status === "not_done").length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="sm" className="font-semibold">
              <ClipboardCheck className="size-4 mr-1.5" /> Check Homework
            </Button>
          )
        }
      />
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Check Homework: {title}</DialogTitle>
          <DialogDescription>
            {batchName} • Due: {formatDate(dueDate)}
          </DialogDescription>
        </DialogHeader>

        {loading || !data ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading {batchName} student roster...</p>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden space-y-4">
            {/* Top stats bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-medium">
                  Total: <strong className="text-foreground">{total}</strong>
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="size-3" /> {completeCount} Complete
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="size-3" /> {incompleteCount} Incomplete
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                  <X className="size-3" /> {notDoneCount} Not Done
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                  onClick={() => markAll("complete")}
                >
                  <CheckCheck className="size-3.5 mr-1" /> Mark All Complete
                </Button>
              </div>
            </div>

            {/* Students list */}
            {total === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No active students are currently enrolled in this batch.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[200px] max-h-[50vh]">
                {data.students.map((st) => {
                  const currentStatus = roster[st.id]?.status ?? "complete";
                  const currentRemarks = roster[st.id]?.remarks ?? "";

                  return (
                    <div
                      key={st.id}
                      className={cn(
                        "rounded-lg border p-3 transition-colors space-y-2",
                        currentStatus === "incomplete"
                          ? "border-amber-500/30 bg-amber-500/5"
                          : currentStatus === "not_done"
                          ? "border-destructive/30 bg-destructive/5"
                          : "bg-card"
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-foreground text-sm">{st.full_name}</div>
                          <div className="text-xs text-muted-foreground">Adm: {st.admission_no}</div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant={currentStatus === "complete" ? "default" : "outline"}
                            className={cn(
                              "h-8 px-2.5 text-xs font-semibold",
                              currentStatus === "complete"
                                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => setStudentStatus(st.id, "complete")}
                          >
                            <Check className="size-3.5 mr-1" /> Complete
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={currentStatus === "incomplete" ? "default" : "outline"}
                            className={cn(
                              "h-8 px-2.5 text-xs font-semibold",
                              currentStatus === "incomplete"
                                ? "bg-amber-600 text-white hover:bg-amber-700"
                                : "text-muted-foreground hover:text-amber-600"
                            )}
                            onClick={() => setStudentStatus(st.id, "incomplete")}
                          >
                            <AlertTriangle className="size-3.5 mr-1" /> Incomplete
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={currentStatus === "not_done" ? "destructive" : "outline"}
                            className={cn(
                              "h-8 px-2.5 text-xs font-semibold",
                              currentStatus !== "not_done" && "text-muted-foreground hover:text-destructive"
                            )}
                            onClick={() => setStudentStatus(st.id, "not_done")}
                          >
                            <X className="size-3.5 mr-1" /> Not Done
                          </Button>
                        </div>
                      </div>

                      {/* Optional remarks input if incomplete or not done */}
                      {currentStatus !== "complete" && (
                        <div className="pt-1">
                          <Input
                            placeholder="Optional remark: e.g. Did only 2 questions, forgot notebook at home..."
                            value={currentRemarks}
                            onChange={(e) => setStudentRemarks(st.id, e.target.value)}
                            className="h-7 text-xs bg-background"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving || total === 0} className="px-6 font-semibold">
                {saving ? <Loader2 className="animate-spin size-4 mr-2" /> : <ClipboardCheck className="size-4 mr-2" />}
                Save Homework Check
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
