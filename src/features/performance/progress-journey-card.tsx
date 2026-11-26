"use client";

import { ArrowRight, Flag, Trophy, Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PerformanceSummary, SubjectTrendItem } from "./types";

const round1 = (n: number) => Math.round(n * 10) / 10;

/** "▲ 17.3%" / "▼ 2%" / "No change", coloured. Values are percentage points of score. */
function Change({ value, size = "sm" }: { value: number | null; size?: "sm" | "lg" }) {
  if (value === null) return null;
  const v = round1(value);
  const cls = size === "lg" ? "text-2xl font-bold" : "text-xs font-semibold";
  if (Math.abs(v) < 0.1) {
    return <span className={`inline-flex items-center gap-1 text-muted-foreground ${cls}`}><Minus className="size-3.5" /> No change</span>;
  }
  const up = v > 0;
  return (
    <span className={`inline-flex items-center gap-1 ${up ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"} ${cls}`}>
      {up ? <TrendingUp className={size === "lg" ? "size-5" : "size-3.5"} /> : <TrendingDown className={size === "lg" ? "size-5" : "size-3.5"} />}
      {up ? "+" : "−"}{Math.abs(v)}%
    </span>
  );
}

function Step({ icon, label, exam, value }: { icon: React.ReactNode; label: string; exam: string | null; value: number | null }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border bg-background/60 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tracking-tight text-foreground">{value !== null ? `${value}%` : "—"}</div>
      <div className="truncate text-xs text-muted-foreground" title={exam ?? undefined}>{exam ?? "—"}</div>
    </div>
  );
}

export function ProgressJourneyCard({ summary, subjectTrends }: { summary: PerformanceSummary; subjectTrends: SubjectTrendItem[] }) {
  if (summary.total_exams < 2 || summary.first_percentage === null) return null;

  const change = summary.current_percentage - summary.first_percentage;
  const subjects = [...subjectTrends].filter((s) => s.history.length > 0).sort((a, b) => a.subject_name.localeCompare(b.subject_name));

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Progress since first exam</CardTitle>
          <CardDescription>
            Overall score went from {summary.first_percentage}% to {summary.current_percentage}% over {summary.total_exams} exams.
          </CardDescription>
        </div>
        <Change value={change} size="lg" />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <Step icon={<Flag className="size-3" />} label="First exam" exam={summary.first_exam_name} value={summary.first_percentage} />
          <ArrowRight className="hidden size-4 shrink-0 self-center text-muted-foreground sm:block" />
          <Step icon={<Trophy className="size-3" />} label="Best" exam={summary.best_exam_name} value={summary.highest_percentage} />
          <ArrowRight className="hidden size-4 shrink-0 self-center text-muted-foreground sm:block" />
          <Step icon={<Target className="size-3" />} label="Latest" exam={summary.latest_exam_name} value={summary.current_percentage} />
        </div>

        {subjects.length > 0 && (
          <div>
            <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:grid-cols-[10rem_minmax(0,1fr)_7rem_5rem]">
              <span>Subject</span>
              <span className="hidden sm:block">Latest score</span>
              <span className="text-right">First → Latest</span>
              <span className="text-right">Change</span>
            </div>
            <ul className="divide-y">
              {subjects.map((s) => {
                const up = s.current_percentage >= s.first_percentage;
                return (
                  <li key={s.subject_id || s.subject_name} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-1.5 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)_7rem_5rem]">
                    <span className="truncate text-sm font-medium capitalize text-foreground">{s.subject_name}</span>
                    {/* bar: how high the latest score is, out of 100% */}
                    <div className="order-last col-span-3 h-2 overflow-hidden rounded-full bg-muted sm:order-none sm:col-span-1">
                      <div className={`h-full rounded-full ${up ? "bg-emerald-500" : "bg-destructive"}`} style={{ width: `${Math.min(100, Math.max(0, s.current_percentage))}%` }} />
                    </div>
                    <span className="text-right text-xs tabular-nums text-muted-foreground">
                      {s.first_percentage}% → <strong className="text-foreground">{s.current_percentage}%</strong>
                    </span>
                    <span className="text-right"><Change value={s.change_since_first} /></span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
