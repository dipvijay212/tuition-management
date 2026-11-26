import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone, Pencil } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDate, formatINR, formatTime, todayIn, DAYS } from "@/lib/utilities/format";
import { TeacherAttendanceForm } from "@/features/teachers/teacher-attendance-form";

export const metadata: Metadata = { title: "Teacher" };

export default async function TeacherProfilePage(props: PageProps<"/admin/teachers/[id]">) {
  const ctx = await requireRole("admin");
  const { id } = await props.params;
  type TB = { id: string; start_date: string; is_active: boolean; batches: Pick<Tables<"batches">, "id" | "name" | "start_time" | "end_time" | "class_days"> & { classes: { name: string } | null; student_batches: { count: number }[] } };
  type Att = Pick<Tables<"teacher_attendance">, "attendance_date" | "status" | "remarks">;
  const r = await api<{ teacher: Tables<"teachers"> | null; subjects: { id: string; name: string }[]; batches: TB[]; attendance: Att[]; photoUrl: string | null }>(`/teachers/${encodeURIComponent(id)}`).catch(() => null);
  const t = r?.teacher;
  if (!r || !t) notFound();
  const { subjects, batches, attendance: att, photoUrl: photo } = r;
  const active = (batches ?? []).filter((b) => b.is_active);
  return (
    <>
      <PageHeader title={t.full_name} back={{ href: "/admin/teachers", label: "Teachers" }} actions={<Button variant="outline" nativeButton={false} render={<Link href={`/admin/teachers/${id}/edit`} />}><Pencil /> Edit</Button>} />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="size-16">{photo && <AvatarImage src={photo} alt="" />}<AvatarFallback className="text-lg">{t.full_name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
              <div><div className="font-semibold">{t.full_name}</div><div className="text-sm text-muted-foreground">{t.specialization ?? "Teacher"}</div><div className="mt-1"><StatusBadge status={t.employment_status} /></div></div>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" /> {t.phone}</div>
              {t.email && <div className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" /> {t.email}</div>}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div><dt className="text-xs text-muted-foreground">Qualification</dt><dd>{t.qualification ?? "—"}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Joined</dt><dd>{formatDate(t.joining_date)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Monthly salary</dt><dd>{t.monthly_salary !== null ? formatINR(t.monthly_salary) : "—"}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Login</dt><dd>{t.profile_id ? "Enabled" : "Not created"}</dd></div>
              </div>
              {t.address && <div className="pt-2"><dt className="text-xs text-muted-foreground">Address</dt><dd>{t.address}</dd></div>}
            </dl>
            <div>
              <div className="mb-2 text-xs text-muted-foreground">Subjects</div>
              <div className="flex flex-wrap gap-1.5">{(subjects ?? []).length ? [...new Set(subjects!.map((s) => s.name))].map((name) => <span key={name} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{name}</span>) : <span className="text-sm text-muted-foreground">None assigned</span>}</div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Assigned batches ({active.length})</CardTitle></CardHeader>
            <CardContent>
              {active.length === 0 ? <p className="text-sm text-muted-foreground">Not assigned to any batch. Assign from the Batches page.</p> : (
                <ul className="divide-y">
                  {active.map((b) => b.batches && (
                    <li key={b.id} className="flex items-center justify-between py-3">
                      <div><Link href={`/admin/batches/${b.batches.id}`} className="font-medium hover:text-primary">{b.batches.name}</Link><div className="text-xs text-muted-foreground">{b.batches.classes?.name} · {b.batches.class_days.map((d) => DAYS[d]).join(", ")} · {formatTime(b.batches.start_time)}–{formatTime(b.batches.end_time)}</div></div>
                      <span className="text-sm text-muted-foreground">{(b.batches.student_batches as unknown as { count: number }[])?.[0]?.count ?? 0} students</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Staff attendance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <TeacherAttendanceForm teacherId={id} today={todayIn(ctx.timezone)} />
              {(att ?? []).length > 0 && (
                <ul className="divide-y text-sm">
                  {att!.map((a) => <li key={a.attendance_date} className="flex items-center justify-between py-2"><span>{formatDate(a.attendance_date)}{a.remarks && <span className="text-muted-foreground"> · {a.remarks}</span>}</span><StatusBadge status={a.status} /></li>)}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
