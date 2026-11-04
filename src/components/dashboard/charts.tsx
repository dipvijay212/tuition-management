"use client";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatINR } from "@/lib/utilities/format";

const axis = { stroke: "var(--muted-foreground)", fontSize: 12, tickLine: false, axisLine: false } as const;
const grid = <CartesianGrid vertical={false} stroke="var(--border)" />;
const tooltipStyle = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--popover-foreground)" }, cursor: { fill: "var(--muted)", opacity: 0.6 } };
const compact = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(0)}k` : `₹${n}`);

export type Monthly = { month: string; collection: number; other_income: number; expenses: number; admissions: number; attendance_pct: number | null };

function Frame({ title, subtitle, children, empty }: { title: string; subtitle?: string; children: React.ReactNode; empty?: boolean }) {
  return (
    <figure className="rounded-xl border bg-card p-4 sm:p-5">
      <figcaption className="mb-4"><div className="font-medium">{title}</div>{subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}</figcaption>
      {empty ? <div className="grid h-56 place-items-center text-sm text-muted-foreground">No data in this period yet</div> : <div className="h-56">{children}</div>}
    </figure>
  );
}

export function IncomeExpenseChart({ data }: { data: Monthly[] }) {
  const rows = data.map((d) => ({ month: d.month, Collection: Number(d.collection) + Number(d.other_income), Expenses: Number(d.expenses) }));
  const empty = rows.every((r) => !r.Collection && !r.Expenses);
  return (
    <Frame title="Income vs expenses" subtitle="Net fee collection (after reversals) + other income, by month" empty={empty}>
      <ResponsiveContainer>
        <BarChart data={rows} barGap={2} barCategoryGap="28%">
          {grid}
          <XAxis dataKey="month" {...axis} />
          <YAxis {...axis} tickFormatter={compact} width={56} />
          <Tooltip {...tooltipStyle} formatter={(v) => formatINR(Number(v))} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Collection" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="Expenses" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function AdmissionsChart({ data }: { data: Monthly[] }) {
  return (
    <Frame title="New admissions" subtitle="Students admitted per month" empty={data.every((d) => !d.admissions)}>
      <ResponsiveContainer>
        <BarChart data={data}>
          {grid}
          <XAxis dataKey="month" {...axis} />
          <YAxis {...axis} allowDecimals={false} width={32} />
          <Tooltip {...tooltipStyle} formatter={(v) => [v, "Admissions"]} />
          <Bar dataKey="admissions" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function AttendanceChart({ data }: { data: Monthly[] }) {
  return (
    <Frame title="Attendance trend" subtitle="Present + late as % of marked sessions (excused excluded)" empty={data.every((d) => d.attendance_pct === null)}>
      <ResponsiveContainer>
        <LineChart data={data}>
          {grid}
          <XAxis dataKey="month" {...axis} />
          <YAxis {...axis} domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={44} />
          <Tooltip {...tooltipStyle} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} formatter={(v) => [`${v}%`, "Attendance"]} />
          <Line dataKey="attendance_pct" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 4, fill: "var(--series-1)", stroke: "var(--card)", strokeWidth: 2 }} activeDot={{ r: 5 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function BatchDistributionChart({ data }: { data: { name: string; students: number }[] }) {
  const rows = data.slice(0, 8);
  return (
    <Frame title="Students per batch" subtitle={data.length > 8 ? `Top 8 of ${data.length} active batches` : "Active enrolments"} empty={rows.every((r) => !r.students)}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" {...axis} allowDecimals={false} />
          <YAxis type="category" dataKey="name" {...axis} width={110} />
          <Tooltip {...tooltipStyle} formatter={(v) => [v, "Students"]} />
          <Bar dataKey="students" fill="var(--series-1)" radius={[0, 4, 4, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}
