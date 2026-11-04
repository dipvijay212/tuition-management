import Link from "next/link";
import { CalendarCheck, Wallet, NotebookPen, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime, formatINR, formatTime } from "@/lib/utilities/format";

type F = {
  today: string;
  student: { id: string; name: string; admission_no: string; class: string | null; status: string };
  attendance: { percentage: number | null; total: number; attended: number; absent: number };
  fees: { outstanding: number; overdue: number; next_due: string | null };
  upcoming_classes: { date: string; batch: string; subject: string | null; start: string; end: string; status: string }[];
  pending_homework: { id: string; title: string; due: string; subject: string | null }[];
  recent_results: { exam: string; percentage: number; grade: string | null; pass: boolean; rank: number | null }[];
  upcoming_exams: { name: string; start: string }[];
};

export async function FamilyDashboard({ studentId, base, timezone, showName }: { studentId: string; base: "/student" | "/parent"; timezone: string; showName?: boolean }) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("family_dashboard", { p_student: studentId });
  if (error) throw new Error(error.message);
  const d = data as unknown as F;
  const { data: notes } = await supabase.from("notifications").select("id, title, body, created_at").order("created_at", { ascending: false }).limit(5);
  return (
    <div className="space-y-6">
      {showName && <div className="flex items-center gap-2"><h2 className="text-lg font-semibold">{d.student.name}</h2><span className="text-sm text-muted-foreground">{d.student.admission_no}{d.student.class && ` · ${d.student.class}`}</span><StatusBadge status={d.student.status} /></div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Attendance" value={d.attendance.percentage != null ? `${d.attendance.percentage}%` : "—"} hint={d.attendance.total ? `${d.attendance.attended} of ${d.attendance.total} sessions` : "No sessions yet"} icon={CalendarCheck} tone={d.attendance.percentage != null && d.attendance.percentage < 75 ? "warning" : "success"} />
        <StatCard label="Fees outstanding" value={formatINR(d.fees.outstanding)} hint={d.fees.overdue > 0 ? `${formatINR(d.fees.overdue)} overdue` : d.fees.next_due ? `Next due ${formatDate(d.fees.next_due)}` : "All clear"} icon={Wallet} tone={d.fees.overdue > 0 ? "danger" : "info"} />
        <StatCard label="Pending homework" value={d.pending_homework.length} icon={NotebookPen} tone={d.pending_homework.length ? "warning" : "success"} />
        <StatCard label="Latest result" value={d.recent_results[0] ? `${d.recent_results[0].percentage}%` : "—"} hint={d.recent_results[0]?.exam} icon={Trophy} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Upcoming classes (7 days)</CardTitle></CardHeader><CardContent>
          {d.upcoming_classes.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No scheduled classes.</p> : <ul className="divide-y text-sm">{d.upcoming_classes.map((c, i) => <li key={i} className="flex justify-between py-2"><span><span className="font-medium">{c.subject ?? c.batch}</span><span className="block text-xs text-muted-foreground">{c.batch}</span></span><span className="text-right">{formatDate(c.date, { weekday: "short", day: "numeric", month: "short" })}<span className="block text-xs text-muted-foreground">{formatTime(c.start)}{c.status === "cancelled" && " · Cancelled"}</span></span></li>)}</ul>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Pending homework</CardTitle></CardHeader><CardContent>
          {d.pending_homework.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">Nothing pending.</p> : <ul className="divide-y text-sm">{d.pending_homework.map((h) => <li key={h.id} className="flex justify-between py-2"><span className="font-medium">{h.title}<span className="block text-xs font-normal text-muted-foreground">{h.subject}</span></span><span className="text-muted-foreground">Due {formatDateTime(h.due, timezone)}</span></li>)}</ul>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Recent results</CardTitle></CardHeader><CardContent>
          {d.recent_results.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No results published yet.</p> : <ul className="divide-y text-sm">{d.recent_results.map((r, i) => <li key={i} className="flex justify-between py-2"><span className="font-medium">{r.exam}</span><span className="flex items-center gap-2 tabular-nums">{r.percentage}% · {r.grade ?? "—"} <StatusBadge status={r.pass ? "paid" : "absent"} label={r.pass ? "Pass" : "Fail"} /></span></li>)}</ul>}
          {d.upcoming_exams.length > 0 && <div className="mt-4 border-t pt-3 text-sm"><div className="mb-1 text-xs text-muted-foreground">Upcoming exams</div>{d.upcoming_exams.map((e, i) => <div key={i} className="flex justify-between"><span>{e.name}</span><span>{formatDate(e.start)}</span></div>)}</div>}
        </CardContent></Card>
        <Card><CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Recent notifications</CardTitle><Link href={`${base}/notifications`} className="text-sm text-primary hover:underline">View all</Link></CardHeader><CardContent>
          {(notes ?? []).length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No notifications.</p> : <ul className="space-y-3 text-sm">{notes!.map((n) => <li key={n.id}><span className="font-medium">{n.title}</span>{n.body && <span className="block text-muted-foreground">{n.body}</span>}</li>)}</ul>}
        </CardContent></Card>
      </div>
    </div>
  );
}
