"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExamTimelineItem, SubjectTrendItem } from "./types";

const axis = { stroke: "var(--muted-foreground)", fontSize: 12, tickLine: false, axisLine: false } as const;
const grid = <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />;

const COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#64748b", // slate
];

export function SubjectProgressionChart({
  timeline,
  subjectTrends,
}: {
  timeline: ExamTimelineItem[];
  subjectTrends: SubjectTrendItem[];
}) {
  if (!timeline || timeline.length === 0 || !subjectTrends || subjectTrends.length === 0) {
    return null;
  }

  // Build rows per exam with subject keys
  const chartData = timeline.map((t) => {
    const row: Record<string, string | number | null> = {
      exam: t.exam_name.length > 14 ? `${t.exam_name.slice(0, 12)}...` : t.exam_name,
      fullName: t.exam_name,
    };

    t.subjects.forEach((sub) => {
      // Key by subject id: names are snapshotted per exam and may change (rename, casing).
      row[sub.subject_id || sub.subject] = sub.is_absent || sub.obtained === null ? null : sub.percentage;
    });

    return row;
  });

  const subjectLines = subjectTrends.map((s) => ({ key: s.subject_id || s.subject_name, name: s.subject_name }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Subject-Wise Trend Tracking</CardTitle>
        <CardDescription>
          Compare how scores in individual subjects evolved test by test
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              {grid}
              <XAxis dataKey="exam" {...axis} />
              <YAxis {...axis} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "var(--popover-foreground)",
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
              />
              {subjectLines.map(({ key, name }, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={name}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
