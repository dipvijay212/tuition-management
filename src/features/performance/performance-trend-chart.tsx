"use client";

import {
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExamTimelineItem } from "./types";
import { formatDate } from "@/lib/utilities/format";

const axis = { stroke: "var(--muted-foreground)", fontSize: 12, tickLine: false, axisLine: false } as const;
const grid = <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />;

interface TooltipPayloadItem {
  dataKey: string;
  name: string;
  value: number;
  payload: {
    exam_name: string;
    start_date: string;
    percentage: number;
    batch_average: number | null;
    batch_highest: number | null;
    percentage_delta: number | null;
    grade: string | null;
    rank: number | null;
    is_pass: boolean;
    attendance_pct: number | null;
    attendance_sessions: number;
    total_students_in_exam: number;
  };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="rounded-xl border bg-popover/95 p-3 shadow-lg backdrop-blur-sm text-popover-foreground text-xs min-w-44 space-y-1.5">
      <div className="font-semibold text-sm border-b pb-1 text-foreground">
        {data.exam_name}
      </div>
      <div className="text-muted-foreground">
        Date: {formatDate(data.start_date)}
      </div>
      <div className="flex items-center justify-between gap-4 pt-1">
        <span className="font-medium text-primary">Score:</span>
        <span className="font-bold text-sm text-primary">{data.percentage}%</span>
      </div>
      {data.percentage_delta !== null && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Change from last exam:</span>
          <span
            className={`font-semibold ${
              data.percentage_delta > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : data.percentage_delta < 0
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
          >
            {data.percentage_delta > 0 ? `+${data.percentage_delta}% ↗` : data.percentage_delta < 0 ? `${data.percentage_delta}% ↘` : "0.0% →"}
          </span>
        </div>
      )}
      {data.batch_average !== null && data.total_students_in_exam > 1 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Batch Average:</span>
          <span className="font-medium">{data.batch_average}%</span>
        </div>
      )}
      {data.attendance_pct !== null && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Attendance before this exam:</span>
          <span className="font-medium">
            {data.attendance_pct}% <span className="text-muted-foreground">({data.attendance_sessions} classes)</span>
          </span>
        </div>
      )}
      {data.rank && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Rank:</span>
          <span className="font-medium">
            #{data.rank}
            {data.total_students_in_exam > 0 && <span className="text-muted-foreground"> of {data.total_students_in_exam}</span>}
          </span>
        </div>
      )}
      {data.grade && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Grade:</span>
          <span className="font-medium">{data.grade}</span>
        </div>
      )}
    </div>
  );
}

export function PerformanceTrendChart({ timeline }: { timeline: ExamTimelineItem[] }) {
  if (!timeline || timeline.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Trajectory</CardTitle>
          <CardDescription>Track exam-over-exam score improvement over time</CardDescription>
        </CardHeader>
        <CardContent className="h-64 grid place-items-center text-sm text-muted-foreground">
          No exam results yet.
        </CardContent>
      </Card>
    );
  }

  const chartData = timeline.map((t, idx) => ({
    index: idx + 1,
    name: t.exam_name.length > 14 ? `${t.exam_name.slice(0, 12)}...` : t.exam_name,
    fullName: t.exam_name,
    start_date: t.start_date,
    percentage: t.percentage,
    batch_average: t.batch_average,
    batch_highest: t.batch_highest,
    percentage_delta: t.percentage_delta,
    grade: t.grade,
    rank: t.rank,
    is_pass: t.is_pass,
    attendance_pct: t.attendance_pct,
    attendance_sessions: t.attendance_sessions,
    total_students_in_exam: t.total_students_in_exam,
  }));

  // A batch average is only a benchmark when others sat the exam too.
  const hasPeers = timeline.some((t) => t.total_students_in_exam > 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Score in each exam</CardTitle>
        <CardDescription>
          {hasPeers ? "Solid line: the student's score. Dashed line: the batch average." : "The student's score in every exam, oldest to newest."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 24, right: 16, left: -20, bottom: 0 }}>
              {grid}
              <XAxis dataKey="name" {...axis} interval="preserveStartEnd" />
              <YAxis {...axis} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              {hasPeers && (
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 12, fontSize: 12 }} />
              )}
              <Line
                type="monotone"
                dataKey="percentage"
                name="Score"
                stroke="var(--series-1, #3b82f6)"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "var(--background)" }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              >
                <LabelList dataKey="percentage" position="top" offset={10} formatter={(v: unknown) => `${Math.round(Number(v))}%`} style={{ fontSize: 11, fill: "var(--foreground)", fontWeight: 600 }} />
              </Line>
              {hasPeers && (
                <Line type="monotone" dataKey="batch_average" name="Batch average" stroke="var(--series-2, #94a3b8)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
