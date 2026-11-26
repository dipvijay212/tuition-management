"use client";

import { useState } from "react";
import {
  TrendingUp,
  BarChart3,
  BookOpen,
  Calendar,
  Award,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import type { StudentPerformanceData } from "./types";
import { PerformanceSummaryCards } from "./performance-summary-cards";
import { PerformanceTrendChart } from "./performance-trend-chart";
import { SubjectMasteryCards } from "./subject-mastery-cards";
import { SubjectProgressionChart } from "./subject-progression-chart";
import { ExamHistoryTable } from "./exam-history-table";
import { ProgressJourneyCard } from "./progress-journey-card";

export function StudentPerformanceView({ data }: { data: StudentPerformanceData }) {
  const { student, summary, timeline, subject_trends } = data;
  const [activeTab, setActiveTab] = useState("overview");

  const isImproving = summary.trend === "improving";
  const isDeclining = summary.trend === "declining";
  const w = summary.trend_window;
  const windowText = w === 1 ? "the latest exam vs the one before" : `the last ${w} exams vs the ${w} before`;
  const dipNote = summary.latest_dip
    ? ` The latest test dipped by ${Math.abs(summary.latest_delta ?? 0)} pts — a single dip is worth watching, not yet a trend.`
    : "";

  return (
    <div className="space-y-6">
      {/* Dynamic Performance Headline Banner */}
      {summary.total_exams > 0 && (
        <div
          className={`rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isImproving
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
              : isDeclining
              ? "border-destructive/30 bg-destructive/10 text-destructive-foreground dark:text-red-200"
              : "border-border bg-muted/30 text-foreground"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full p-2 ${
                isImproving
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : isDeclining
                  ? "bg-destructive/20 text-destructive"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isImproving ? (
                <ArrowUpRight className="size-5" />
              ) : isDeclining ? (
                <ArrowDownRight className="size-5" />
              ) : (
                <Minus className="size-5" />
              )}
            </span>
            <div>
              <h2 className="font-bold text-base sm:text-lg">
                {summary.total_exams < 2
                  ? "First exam recorded — progress tracking starts with the next one"
                  : isImproving
                  ? `Improving: averaging ${summary.recent_average}% recently, up ${summary.trend_delta} pts`
                  : isDeclining
                  ? `Declining: averaging ${summary.recent_average}% recently, down ${Math.abs(summary.trend_delta ?? 0)} pts`
                  : `Steady: averaging ${summary.recent_average}% recently`}
              </h2>
              <p className="text-xs opacity-90 mt-0.5">
                {summary.total_exams < 2
                  ? `Scored ${summary.current_percentage}% in ${summary.latest_exam_name}.`
                  : `Comparing ${windowText} (${summary.prior_average}% → ${summary.recent_average}%). ${
                      summary.net_improvement >= 0 ? "+" : ""
                    }${summary.net_improvement} pts since the first exam.${dipNote}${
                      isDeclining ? " Targeted revision in focus subjects will help regain momentum." : ""
                    }`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold">
            <span className="rounded-full bg-background/80 px-3 py-1 shadow-xs border">
              Overall Pass Rate: {summary.pass_rate}%
            </span>
          </div>
        </div>
      )}

      {/* Top 5 KPI Cards */}
      <PerformanceSummaryCards summary={summary} />

      {/* Main Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="max-w-full justify-start overflow-x-auto [scrollbar-width:none]">
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="hidden size-3.5 sm:block" />
            <span className="sm:hidden">Overview</span>
            <span className="hidden sm:inline">Progression Overview</span>
          </TabsTrigger>
          <TabsTrigger value="subjects" className="gap-1.5">
            <BookOpen className="hidden size-3.5 sm:block" />
            <span className="sm:hidden">Subjects ({subject_trends.length})</span>
            <span className="hidden sm:inline">Subject Mastery ({subject_trends.length})</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Layers className="hidden size-3.5 sm:block" />
            <span className="sm:hidden">History ({timeline.length})</span>
            <span className="hidden sm:inline">Exam History & Reports ({timeline.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Progression Overview */}
        <TabsContent value="overview" className="space-y-6">
          <ProgressJourneyCard summary={summary} subjectTrends={subject_trends} />
          <PerformanceTrendChart timeline={timeline} />
          {subject_trends.length > 0 && (
            <SubjectProgressionChart timeline={timeline} subjectTrends={subject_trends} />
          )}
          <ExamHistoryTable student={student} timeline={timeline} summary={summary} />
        </TabsContent>

        {/* Tab 2: Subject Mastery */}
        <TabsContent value="subjects" className="space-y-6">
          <SubjectMasteryCards subjectTrends={subject_trends} />
          <SubjectProgressionChart timeline={timeline} subjectTrends={subject_trends} />
        </TabsContent>

        {/* Tab 3: Detailed Exam History */}
        <TabsContent value="history" className="space-y-6">
          <ExamHistoryTable student={student} timeline={timeline} summary={summary} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
