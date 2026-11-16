import type { Metadata } from "next";
import Link from "next/link";
import { Layers, Users, CalendarClock, NotebookPen } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatTime, DAYS } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "Dashboard" };

type T = {
  today: string; total_students: number; pending_attendance: number; homework_count: number;
  batches: { id: string; name: string; class: string; start: string | null; end: string | null; days: number[]; students: number }[];
  today_classes: { id: string; batch: string; subject: string | null; start: string; end: string; room: string | null; status: string; marked: boolean }[];
  upcoming_exams: { id: string; name: string; start: string; batch: string; status: string }[];
  recent_results: { exam: string; batch: string; avg: number; pass_rate: number; students: number }[];
};

export default async function TeacherDashboard() {
  const ctx = await requireRole("teacher");
  const supabase = await createClient();
  const [{ data, error }, { data: ann }] = await Promise.all([
    supabase.rpc("teacher_dashboard"),
    supabase.from("announcements").select("id, title, body, created_at").order("created_at", { ascending: false }).limit(4),
  ]);
  if (error) {
    if (error.message.includes("Not authorized")) return <EmptyState title="Your teacher profile isn't linked yet" description="Ask the institute admin to link your login to your teacher record." />;
    throw new Error(error.message);
  }
  const d = data as unknown as T;
  return (
    <>
      <PageHeader title={`Hello, ${ctx.profile.full_name.split(" ")[0]}`} description={formatDate(d.today, { weekday: "long", day: "numeric", month: "long" })} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assigned batches" value={d.batches.length} icon={Layers} href="/teacher/batches" />
        <StatCard label="My students" value={d.total_students} icon={Users} tone="info" href="/teacher/students" />
        <StatCard label="Attendance pending" value={d.pending_attendance} hint="Sessions in the last 7 days" icon={CalendarClock} tone={d.pending_attendance ? "warning" : "success"} />
        <StatCard label="Active homework" value={d.homework_count} icon={NotebookPen} tone="success" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Today&apos;s classes</CardTitle></CardHeader><CardContent>
          {d.today_classes.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No classes today.</p> : <ul className="divide-y text-sm">{d.today_classes.map((c) => <li key={c.id} className="flex items-center justify-between py-2"><span><span className="font-medium">{c.batch}</span>{c.subject && ` · ${c.subject}`}<span className="block text-xs text-muted-foreground">{formatTime(c.start)}–{formatTime(c.end)}{c.room && ` · ${c.room}`}</span></span>{c.status === "cancelled" ? <StatusBadge status="cancelled" /> : c.marked ? <StatusBadge status="completed" label="Marked" /> : <StatusBadge status="pending" label="Not marked" />}</li>)}</ul>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">My batches</CardTitle></CardHeader><CardContent>
          {d.batches.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">You are not assigned to any batch yet.</p> : <ul className="divide-y text-sm">{d.batches.map((b) => <li key={b.id} className="flex items-center justify-between py-2"><Link href={`/teacher/batches/${b.id}`} className="hover:text-primary"><span className="font-medium">{b.name}</span><span className="block text-xs text-muted-foreground">{b.class} · {b.days.map((x) => DAYS[x]).join(", ")} · {formatTime(b.start)}</span></Link><span className="text-muted-foreground">{b.students} students</span></li>)}</ul>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Upcoming examinations</CardTitle></CardHeader><CardContent>
          {d.upcoming_exams.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No upcoming exams.</p> : <ul className="divide-y text-sm">{d.upcoming_exams.map((e) => <li key={e.id} className="flex justify-between py-2"><span><span className="font-medium">{e.name}</span><span className="block text-xs text-muted-foreground">{e.batch}</span></span><span>{formatDate(e.start)}</span></li>)}</ul>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Recent student performance</CardTitle></CardHeader><CardContent>
          {d.recent_results.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No published results yet.</p> : <ul className="divide-y text-sm">{d.recent_results.map((r, i) => <li key={i} className="flex justify-between py-2"><span><span className="font-medium">{r.exam}</span><span className="block text-xs text-muted-foreground">{r.batch} · {r.students} students</span></span><span className="text-right tabular-nums">Avg {r.avg}%<span className="block text-xs text-muted-foreground">{r.pass_rate}% passed</span></span></li>)}</ul>}
        </CardContent></Card>
        {(ann ?? []).length > 0 && <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">Announcements</CardTitle></CardHeader><CardContent><ul className="space-y-3 text-sm">{ann!.map((a) => <li key={a.id}><span className="font-medium">{a.title}</span><span className="block text-muted-foreground">{a.body}</span></li>)}</ul></CardContent></Card>}
      </div>
    </>
  );
}
