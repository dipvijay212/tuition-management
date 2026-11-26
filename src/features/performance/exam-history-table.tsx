"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Printer, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ExamTimelineItem, PerformanceSummary, StudentPerformanceData } from "./types";
import { DeltaBadge } from "./performance-summary-cards";
import { PrintableReportCard } from "./printable-report-card";
import { formatDate } from "@/lib/utilities/format";

interface ExamHistoryTableProps {
  student: StudentPerformanceData["student"];
  timeline: ExamTimelineItem[];
  summary: PerformanceSummary;
}

export function ExamHistoryTable({ student, timeline, summary }: ExamHistoryTableProps) {
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);

  if (!timeline || timeline.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Examination History</CardTitle>
          <CardDescription>Granular test scores, rankings, and test-over-test progression</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No published examination results recorded yet.
        </CardContent>
      </Card>
    );
  }

  // Reverse timeline for chronological table list (latest first)
  const rows = [...timeline].reverse();

  function toggleExpand(id: string) {
    setExpandedExamId((curr) => (curr === id ? null : id));
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Detailed Exam History & Progress</CardTitle>
          <CardDescription>
            Click any exam to expand subject marks breakdown or print the official report card
          </CardDescription>
        </div>
        <div className="text-xs text-muted-foreground">
          Total published: <strong className="text-foreground">{timeline.length}</strong>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        <div className="divide-y border-y sm:border sm:rounded-lg overflow-hidden">
          {rows.map((exam) => {
            const isExpanded = expandedExamId === exam.id;
            const delta = exam.percentage_delta;

            return (
              <div key={exam.id} className="transition-colors hover:bg-muted/10">
                {/* Main Exam Row */}
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer gap-3"
                  onClick={() => toggleExpand(exam.id)}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(exam.id);
                      }}
                    >
                      {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{exam.exam_name}</span>
                        <span className="text-[11px] uppercase tracking-wider text-muted-foreground rounded bg-muted px-1.5 py-0.5">
                          {exam.exam_type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(exam.start_date)}
                        {exam.batch_average !== null && ` · Batch Avg: ${exam.batch_average}%`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-7 sm:pl-0">
                    {/* Score */}
                    <div className="text-right">
                      <div className="font-bold text-sm text-foreground whitespace-nowrap">
                        {exam.total_obtained} / {exam.total_max}
                      </div>
                      <div className="text-xs text-muted-foreground">Marks</div>
                    </div>

                    {/* Percentage */}
                    <div className="text-right">
                      <div className="font-bold text-sm text-primary">{exam.percentage}%</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>

                    {/* Delta Pill */}
                    <div className="text-right min-w-20">
                      <DeltaBadge delta={delta} />
                    </div>

                    {/* Rank & Grade */}
                    <div className="text-right hidden sm:block">
                      <div className="font-semibold text-xs text-foreground">
                        {exam.rank ? `#${exam.rank}` : "—"} {exam.grade && `(${exam.grade})`}
                      </div>
                      <div className="text-[11px] text-muted-foreground">Rank & Grade</div>
                    </div>

                    {/* Pass/Fail Status */}
                    <div className="hidden sm:block">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          exam.is_pass
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {exam.is_pass ? "Pass" : "Fail"}
                      </span>
                    </div>

                    {/* Report Card Button */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <PrintableReportCard
                        instituteName={student.institute_name}
                        student={student}
                        exam={exam}
                        summary={summary}
                        triggerButton={
                          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                            <Printer className="size-3.5" />
                            <span className="hidden sm:inline">Report</span>
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded Subject Breakdown */}
                {isExpanded && (
                  <div className="bg-muted/20 border-t p-4 pl-11 space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Subject Marks Breakdown
                    </div>
                    <div className="rounded-md border bg-background overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/40 border-b text-muted-foreground text-left font-medium">
                            <th className="py-2 px-3">Subject</th>
                            <th className="py-2 px-3 text-right">Max Marks</th>
                            <th className="py-2 px-3 text-right">Passing</th>
                            <th className="py-2 px-3 text-right">Obtained</th>
                            <th className="py-2 px-3 text-right">Percentage</th>
                            <th className="py-2 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {exam.subjects.map((sub, idx) => (
                            <tr key={idx} className="hover:bg-muted/10">
                              <td className="py-2 px-3 font-medium text-foreground">{sub.subject}</td>
                              <td className="py-2 px-3 text-right text-muted-foreground">{sub.max}</td>
                              <td className="py-2 px-3 text-right text-muted-foreground">{sub.passing}</td>
                              <td className="py-2 px-3 text-right font-bold text-foreground">
                                {sub.is_absent ? (
                                  <span className="text-destructive">Absent</span>
                                ) : (
                                  sub.obtained ?? "—"
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-medium">
                                {sub.is_absent ? "—" : `${sub.percentage}%`}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {sub.is_absent ? (
                                  <span className="text-destructive font-medium">Absent</span>
                                ) : sub.is_pass ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Pass</span>
                                ) : (
                                  <span className="text-destructive font-semibold">Fail</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
