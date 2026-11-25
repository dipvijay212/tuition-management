import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Pencil, Phone, Mail } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatINR, titleCase, todayIn } from "@/lib/utilities/format";
import { DocumentUpload, LoginButton, PhotoUpload, StatusDialog, TransferDialog } from "@/features/students/profile-actions";
import { StudentPerformanceView } from "@/features/performance/student-performance-view";
import type { StudentPerformanceData } from "@/features/performance/types";

export const metadata: Metadata = { title: "Student profile" };

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm">{value || "—"}</dd></div>;
}

export default async function StudentProfile(props: PageProps<"/admin/students/[id]">) {
  const ctx = await requireRole("admin");
  const { id } = await props.params;
  // Everything keyed by the student id loads in one round trip.
  type Obl = { id: string; description: string; due_date: string; net_amount: number; amount_paid: number; balance: number; effective_status: string | null; discount_amount: number; gross_amount: number; late_fee_amount: number };
  type Detail = {
    student: (Tables<"students"> & { classes: { name: string } | null; academic_years: { name: string } | null }) | null;
    parents: { id: string; relationship: string; is_primary: boolean; is_emergency_contact: boolean; guardians: Pick<Tables<"guardians">, "id" | "full_name" | "phone" | "alt_phone" | "email" | "profile_id"> | null }[];
    enrolments: { id: string; start_date: string; end_date: string | null; status: string; end_reason: string | null; batches: { id: string; name: string; classes: { name: string } | null } | null }[];
    obligations: Obl[];
    payments: { id: string; amount: number; payment_date: string; method: string; reference: string | null; status: string; receipts: { receipt_no: string } | null }[];
    summary: { total_sessions: number; attended: number; absent: number; late: number; excused: number; percentage: number | null }[];
    recentAtt: { id: string; session_date: string; status: string; batches: { name: string } | null }[];
    results: { id: string; percentage: number; grade: string | null; is_pass: boolean; rank: number | null; total_obtained: number; total_max: number; examinations: { name: string; start_date: string | null } | null }[];
    docs: { id: string; title: string; file_path: string; created_at: string; size_bytes: number | null }[];
    history: { id: string; from_status: string | null; to_status: string; reason: string | null; changed_at: string }[];
    subjects: { id: string; name: string }[];
    allBatches: { id: string; name: string; capacity: number | null; student_batches: { status: string }[] }[];
    audit: { id: number; action: string; created_at: string; reason: string | null }[];
    urls: Record<string, string>;
  };
  const [r, perf] = await Promise.all([
    api<Detail>(`/students/${encodeURIComponent(id)}`).catch(() => null),
    api<StudentPerformanceData>(`/students/${encodeURIComponent(id)}/performance`).catch(() => null),
  ]);
  const s = r?.student;
  if (!r || !s) notFound();
  const wrap = <T,>(data: T) => ({ data });
  const [parents, enrolments, obligations, payments, summary, recentAtt, results, docs, history, subjects, allBatches, audit] = [
    wrap(r.parents), wrap(r.enrolments), wrap(r.obligations), wrap(r.payments), wrap(r.summary), wrap(r.recentAtt),
    wrap(r.results), wrap(r.docs), wrap(r.history), wrap(r.subjects), wrap(r.allBatches), wrap(r.audit),
  ];
  const docUrls: Record<string, string | null> = r.urls;
  const photo = s.photo_path ? (docUrls[s.photo_path] ?? null) : null;
  const att = summary.data?.[0];
  const obl = obligations.data ?? [];
  const outstanding = obl.filter((o) => ["unpaid", "partially_paid", "overdue"].includes(o.effective_status ?? "")).reduce((a, o) => a + Number(o.balance), 0);
  const overdue = obl.filter((o) => o.effective_status === "overdue").length;
  const active = (enrolments.data ?? []).filter((e) => e.status === "active");
  const today = todayIn(ctx.timezone);
  const batchOpts = (allBatches.data ?? []).map((b) => ({ id: b.id, name: b.name, full: b.capacity !== null && b.student_batches.filter((x) => x.status === "active").length >= b.capacity }));

  return (
    <>
      <PageHeader
        title={s.full_name}
        back={{ href: "/admin/students", label: "Students" }}
        actions={<><Button variant="outline" nativeButton={false} render={<Link href={`/admin/students/${id}/edit`} />}><Pencil /> Edit</Button><StatusDialog studentId={id} current={s.status} /></>}
      />
      <Card className="mb-6">
        <CardContent className="flex flex-col gap-6 pt-6 md:flex-row md:items-center">
          <div className="relative w-fit">
            <Avatar className="size-20">{photo && <AvatarImage src={photo} alt="" />}<AvatarFallback className="text-xl">{s.full_name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
            <PhotoUpload studentId={id} />
          </div>
          <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Info label="Admission no." value={<span className="font-medium">{s.admission_no}</span>} />
            <Info label="Status" value={<StatusBadge status={s.status} />} />
            <Info label="Class" value={s.classes?.name} />
            <Info label="Batches" value={active.map((e) => e.batches?.name).join(", ")} />
            <Info label="Attendance" value={att?.percentage != null ? `${att.percentage}%` : "No records"} />
            <Info label="Outstanding fees" value={<span className={outstanding > 0 ? "font-medium text-destructive" : ""}>{formatINR(outstanding)}{overdue > 0 && ` · ${overdue} overdue`}</span>} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="gap-4">
        <TabsList className="flex-wrap">
          {["overview", "batches", "fees", "attendance", "results", "documents", "activity"].map((t) => <TabsTrigger key={t} value={t}>{titleCase(t)}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="overview" className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Personal & academic</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <Info label="Date of birth" value={formatDate(s.date_of_birth)} />
                <Info label="Gender" value={titleCase(s.gender)} />
                <Info label="Mobile" value={s.phone} />
                <Info label="Email" value={s.email} />
                <Info label="School" value={s.school_name} />
                <Info label="Academic year" value={s.academic_years?.name} />
                <Info label="Admission date" value={formatDate(s.admission_date)} />
                <div className="col-span-2"><Info label="Address" value={[s.address, s.city, s.state, s.pin_code].filter(Boolean).join(", ")} /></div>
                <div className="col-span-2"><Info label="Subjects" value={(subjects.data ?? []).map((x) => x.name).join(", ")} /></div>
                <div className="col-span-2">
                  <dt className="mb-1 text-xs text-muted-foreground">Student login</dt>
                  {s.profile_id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status="active" label="Login enabled" />
                      <LoginButton kind="student" id={id} label="Resend invitation email" disabledReason={s.email ? undefined : "Add the student's email to invite"} />
                    </div>
                  ) : (
                    <LoginButton kind="student" id={id} disabledReason={s.email ? undefined : "Add the student's email to invite"} />
                  )}
                </div>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Parents / guardians</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(parents.data ?? []).map((p) => p.guardians && (
                <div key={p.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2"><div className="font-medium">{p.guardians.full_name} <span className="text-sm font-normal text-muted-foreground">· {titleCase(p.relationship)}</span></div><div className="flex gap-1">{p.is_primary && <StatusBadge status="active" label="Primary" tone="primary" />}{p.is_emergency_contact && <StatusBadge status="x" label="Emergency" tone="warning" />}</div></div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"><span className="flex items-center gap-1"><Phone className="size-3.5" />{p.guardians.phone}{p.guardians.alt_phone && `, ${p.guardians.alt_phone}`}</span>{p.guardians.email && <span className="flex items-center gap-1"><Mail className="size-3.5" />{p.guardians.email}</span>}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {p.guardians.profile_id ? (
                      <>
                        <StatusBadge status="active" label="Parent login enabled" />
                        <LoginButton kind="parent" id={p.guardians.id} label="Resend invitation email" disabledReason={p.guardians.email ? undefined : "Add an email to invite this parent"} />
                      </>
                    ) : (
                      <LoginButton kind="parent" id={p.guardians.id} disabledReason={p.guardians.email ? undefined : "Add an email to invite this parent"} />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches">
          <Card><CardContent className="pt-6">
            {(enrolments.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Not enrolled in any batch.</p> : (
              <ul className="divide-y">
                {(enrolments.data ?? []).map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div><Link href={`/admin/batches/${e.batches?.id}`} className="font-medium hover:text-primary">{e.batches?.name}</Link><div className="text-xs text-muted-foreground">{formatDate(e.start_date)} – {e.end_date ? formatDate(e.end_date) : "present"}{e.end_reason && ` · ${e.end_reason}`}</div></div>
                    <div className="flex items-center gap-2"><StatusBadge status={e.status} />{e.status === "active" && s.status === "active" && <TransferDialog enrolment={{ id: e.id, batchName: e.batches?.name ?? "" }} batches={batchOpts.filter((b) => b.id !== e.batches?.id)} today={today} />}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Fee obligations</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              {obl.length === 0 ? <p className="text-sm text-muted-foreground">No fees assigned.</p> : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground uppercase"><tr><th className="py-2">Description</th><th>Due</th><th className="text-right">Net</th><th className="text-right">Paid</th><th className="text-right">Balance</th><th className="pl-4">Status</th></tr></thead>
                  <tbody className="divide-y">
                    {obl.map((o) => (
                      <tr key={o.id}><td className="py-2">{o.description}{Number(o.discount_amount) > 0 && <div className="text-xs text-muted-foreground">Original {formatINR(o.gross_amount)}, discount {formatINR(o.discount_amount)}</div>}{Number(o.late_fee_amount) > 0 && <div className="text-xs text-destructive">Late fee {formatINR(o.late_fee_amount)}</div>}</td><td>{formatDate(o.due_date)}</td><td className="text-right tabular-nums">{formatINR(o.net_amount)}</td><td className="text-right tabular-nums">{formatINR(o.amount_paid)}</td><td className="text-right font-medium tabular-nums">{formatINR(o.balance)}</td><td className="pl-4"><StatusBadge status={o.effective_status ?? "unpaid"} /></td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Payment history</CardTitle></CardHeader>
            <CardContent>
              {(payments.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No payments yet.</p> : (
                <ul className="divide-y text-sm">{(payments.data ?? []).map((p) => <li key={p.id} className="flex items-center justify-between py-2"><span>{formatDate(p.payment_date)} · {titleCase(p.method)}{p.reference && ` · ${p.reference}`} <span className="text-muted-foreground">{p.receipts?.receipt_no}</span></span><span className="flex items-center gap-2 tabular-nums">{formatINR(p.amount)} <StatusBadge status={p.status} /></span></li>)}</ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card><CardContent className="space-y-4 pt-6">
            {att && att.total_sessions > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <Info label="Attendance %" value={<span className="text-lg font-semibold">{att.percentage}%</span>} /><Info label="Eligible sessions" value={att.total_sessions} /><Info label="Attended" value={att.attended} /><Info label="Absent" value={att.absent} /><Info label="Late / Excused" value={`${att.late} / ${att.excused}`} />
              </div>
            ) : <p className="text-sm text-muted-foreground">No attendance recorded yet.</p>}
            {(recentAtt.data ?? []).length > 0 && <ul className="divide-y text-sm">{recentAtt.data!.map((a) => <li key={a.id} className="flex justify-between py-2"><span>{formatDate(a.session_date)} · {a.batches?.name}</span><StatusBadge status={a.status} /></li>)}</ul>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {perf ? (
            <StudentPerformanceView data={perf} />
          ) : (
            <Card><CardContent className="pt-6">
              {(results.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No published results.</p> : (
                <ul className="divide-y text-sm">{results.data!.map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span className="font-medium">{r.examinations?.name}</span><span className="flex items-center gap-3 tabular-nums">{r.total_obtained}/{r.total_max} · {r.percentage}% · Grade {r.grade ?? "—"} · Rank {r.rank ?? "—"} <StatusBadge status={r.is_pass ? "paid" : "absent"} label={r.is_pass ? "Pass" : "Fail"} /></span></li>)}</ul>
              )}
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Documents</CardTitle><DocumentUpload studentId={id} /></CardHeader>
            <CardContent>
              {(docs.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No documents uploaded.</p> : (
                <ul className="divide-y text-sm">{docs.data!.map((d) => <li key={d.id} className="flex items-center justify-between py-2"><span className="flex items-center gap-2"><FileText className="size-4 text-muted-foreground" />{d.title} <span className="text-xs text-muted-foreground">{formatDate(d.created_at)}</span></span>{docUrls[d.file_path] ? <a href={docUrls[d.file_path] ?? undefined} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open</a> : <span className="text-muted-foreground">Unavailable</span>}</li>)}</ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card><CardContent className="pt-6">
            <ul className="space-y-3 text-sm">
              {(history.data ?? []).map((h) => <li key={h.id} className="flex gap-3"><span className="mt-1.5 size-2 rounded-full bg-primary" /><span><span className="font-medium">Status {h.from_status ? `${titleCase(h.from_status)} → ` : ""}{titleCase(h.to_status)}</span>{h.reason && <span className="text-muted-foreground"> · {h.reason}</span>}<span className="block text-xs text-muted-foreground">{formatDateTime(h.changed_at, ctx.timezone)}</span></span></li>)}
              {(audit.data ?? []).map((a) => <li key={a.id} className="flex gap-3"><span className="mt-1.5 size-2 rounded-full bg-muted-foreground" /><span><span className="font-medium">{titleCase(a.action)}</span>{a.reason && <span className="text-muted-foreground"> · {a.reason}</span>}<span className="block text-xs text-muted-foreground">{formatDateTime(a.created_at, ctx.timezone)}</span></span></li>)}
            </ul>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
