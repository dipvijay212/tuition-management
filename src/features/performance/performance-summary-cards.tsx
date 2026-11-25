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
    highest_percentage,
    latest_delta,
    net_improvement,
    trend,
    current_rank,
    rank_delta,
    pass_rate,
    attendance_percentage,
  } = summary;

  if (total_exams === 0) {
    return (
      <Card className="border-dashed bg-muted/20">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No published examinations recorded for this student yet. As soon as exams are published, performance analytics, deltas, and trajectory trends will appear here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {/* 1. Latest Exam Score */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-wider">Latest Score</span>
            <DeltaBadge delta={latest_delta} />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {current_percentage}%
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {latest_delta !== null ? (
              latest_delta > 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Increased by {latest_delta}%</span>
              ) : latest_delta < 0 ? (
                <span className="text-destructive font-medium">Decreased by {Math.abs(latest_delta)}%</span>
              ) : (
                "Unchanged from previous test"
              )
            ) : (
              "First test score"
            )}
          </p>
        </CardContent>
      </Card>

      {/* 2. Trajectory & Growth */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-wider">Growth Trend</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                trend === "improving"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : trend === "declining"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {trend === "improving" ? <TrendingUp className="size-3" /> : trend === "declining" ? <TrendingDown className="size-3" /> : <Minus className="size-3" />}
              {trend}
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {net_improvement >= 0 ? `+${net_improvement}%` : `${net_improvement}%`}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Net growth since 1st test
          </p>
        </CardContent>
      </Card>

      {/* 3. Batch Standing & Rank */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-wider">Class Rank</span>
            {rank_delta !== null && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                  rank_delta > 0 ? "text-emerald-600 dark:text-emerald-400" : rank_delta < 0 ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {rank_delta > 0 ? `↑ ${rank_delta} places` : rank_delta < 0 ? `↓ ${Math.abs(rank_delta)} places` : "Same rank"}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {current_rank ? `#${current_rank}` : "—"}
            </span>
            <Award className="size-4 text-amber-500" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Peak rank achieved: #{highest_percentage ? Math.round(highest_percentage) : "—"}%
          </p>
        </CardContent>
      </Card>

      {/* 4. Average & Pass Rate */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-wider">Cumulative Avg</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3" /> {pass_rate}% Pass
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {average_percentage}%
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Across {total_exams} published {total_exams === 1 ? "exam" : "exams"}
          </p>
        </CardContent>
      </Card>

      {/* 5. Attendance Factor */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
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
            Correlates with test scores
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
