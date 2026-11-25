"use client";

import { useState } from "react";
import { Printer, FileText, CheckCircle2, XCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ExamTimelineItem, PerformanceSummary, StudentPerformanceData } from "./types";
import { formatDate } from "@/lib/utilities/format";

interface PrintableReportCardProps {
  student: StudentPerformanceData["student"];
  exam: ExamTimelineItem;
  summary: PerformanceSummary;
  instituteName?: string;
  triggerButton?: React.ReactNode;
}

export function PrintableReportCard({
  student,
  exam,
  summary,
  instituteName = "Tuition Institute",
  triggerButton,
}: PrintableReportCardProps) {
  const [open, setOpen] = useState(false);

  function handlePrint() {
    window.print();
  }

  // Calculate teacher commentary based on delta and performance
  const delta = exam.percentage_delta;
  const isImproved = delta !== null && delta > 0;
  const isDeclined = delta !== null && delta < 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerButton ? (triggerButton as React.ReactElement) : undefined}>
        {!triggerButton && (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Printer className="size-3.5" />
            Report Card
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-8">
        <DialogHeader className="print:hidden flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <DialogTitle>Official Report Card</DialogTitle>
            <DialogDescription>Preview and print formal progress report card</DialogDescription>
          </div>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="size-4" />
            Print / Save PDF
          </Button>
        </DialogHeader>

        {/* Printable Paper Canvas */}
        <div id="printable-report-canvas" className="space-y-6 pt-4 text-foreground print:p-0">
          {/* Institute Header */}
          <div className="border-b-2 border-primary/30 pb-4 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-primary uppercase">
              {instituteName}
            </h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mt-0.5">
              Academic Progress & Evaluation Report Card
            </p>
            <div className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {exam.exam_name} ({exam.exam_type.replace(/_/g, " ").toUpperCase()})
            </div>
          </div>

          {/* Student Profile Info Grid */}
          <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/20 p-4 text-xs sm:grid-cols-4">
            <div>
              <span className="text-muted-foreground uppercase font-medium">Student Name:</span>
              <div className="text-sm font-bold text-foreground mt-0.5">{student.full_name}</div>
            </div>
            <div>
              <span className="text-muted-foreground uppercase font-medium">Admission No:</span>
              <div className="text-sm font-bold text-foreground mt-0.5">{student.admission_no}</div>
            </div>
            <div>
              <span className="text-muted-foreground uppercase font-medium">Class / Grade:</span>
              <div className="text-sm font-semibold text-foreground mt-0.5">{student.class_name ?? "—"}</div>
            </div>
            <div>
              <span className="text-muted-foreground uppercase font-medium">Exam Date:</span>
              <div className="text-sm font-semibold text-foreground mt-0.5">{formatDate(exam.start_date)}</div>
            </div>
          </div>

          {/* Core Result Summary Banner */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Total Score</span>
              <div className="text-xl font-bold text-foreground mt-0.5">{exam.total_obtained} / {exam.total_max}</div>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Percentage</span>
              <div className="text-xl font-bold text-primary mt-0.5">{exam.percentage}%</div>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Progress Delta</span>
              <div className="mt-1 flex items-center justify-center gap-1 font-bold">
                {delta !== null ? (
                  isImproved ? (
                    <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="size-3.5" /> +{delta}%
                    </span>
                  ) : isDeclined ? (
                    <span className="inline-flex items-center gap-0.5 text-destructive">
                      <TrendingDown className="size-3.5" /> {delta}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground inline-flex items-center gap-0.5">
                      <Minus className="size-3.5" /> 0.0%
                    </span>
                  )
                ) : (
                  <span className="text-xs text-muted-foreground">Baseline (1st)</span>
                )}
              </div>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Class Rank</span>
              <div className="text-xl font-bold text-foreground mt-0.5">
                {exam.rank ? `#${exam.rank}` : "—"}
                {exam.total_students_in_exam > 0 && <span className="text-xs text-muted-foreground font-normal"> of {exam.total_students_in_exam}</span>}
              </div>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Final Result</span>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    exam.is_pass
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {exam.is_pass ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                  {exam.is_pass ? "PASSED" : "FAILED"}
                </span>
              </div>
            </div>
          </div>

          {/* Subject-Wise Mark Breakdown Table */}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b text-muted-foreground uppercase font-semibold">
                  <th className="py-2.5 px-3 text-left">Subject</th>
                  <th className="py-2.5 px-3 text-right">Max Marks</th>
                  <th className="py-2.5 px-3 text-right">Passing</th>
                  <th className="py-2.5 px-3 text-right">Marks Obtained</th>
                  <th className="py-2.5 px-3 text-right">Percentage</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {exam.subjects.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-muted/10">
                    <td className="py-2.5 px-3 font-medium text-foreground">{sub.subject}</td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">{sub.max}</td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">{sub.passing}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-foreground">
                      {sub.is_absent ? (
                        <span className="text-destructive font-semibold">Absent</span>
                      ) : (
                        sub.obtained ?? "—"
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium">
                      {sub.is_absent ? "—" : `${sub.percentage}%`}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {sub.is_absent ? (
                        <span className="text-destructive font-semibold">Absent</span>
                      ) : sub.is_pass ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Pass</span>
                      ) : (
                        <span className="font-semibold text-destructive">Fail</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 border-t font-bold">
                  <td className="py-2.5 px-3 text-left">Grand Total</td>
                  <td className="py-2.5 px-3 text-right">{exam.total_max}</td>
                  <td className="py-2.5 px-3 text-right">—</td>
                  <td className="py-2.5 px-3 text-right text-primary text-sm">{exam.total_obtained}</td>
                  <td className="py-2.5 px-3 text-right text-primary text-sm">{exam.percentage}%</td>
                  <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
                    {exam.is_pass ? "PASSED" : "FAILED"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Performance & Growth Commentary */}
          <div className="rounded-lg border bg-muted/10 p-4 space-y-2 text-xs">
            <span className="font-semibold uppercase tracking-wider text-muted-foreground block">
              Academic Growth & Faculty Remarks:
            </span>
            <p className="text-foreground leading-relaxed">
              {delta !== null ? (
                isImproved ? (
                  <span>
                    The student has demonstrated commendable progress with a <strong>+{delta}% improvement</strong> over their previous examination. Continued dedication in regular revision is highly encouraged.
                  </span>
                ) : isDeclined ? (
                  <span>
                    Performance shows a decline of <strong>{Math.abs(delta)}%</strong> compared to the previous test. Target revision sessions and practice in identified focus subjects are advised to regain momentum.
                  </span>
                ) : (
                  <span>
                    Performance has remained steady with consistent scoring. Continued regular practice is recommended to elevate overall rankings.
                  </span>
                )
              ) : (
                <span>
                  Baseline evaluation completed. Future assessments will track progression and score deltas against this benchmark.
                </span>
              )}
            </p>
            {summary.attendance_percentage !== null && (
              <p className="text-muted-foreground">
                Cumulative Attendance: <strong>{summary.attendance_percentage}%</strong> ({summary.attended_sessions} of {summary.total_sessions} sessions).
              </p>
            )}
          </div>

          {/* Signature Grid */}
          <div className="grid grid-cols-3 gap-6 pt-12 pb-4 text-center text-xs">
            <div className="border-t border-muted-foreground/40 pt-2 font-medium">
              Class Teacher Signature
            </div>
            <div className="border-t border-muted-foreground/40 pt-2 font-medium">
              Principal / Institute Head
            </div>
            <div className="border-t border-muted-foreground/40 pt-2 font-medium">
              Parent / Guardian Signature
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
