"use client";

import {
  Area,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
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
        <span className="font-medium text-primary">Student Score:</span>
        <span className="font-bold text-sm text-primary">{data.percentage}%</span>
      </div>
      {data.percentage_delta !== null && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Delta vs Prev:</span>
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
      {data.batch_average !== null && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Batch Average:</span>
          <span className="font-medium">{data.batch_average}%</span>
        </div>
      )}
      {data.rank && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Class Rank:</span>
          <span className="font-medium">#{data.rank}</span>
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
          No published exam data available to plot performance trajectory yet.
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
  }));

  const allAverages = timeline.map((t) => t.batch_average).filter((v): v is number => v !== null);
  const overallBatchAvg = allAverages.length > 0
    ? Math.round((allAverages.reduce((a, b) => a + b, 0) / allAverages.length) * 10) / 10
    : null;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pb-4">
        <div>
          <CardTitle className="text-base font-semibold">Overall Performance Trajectory</CardTitle>
          <CardDescription>
            Chronological progression across exams vs class batch benchmark
          </CardDescription>
        </div>
        {overallBatchAvg !== null && (
          <div className="text-xs text-muted-foreground">
            Class Benchmark Avg: <span className="font-semibold text-foreground">{overallBatchAvg}%</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              {grid}
              <XAxis dataKey="name" {...axis} />
              <YAxis {...axis} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
              />
              {overallBatchAvg !== null && (
                <ReferenceLine
                  y={overallBatchAvg}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  label={{ value: "Class Avg", fill: "var(--muted-foreground)", fontSize: 10, position: "insideBottomRight" }}
                />
              )}
              <Line
                type="monotone"
                dataKey="percentage"
                name="Student Score (%)"
                stroke="var(--series-1, #3b82f6)"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "var(--background)" }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="batch_average"
                name="Batch Average (%)"
                stroke="var(--series-2, #94a3b8)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
