import type { Metadata } from "next";
import Link from "next/link";
import { UserCheck, GraduationCap, Layers, CalendarCheck, Wallet, IndianRupee, TrendingUp, TrendingDown, Cake, Megaphone, UserPlus, ClipboardList } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdmissionsChart, AttendanceChart, BatchDistributionChart, IncomeExpenseChart, type Monthly } from "@/components/dashboard/charts";
import { RangePicker } from "@/components/dashboard/range-picker";
import { formatDate, formatDateTime, formatINR, formatTime, titleCase, todayIn } from "@/lib/utilities/format";
import { str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "Dashboard" };

type D = {
  today: string;
  cards: Record<string, number>;
  monthly: Monthly[];
  batch_distribution: { name: string; students: number }[];
  today_classes: { id: string; batch: string; subject: string | null; teacher: string | null; start: string; end: string; room: string | null; status: string; marked: boolean }[];
  pending_fee_list: { student_id: string; name: string; admission_no: string; balance: number; oldest_due: string; overdue: boolean }[];
  upcoming_exams: { id: string; name: string; start: string; batch: string | null; status: string }[];
  recent_admissions: { id: string; name: string; admission_no: string; date: string; class: string | null }[];
  recent_payments: { id: string; student: string; amount: number; date: string; method: string; status: string; receipt_no: string | null }[];
  recent_activity: { action: string; entity: string; at: string; by: string | null }[];
  birthdays: { id: string; name: string; date: string; in_days: number }[];
  announcements: { id: string; title: string; body: string; at: string; important: boolean }[];
};

function shiftMonths(iso: string, months: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 - months, 1));
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), Math.min(d, 1))).toISOString().slice(0, 10);
}

function Section({ title, href, children, empty }: { title: string; href?: string; children: React.ReactNode; empty?: string }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">{title}</CardTitle>{href && <Link href={href} className="text-sm text-primary hover:underline">View all</Link>}</CardHeader>
      <CardContent>{empty ? <p className="py-4 text-center text-sm text-muted-foreground">{empty}</p> : children}</CardContent>
    </Card>
  );
}

export default async function AdminDashboard(props: PageProps<"/admin">) {
  const ctx = await requireRole("admin");
  const sp = await props.searchParams;
  const today = todayIn(ctx.timezone);
  const months = Math.min(24, Math.max(1, Number(str(sp.range)) || 6));
  const from = str(sp.from) && /^\d{4}-\d{2}-\d{2}$/.test(str(sp.from)!) ? str(sp.from)! : shiftMonths(today, months - 1);
  const to = str(sp.to) && /^\d{4}-\d{2}-\d{2}$/.test(str(sp.to)!) ? str(sp.to)! : today;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_dashboard", { p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  const d = data as unknown as D;
  const c = d.cards;
  const surplus = Number(c.range_collection) + Number(c.range_other_income) - Number(c.range_expenses);

  return (
    <>
      <PageHeader title={`Welcome, ${ctx.profile.full_name.split(" ")[0] || "Admin"}`} description={`${ctx.institute?.name} · ${formatDate(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`} actions={<RangePicker from={from} to={to} />} />

      <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl border bg-card/80 backdrop-blur-sm shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">Daily Quick Actions:</span>
        <Button size="sm" nativeButton={false} render={<Link href="/admin/students/new" />}>
          <UserPlus className="size-3.5 mr-1" /> New Admission
        </Button>
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/admin/attendance" />}>
          <CalendarCheck className="size-3.5 mr-1" /> Take Attendance
        </Button>
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/admin/fees" />}>
          <Wallet className="size-3.5 mr-1" /> Collect Fees
        </Button>
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/admin/examinations" />}>
          <ClipboardList className="size-3.5 mr-1" /> Create Test
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active students" value={c.active_students} hint={`${c.total_students} total records`} icon={UserCheck} href="/admin/students?status=active" />
        <StatCard label="Today present" value={c.today_present} hint={`${c.today_absent} absent today`} icon={CalendarCheck} tone="success" />
        <StatCard label="Pending fees" value={formatINR(c.pending_fees)} hint={`${formatINR(c.overdue_fees)} overdue`} icon={Wallet} tone="danger" />
        <StatCard label="Today's collection" value={formatINR(c.today_collection)} hint={`${formatINR(c.month_collection)} this month`} icon={IndianRupee} tone="info" />
        <StatCard label="Teachers" value={c.total_teachers} icon={GraduationCap} href="/admin/teachers" />
        <StatCard label="Classes · Batches" value={`${c.total_classes} · ${c.total_batches}`} icon={Layers} href="/admin/batches" tone="info" />
        <StatCard label="Month expenses" value={formatINR(c.month_expenses)} icon={TrendingDown} tone="warning" />
        <StatCard label="Net surplus" value={formatINR(surplus)} hint="Selected range: income − expenses" icon={TrendingUp} tone={surplus >= 0 ? "success" : "danger"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <IncomeExpenseChart data={d.monthly} />
        <AttendanceChart data={d.monthly} />
        <AdmissionsChart data={d.monthly} />
        <BatchDistributionChart data={d.batch_distribution} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Section title="Today's classes" empty={d.today_classes.length ? undefined : "No classes scheduled today."}>
          <ul className="divide-y text-sm">{d.today_classes.map((x) => <li key={x.id} className="flex items-center justify-between gap-2 py-2"><span><span className="font-medium">{x.batch}</span>{x.subject && ` · ${x.subject}`}<span className="block text-xs text-muted-foreground">{formatTime(x.start)}–{formatTime(x.end)}{x.teacher && ` · ${x.teacher}`}{x.room && ` · ${x.room}`}</span></span>{x.status === "cancelled" ? <StatusBadge status="cancelled" /> : x.marked ? <StatusBadge status="completed" label="Marked" /> : <StatusBadge status="pending" label="Not marked" />}</li>)}</ul>
        </Section>
        <Section title="Pending & due fees" empty={d.pending_fee_list.length ? undefined : "No fees due in the next 7 days."}>
          <ul className="divide-y text-sm">{d.pending_fee_list.map((x) => <li key={x.student_id} className="flex items-center justify-between gap-2 py-2"><Link href={`/admin/students/${x.student_id}`} className="hover:text-primary"><span className="font-medium">{x.name}</span><span className="block text-xs text-muted-foreground">Since {formatDate(x.oldest_due)}</span></Link><span className="text-right tabular-nums">{formatINR(x.balance)}{x.overdue && <StatusBadge status="overdue" className="ml-2" />}</span></li>)}</ul>
        </Section>
        <Section title="Upcoming examinations" empty={d.upcoming_exams.length ? undefined : "No exams in the next 30 days."}>
          <ul className="divide-y text-sm">{d.upcoming_exams.map((x) => <li key={x.id} className="flex items-center justify-between py-2"><span><span className="font-medium">{x.name}</span><span className="block text-xs text-muted-foreground">{x.batch}</span></span><span>{formatDate(x.start)}</span></li>)}</ul>
        </Section>
        <Section title="Recent admissions" href="/admin/students" empty={d.recent_admissions.length ? undefined : "No admissions yet."}>
          <ul className="divide-y text-sm">{d.recent_admissions.map((x) => <li key={x.id} className="flex items-center justify-between py-2"><Link href={`/admin/students/${x.id}`} className="hover:text-primary"><span className="font-medium">{x.name}</span><span className="block text-xs text-muted-foreground">{x.admission_no}{x.class && ` · ${x.class}`}</span></Link><span className="text-muted-foreground">{formatDate(x.date)}</span></li>)}</ul>
        </Section>
        <Section title="Recent payments" empty={d.recent_payments.length ? undefined : "No payments recorded yet."}>
          <ul className="divide-y text-sm">{d.recent_payments.map((x) => <li key={x.id} className="flex items-center justify-between py-2"><span><span className="font-medium">{x.student}</span><span className="block text-xs text-muted-foreground">{x.receipt_no} · {titleCase(x.method)} · {formatDate(x.date)}</span></span><span className="tabular-nums">{formatINR(x.amount)}{x.status === "reversed" && <StatusBadge status="reversed" className="ml-2" />}</span></li>)}</ul>
        </Section>
        <Section title="Recent activity" href="/admin/audit-logs" empty={d.recent_activity.length ? undefined : "No activity yet."}>
          <ul className="space-y-2 text-sm">{d.recent_activity.map((x, i) => <li key={i}><span className="font-medium">{["insert", "update", "delete"].includes(x.action) ? `${titleCase(x.entity)} ${x.action === "insert" ? "created" : x.action + "d"}` : titleCase(x.action)}</span> <span className="text-muted-foreground">· {x.by ?? "System"}</span><span className="block text-xs text-muted-foreground">{formatDateTime(x.at, ctx.timezone)}</span></li>)}</ul>
        </Section>
        {d.birthdays.length > 0 && (
          <Section title="Upcoming birthdays">
            <ul className="space-y-2 text-sm">{d.birthdays.map((b) => <li key={b.id} className="flex items-center gap-2"><Cake className="size-4 text-primary" /><Link href={`/admin/students/${b.id}`} className="hover:text-primary">{b.name}</Link><span className="ml-auto text-muted-foreground">{b.in_days === 0 ? "Today" : `in ${b.in_days} day(s)`}</span></li>)}</ul>
          </Section>
        )}
        {d.announcements.length > 0 && (
          <Section title="Announcements">
            <ul className="space-y-3 text-sm">{d.announcements.map((a) => <li key={a.id} className="flex gap-2"><Megaphone className="mt-0.5 size-4 shrink-0 text-primary" /><span><span className="font-medium">{a.title}</span>{a.important && <StatusBadge status="pending" label="Important" className="ml-2" />}<span className="line-clamp-2 block text-muted-foreground">{a.body}</span></span></li>)}</ul>
          </Section>
        )}
      </div>
    </>
  );
}
