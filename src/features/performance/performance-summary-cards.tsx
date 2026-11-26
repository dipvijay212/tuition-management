"use client";

import { TrendingUp, TrendingDown, Minus, Award, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PerformanceSummary } from "./types";

export function DeltaBadge({ delta, suffix = "%", inverted = false }: { delta: number | null; suffix?: string; inverted?: boolean }) {
  if (delta === null || delta === undefined) {
    return <span className="inline-flex items-center text-xs font-medium text-muted-foreground">Baseline</span>;
  }

  const isPositive = inverted ? delta < 0 : delta > 0;
  const isNeutral = Math.abs(delta) < 0.1;

  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
        <Minus className="size-3" /> 0.0{suffix} (Stable)
      </span>
    );
  }

  if (isPositive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="size-3" /> +{Math.abs(delta)}{suffix}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
      <TrendingDown className="size-3" /> -{Math.abs(delta)}{suffix}
    </span>
  );
}

export function PerformanceSummaryCards({ summary }: { summary: PerformanceSummary }) {
  const {
    total_exams,
    current_percentage,
    average_percentage,
    latest_delta,
    current_rank,
    current_rank_out_of,
    rank_delta,
    attendance_percentage,
  } = summary;

  if (total_exams === 0) {
    return (
      <Card className="border-dashed bg-muted/20">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No exam results yet. Progress will appear here after the first exam is published.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {/* 1. Latest Exam Score */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium uppercase tracking-wider">Latest score</span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {current_percentage}%
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {latest_delta !== null ? (
              latest_delta > 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{latest_delta}% higher than last exam</span>
              ) : latest_delta < 0 ? (
                <span className="text-destructive font-medium">{Math.abs(latest_delta)}% lower than last exam</span>
              ) : (
                "Same as last exam"
              )
            ) : (
              "First exam"
            )}
          </p>
        </CardContent>
      </Card>

      {/* 3. Batch Standing & Rank */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium uppercase tracking-wider">Rank</span>
            {rank_delta !== null && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                  rank_delta > 0 ? "text-emerald-600 dark:text-emerald-400" : rank_delta < 0 ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {rank_delta > 0 ? `↑ ${rank_delta} ${rank_delta === 1 ? "place" : "places"}` : rank_delta < 0 ? `↓ ${Math.abs(rank_delta)} ${rank_delta === -1 ? "place" : "places"}` : "Same rank"}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {current_rank ? `#${current_rank}` : "—"}
            </span>
            {current_rank && current_rank_out_of ? (
              <span className="text-xs text-muted-foreground">of {current_rank_out_of} {current_rank_out_of === 1 ? "student" : "students"}</span>
            ) : null}
            <Award className="size-4 text-amber-500" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            In the latest exam
          </p>
        </CardContent>
      </Card>

      {/* 4. Average & Pass Rate */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium uppercase tracking-wider">Average score</span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {average_percentage}%
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Across {total_exams} {total_exams === 1 ? "exam" : "exams"}
          </p>
        </CardContent>
      </Card>

      {/* 5. Attendance Factor */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium uppercase tracking-wider">Attendance</span>
            {attendance_percentage !== null && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                  attendance_percentage >= 85
                    ? "text-emerald-600 dark:text-emerald-400"
                    : attendance_percentage >= 70
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-destructive"
                }`}
              >
                {attendance_percentage >= 85 ? (
                  <CheckCircle2 className="size-3" />
                ) : (
                  <AlertCircle className="size-3" />
                )}
                {attendance_percentage >= 85 ? "Good" : attendance_percentage >= 70 ? "Fair" : "Low"}
              </span>
            )}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {attendance_percentage !== null ? `${attendance_percentage}%` : "—"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Of classes attended
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
