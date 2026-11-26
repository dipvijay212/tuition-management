"use client";

import { ArrowRight, Flag, Trophy, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PerformanceSummary, SubjectTrendItem } from "./types";
import { DeltaBadge } from "./performance-summary-cards";

function Step({
  icon,
  label,
  exam,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  exam: string | null;
  value: number | null;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border bg-background/60 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tracking-tight text-foreground">
        {value !== null ? `${value}%` : "—"}
      </div>
      <div className="truncate text-xs text-muted-foreground" title={exam ?? undefined}>
        {exam ?? "—"}
      </div>
    </div>
  );
}

/** First → latest on a 0–100 track: hollow dot = first exam, filled dot = latest. */
function Dumbbell({ first, latest }: { first: number; latest: number }) {
  const lo = Math.max(0, Math.min(first, latest));
  const hi = Math.min(100, Math.max(first, latest));
  const up = latest >= first;
  return (
    <div className="relative h-4 w-full" aria-hidden>
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
      <div
        className={`absolute top-1/2 h-1 -translate-y-1/2 rounded-full ${up ? "bg-emerald-500" : "bg-destructive"}`}
        style={{ left: `${lo}%`, width: `${hi - lo}%` }}
      />
      <span
        className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-muted-foreground bg-background"
        style={{ left: `${Math.min(100, Math.max(0, first))}%` }}
      />
      <span
        className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background ${up ? "bg-emerald-500" : "bg-destructive"}`}
        style={{ left: `${Math.min(100, Math.max(0, latest))}%` }}
      />
    </div>
  );
}

export function ProgressJourneyCard({
  summary,
  subjectTrends,
}: {
  summary: PerformanceSummary;
  subjectTrends: SubjectTrendItem[];
}) {
  if (summary.total_exams < 2 || summary.first_percentage === null) return null;

  const change = Math.round((summary.current_percentage - summary.first_percentage) * 10) / 10;
  const subjects = [...subjectTrends]
    .filter((s) => s.history.length > 0)
    .sort((a, b) => (b.change_since_first ?? 0) - (a.change_since_first ?? 0));

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Progress Since First Exam</CardTitle>
          <CardDescription>
            Where the student started, their best, and where they are now — across {summary.total_exams} exams
          </CardDescription>
        </div>
        <div className="text-left sm:text-right">
          <div
            className={`text-3xl font-bold tracking-tight ${
              change > 0 ? "text-emerald-600 dark:text-emerald-400" : change < 0 ? "text-destructive" : "text-foreground"
            }`}
          >
            {change > 0 ? `+${change}` : change}
            <span className="ml-1 text-base font-semibold">pts</span>
          </div>
          <div className="text-xs text-muted-foreground">overall change since first exam</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <Step icon={<Flag className="size-3" />} label="Started" exam={summary.first_exam_name} value={summary.first_percentage} />
          <ArrowRight className="hidden size-4 shrink-0 self-center text-muted-foreground sm:block" />
          <Step icon={<Trophy className="size-3" />} label="Best" exam={summary.best_exam_name} value={summary.highest_percentage} />
          <ArrowRight className="hidden size-4 shrink-0 self-center text-muted-foreground sm:block" />
          <Step icon={<Target className="size-3" />} label="Latest" exam={summary.latest_exam_name} value={summary.current_percentage} />
        </div>

        {subjects.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium uppercase tracking-wider">By subject</span>
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="size-2.5 rounded-full border-2 border-muted-foreground bg-background" /> First exam
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2.5 rounded-full bg-emerald-500" /> Latest
                </span>
              </span>
            </div>
            <ul className="divide-y">
              {subjects.map((s) => (
                <li
                  key={s.subject_id || s.subject_name}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5 first:pt-0 last:pb-0"
                >
                  {/* Phone: name + change on one line, bar full width below. Wider: one row. */}
                  <span className="order-1 min-w-0 flex-1 truncate text-sm font-medium capitalize text-foreground sm:w-36 sm:flex-none">
                    {s.subject_name}
                  </span>
                  <div className="order-3 basis-full sm:order-2 sm:basis-auto sm:flex-1">
                    <Dumbbell first={s.first_percentage} latest={s.current_percentage} />
                  </div>
                  <span className="order-4 basis-full text-xs tabular-nums text-muted-foreground sm:order-3 sm:basis-auto sm:w-40 sm:text-right">
                    {s.first_percentage}% → <strong className="text-foreground">{s.current_percentage}%</strong>
                    <span className="ml-1">(best {s.best_percentage}%)</span>
                  </span>
                  <span className="order-2 sm:order-4">
                    <DeltaBadge delta={s.change_since_first} suffix=" pts" />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
