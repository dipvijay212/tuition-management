import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Users, Clock, DoorOpen, CalendarRange } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime, todayIn, DAYS } from "@/lib/utilities/format";
import { EnrollDialog } from "@/features/batches/enroll-dialog";
import { RemoveEnrolmentButton } from "@/features/batches/remove-enrolment";

export const metadata: Metadata = { title: "Batch" };

export default async function BatchPage(props: PageProps<"/admin/batches/[id]">) {
  const ctx = await requireRole("admin");
  const { id } = await props.params;
  const supabase = await createClient();
  const [{ data: b }, { data: enrolments }] = await Promise.all([
    supabase.from("batches").select("*, classes(name), academic_years(name), teacher_batches(id, is_active, teachers(id, full_name)), batch_subjects(id, subjects(name))").eq("id", id).maybeSingle(),
    supabase.from("student_batches").select("id, start_date, end_date, status, end_reason, capacity_override_reason, students(id, full_name, admission_no, status)").eq("batch_id", id).order("status").order("start_date", { ascending: false }),
  ]);
  if (!b) notFound();
  const active = (enrolments ?? []).filter((e) => e.status === "active");
  const past = (enrolments ?? []).filter((e) => e.status !== "active");
  const seatsLeft = b.capacity ? b.capacity - active.length : null;
  return (
    <>
      <PageHeader
        title={b.name}
        description={<>{b.classes?.name}{b.academic_years?.name ? ` · ${b.academic_years.name}` : ""} · <StatusBadge status={b.status} /></>}
        back={{ href: "/admin/batches", label: "Batches" }}
        actions={<><Button variant="outline" nativeButton={false} render={<Link href={`/admin/batches/${id}/edit`} />}><Pencil /> Edit</Button>{b.status === "active" && <EnrollDialog batchId={id} today={todayIn(ctx.timezone)} seatsLeft={seatsLeft} />}</>}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Enrolled" value={`${active.length}${b.capacity ? ` / ${b.capacity}` : ""}`} hint={seatsLeft !== null ? (seatsLeft > 0 ? `${seatsLeft} seats left` : "Full") : "No limit"} icon={Users} tone={seatsLeft !== null && seatsLeft <= 0 ? "danger" : "primary"} />
        <StatCard label="Timing" value={`${formatTime(b.start_time)} – ${formatTime(b.end_time)}`} hint={b.class_days.map((d) => DAYS[d]).join(", ")} icon={Clock} tone="info" />
        <StatCard label="Room" value={b.room ?? "—"} icon={DoorOpen} tone="success" />
        <StatCard label="Duration" value={b.start_date ? formatDate(b.start_date, { day: "2-digit", month: "short" }) : "—"} hint={b.end_date ? `to ${formatDate(b.end_date)}` : "Ongoing"} icon={CalendarRange} tone="warning" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <DataTable
            rows={active} rowKey={(r) => r.id}
            empty={{ title: "No students enrolled", description: "Enroll active students into this batch." }}
            columns={[
              { key: "name", header: "Student", cell: (r) => <Link href={`/admin/students/${r.students?.id}`} className="font-medium hover:text-primary">{r.students?.full_name}</Link> },
              { key: "adm", header: "Admission no.", cell: (r) => r.students?.admission_no },
              { key: "since", header: "Since", hideOnMobile: true, cell: (r) => <>{formatDate(r.start_date)}{r.capacity_override_reason && <div className="text-xs text-warning">Capacity override</div>}</> },
              { key: "act", header: "", className: "text-right", cell: (r) => <RemoveEnrolmentButton enrolmentId={r.id} studentName={r.students?.full_name ?? "student"} /> },
            ]}
          />
          {past.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Enrolment history</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {past.map((e) => <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><Link href={`/admin/students/${e.students?.id}`} className="font-medium hover:text-primary">{e.students?.full_name}</Link> <span className="text-muted-foreground">{formatDate(e.start_date)} – {formatDate(e.end_date)}{e.end_reason ? ` · ${e.end_reason}` : ""}</span></span><StatusBadge status={e.status} /></li>)}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Teachers</CardTitle></CardHeader>
            <CardContent>{b.teacher_batches.filter((t) => t.is_active).length ? <ul className="space-y-2 text-sm">{b.teacher_batches.filter((t) => t.is_active).map((t) => <li key={t.id}><Link href={`/admin/teachers/${t.teachers?.id}`} className="hover:text-primary">{t.teachers?.full_name}</Link></li>)}</ul> : <p className="text-sm text-muted-foreground">No teacher assigned.</p>}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Subjects</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">{b.batch_subjects.length ? b.batch_subjects.map((s) => <span key={s.id} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{s.subjects?.name}</span>) : <p className="text-sm text-muted-foreground">No subjects.</p>}</CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
