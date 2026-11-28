"use client";

import { Sparkles, AlertTriangle, BookOpen, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubjectTrendItem } from "./types";
import { DeltaBadge } from "./performance-summary-cards";

export function SubjectMasteryCards({ subjectTrends }: { subjectTrends: SubjectTrendItem[] }) {
  if (!subjectTrends || subjectTrends.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subject Performance & Mastery</CardTitle>
          <CardDescription>Strengths and areas requiring focus across all subjects</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No subject marks recorded yet.
        </CardContent>
      </Card>
    );
  }

  const strengths = subjectTrends.filter((s) => s.status === "strength");
  const focusAreas = subjectTrends.filter((s) => s.status === "needs_attention");
  const neutral = subjectTrends.filter((s) => s.status === "neutral");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Star Subjects (Strengths) */}
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="size-4" />
              </span>
              <div>
                <CardTitle className="text-base text-emerald-950 dark:text-emerald-200">
                  Key Strengths ({strengths.length})
                </CardTitle>
                <CardDescription className="text-emerald-700/80 dark:text-emerald-400/80 text-xs">
                  Subjects where the student consistently excels or shows strong gains
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {strengths.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                As exam scores increase above 75%, strong subjects will be highlighted here.
              </p>
            ) : (
              strengths.map((sub) => (
                <div
                  key={sub.subject_id || sub.subject_name}
                  className="rounded-lg border bg-background/80 p-3 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm flex items-center gap-2">
                      <BookOpen className="size-3.5 text-emerald-600" />
                      {sub.subject_name}
                    </span>
                    <DeltaBadge delta={sub.delta} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Current: <strong className="text-foreground">{sub.current_percentage}%</strong></span>
                    <span>All-time Avg: <strong className="text-foreground">{sub.average_percentage}%</strong></span>
                    <span>{sub.history.length} {sub.history.length === 1 ? "test" : "tests"}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(sub.current_percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Focus Areas (Needs Attention) */}
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-4" />
              </span>
              <div>
                <CardTitle className="text-base text-amber-950 dark:text-amber-200">
                  Focus Areas ({focusAreas.length})
                </CardTitle>
                <CardDescription className="text-amber-700/80 dark:text-amber-400/80 text-xs">
                  Subjects with score dips, nearing pass cutoff, or requiring revision
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {focusAreas.length === 0 ? (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 py-2 font-medium">
                Great job! No subjects currently flagged as at-risk or declining.
              </p>
            ) : (
              focusAreas.map((sub) => (
                <div
                  key={sub.subject_id || sub.subject_name}
                  className="rounded-lg border bg-background/80 p-3 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm flex items-center gap-2">
                      <BookOpen className="size-3.5 text-amber-600" />
                      {sub.subject_name}
                    </span>
                    <DeltaBadge delta={sub.delta} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Current: <strong className="text-foreground">{sub.current_percentage}%</strong></span>
                    <span>All-time Avg: <strong className="text-foreground">{sub.average_percentage}%</strong></span>
                    <span className="text-amber-600 font-medium">Revision Recommended</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${Math.min(sub.current_percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Complete Subject Roster with Progression Bars */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Subjects Progression Matrix</CardTitle>
          <CardDescription>
            Comprehensive performance and test-by-test movement for each subject
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y text-sm">
            {subjectTrends.map((sub) => (
              <div key={sub.subject_id || sub.subject_name} className="py-3 first:pt-0 last:pb-0 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{sub.subject_name}</span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        sub.status === "strength"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : sub.status === "needs_attention"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {sub.status === "strength" ? "Strength" : sub.status === "needs_attention" ? "Needs Focus" : "Consistent"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-muted-foreground">
                      Latest: <strong className="text-foreground font-semibold text-sm">{sub.current_percentage}%</strong>
                    </span>
                    <span className="text-muted-foreground">
                      Avg: <strong className="text-foreground">{sub.average_percentage}%</strong>
                    </span>
                    <DeltaBadge delta={sub.delta} />
                  </div>
                </div>

                {/* Subject progress bar */}
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      sub.current_percentage >= 75
                        ? "bg-emerald-500"
                        : sub.current_percentage >= 50
                        ? "bg-primary"
                        : "bg-destructive"
                    }`}
                    style={{ width: `${Math.min(sub.current_percentage, 100)}%` }}
                  />
                </div>

                {/* Recent test trail badges */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[11px] text-muted-foreground mr-1">Exam history:</span>
                  {sub.history.map((h, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground"
                      title={`${h.exam_name}: ${h.percentage}% (${h.obtained}/${h.max})`}
                    >
                      {h.exam_name}: <strong className="text-foreground">{h.percentage}%</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
