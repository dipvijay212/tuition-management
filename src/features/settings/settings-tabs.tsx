"use client";
import { useState, useTransition } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ActionForm, Field, NativeSelect } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, DAYS } from "@/lib/utilities/format";
import { saveAcademicYear, saveGradingRules, saveInstituteProfile, savePolicies } from "./actions";
import type { Tables } from "@/types/database";

type Props = {
  institute: Tables<"institutes"> & { logo_url: string | null };
  settings: Tables<"institute_settings">;
  years: Tables<"academic_years">[];
  grades: Tables<"grading_rules">[];
};

const TIMEZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "UTC"];

function Toggle({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-3 rounded-lg border p-3">
      <Checkbox name={name} defaultChecked={defaultChecked} className="mt-0.5" />
      <span><span className="block text-sm font-medium">{label}</span>{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</span>
    </label>
  );
}

export function SettingsTabs({ institute, settings: s, years, grades }: Props) {
  return (
    <Tabs defaultValue="profile" className="gap-6">
      <TabsList className="flex-wrap">
        <TabsTrigger value="profile">Institute profile</TabsTrigger>
        <TabsTrigger value="years">Academic years</TabsTrigger>
        <TabsTrigger value="policies">Fees & policies</TabsTrigger>
        <TabsTrigger value="grading">Grading</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <Card>
          <CardHeader><CardTitle>Institute profile</CardTitle><CardDescription>Shown on receipts, report cards and the app header.</CardDescription></CardHeader>
          <CardContent>
            <ActionForm action={saveInstituteProfile}>
              {({ errors }) => (
                <>
                  <div className="flex items-center gap-4">
                    {institute.logo_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={institute.logo_url} alt="Institute logo" className="size-16 rounded-xl border object-cover" />
                      : <div className="grid size-16 place-items-center rounded-xl border bg-muted text-xs text-muted-foreground">No logo</div>}
                    <Field label="Logo (PNG/JPG/WebP, max 2 MB)" name="logo"><Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" /></Field>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Institute name" name="name" required error={errors.name}><Input id="name" name="name" defaultValue={institute.name} required /></Field>
                    <Field label="Mobile number" name="phone" error={errors.phone}><Input id="phone" name="phone" type="tel" defaultValue={institute.phone ?? ""} /></Field>
                    <Field label="Email" name="email" error={errors.email}><Input id="email" name="email" type="email" defaultValue={institute.email ?? ""} /></Field>
                    <Field label="Website" name="website" error={errors.website}><Input id="website" name="website" defaultValue={institute.website ?? ""} /></Field>
                    <Field label="Address" name="address" className="md:col-span-2"><Textarea id="address" name="address" defaultValue={institute.address ?? ""} rows={2} /></Field>
                    <Field label="Timezone" name="timezone" error={errors.timezone}>
                      <NativeSelect id="timezone" name="timezone" defaultValue={s.timezone}>{TIMEZONES.map((t) => <option key={t}>{t}</option>)}</NativeSelect>
                    </Field>
                    <Field label="Working days" name="working_days" error={errors.working_days}>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                          <label key={d} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm">
                            <input type="checkbox" name="working_days" value={d} defaultChecked={s.working_days.includes(d)} className="accent-primary" /> {DAYS[d]}
                          </label>
                        ))}
                      </div>
                    </Field>
                  </div>
                  <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
                </>
              )}
            </ActionForm>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="years">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div><CardTitle>Academic years</CardTitle><CardDescription>The current year is used as the default for admissions, classes and batches.</CardDescription></div>
            <YearDialog trigger={<Button><Plus /> Add year</Button>} />
          </CardHeader>
          <CardContent>
            {years.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No academic years yet. Add the current year (e.g. 2026-27).</p> : (
              <ul className="divide-y rounded-lg border">
                {years.map((y) => (
                  <li key={y.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div><span className="font-medium">{y.name}</span> <span className="text-sm text-muted-foreground">{formatDate(y.start_date)} – {formatDate(y.end_date)}</span></div>
                    <div className="flex items-center gap-2">{y.is_current && <StatusBadge status="active" label="Current" />}<YearDialog year={y} trigger={<Button variant="outline" size="sm">Edit</Button>} /></div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="policies">
        <ActionForm action={savePolicies} className="space-y-6">
          {({ errors }) => (
            <>
              <Card>
                <CardHeader><CardTitle>Numbering & fees</CardTitle><CardDescription>Currency is INR. Late fees are applied once per overdue fee by the daily job.</CardDescription></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <Field label="Admission number prefix" name="admission_prefix" error={errors.admission_prefix} hint="e.g. ADM → ADM-2026-0001"><Input id="admission_prefix" name="admission_prefix" defaultValue={s.admission_prefix} /></Field>
                  <Field label="Receipt number prefix" name="receipt_prefix" error={errors.receipt_prefix} hint="e.g. RCPT → RCPT-2026-00001"><Input id="receipt_prefix" name="receipt_prefix" defaultValue={s.receipt_prefix} /></Field>
                  <Field label="Default due day of month" name="default_due_day" error={errors.default_due_day}><Input id="default_due_day" name="default_due_day" type="number" min={1} max={28} defaultValue={s.default_due_day} /></Field>
                  <div className="md:col-span-3"><Toggle name="late_fee_enabled" label="Charge late fees" defaultChecked={s.late_fee_enabled} /></div>
                  <Field label="Late fee type" name="late_fee_type"><NativeSelect id="late_fee_type" name="late_fee_type" defaultValue={s.late_fee_type}><option value="fixed">Fixed amount (₹)</option><option value="percent">Percentage of fee</option></NativeSelect></Field>
                  <Field label="Late fee value" name="late_fee_value" error={errors.late_fee_value}><Input id="late_fee_value" name="late_fee_value" type="number" step="0.01" min={0} defaultValue={s.late_fee_value} /></Field>
                  <Field label="Grace days after due date" name="late_fee_grace_days" error={errors.late_fee_grace_days}><Input id="late_fee_grace_days" name="late_fee_grace_days" type="number" min={0} defaultValue={s.late_fee_grace_days} /></Field>
                  <Field label="Receipt footer note" name="receipt_footer" className="md:col-span-3"><Input id="receipt_footer" name="receipt_footer" defaultValue={s.receipt_footer ?? ""} placeholder="e.g. Fees once paid are non-refundable." /></Field>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Attendance & academics</CardTitle></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <Field label="Excused absences in attendance %" name="excused_attendance_policy" hint="How 'Excused' affects the attendance percentage.">
                    <NativeSelect id="excused_attendance_policy" name="excused_attendance_policy" defaultValue={s.excused_attendance_policy}>
                      <option value="exclude">Exclude from total sessions</option>
                      <option value="count_present">Count as attended</option>
                      <option value="count_absent">Count as not attended</option>
                    </NativeSelect>
                  </Field>
                  <Field label="Teacher correction window (hours after class)" name="attendance_correction_hours" error={errors.attendance_correction_hours}><Input id="attendance_correction_hours" name="attendance_correction_hours" type="number" min={0} defaultValue={s.attendance_correction_hours} /></Field>
                  <Toggle name="late_counts_as_present" label="Late counts as attended" defaultChecked={s.late_counts_as_present} />
                  <Toggle name="notify_parent_on_absence" label="Notify parents when a student is absent" defaultChecked={s.notify_parent_on_absence} />
                  <Toggle name="results_require_approval" label="Results need admin approval before publishing" defaultChecked={s.results_require_approval} />
                  <Toggle name="allow_late_submission" label="Allow late homework submission" defaultChecked={s.allow_late_submission} hint="Late submissions are marked 'Late'." />
                  <Field label="Max upload size (MB)" name="max_upload_mb" error={errors.max_upload_mb}><Input id="max_upload_mb" name="max_upload_mb" type="number" min={1} max={25} defaultValue={s.max_upload_mb} /></Field>
                  <Field label="Minimum password length" name="min_password_length" error={errors.min_password_length}><Input id="min_password_length" name="min_password_length" type="number" min={8} max={64} defaultValue={s.min_password_length} /></Field>
                  <Toggle name="show_birthdays" label="Show upcoming birthdays on the dashboard" defaultChecked={s.show_birthdays} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Fee reminders & notifications</CardTitle><CardDescription>Reminders are sent at most once per fee per schedule point.</CardDescription></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <Field label="Days before due date" name="fee_reminder_days_before" hint="Comma separated, e.g. 7,3" error={errors.fee_reminder_days_before}><Input id="fee_reminder_days_before" name="fee_reminder_days_before" defaultValue={s.fee_reminder_days_before.join(",")} /></Field>
                  <Field label="Days after due date" name="fee_reminder_days_after" hint="Comma separated, e.g. 3,7,15" error={errors.fee_reminder_days_after}><Input id="fee_reminder_days_after" name="fee_reminder_days_after" defaultValue={s.fee_reminder_days_after.join(",")} /></Field>
                  <Toggle name="fee_reminder_on_due" label="Remind on the due date" defaultChecked={s.fee_reminder_on_due} />
                  <Toggle name="email_enabled" label="Also send email notifications" defaultChecked={s.email_enabled} hint="Uses the email provider configured in Supabase Auth SMTP." />
                </CardContent>
              </Card>
              <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
            </>
          )}
        </ActionForm>
      </TabsContent>

      <TabsContent value="grading"><GradingEditor initial={grades} /></TabsContent>
    </Tabs>
  );
}

function YearDialog({ trigger, year }: { trigger: React.ReactElement; year?: Tables<"academic_years"> }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader><DialogTitle>{year ? "Edit academic year" : "Add academic year"}</DialogTitle></DialogHeader>
        <ActionForm action={saveAcademicYear} onSuccess={() => setOpen(false)}>
          {({ errors }) => (
            <>
              {year && <input type="hidden" name="id" value={year.id} />}
              <Field label="Name" name="name" required error={errors.name}><Input id="name" name="name" defaultValue={year?.name} placeholder="2026-27" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start date" name="start_date" required error={errors.start_date}><Input id="start_date" name="start_date" type="date" defaultValue={year?.start_date} /></Field>
                <Field label="End date" name="end_date" required error={errors.end_date}><Input id="end_date" name="end_date" type="date" defaultValue={year?.end_date} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm"><Checkbox name="is_current" defaultChecked={year?.is_current ?? true} /> Set as current academic year</label>
              <SubmitButton className="w-full">Save</SubmitButton>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

function GradingEditor({ initial }: { initial: Tables<"grading_rules">[] }) {
  const [rows, setRows] = useState(initial.map((g) => ({ grade: g.grade, min: String(g.min_percentage), max: String(g.max_percentage), is_pass: g.is_pass })));
  const [pending, start] = useTransition();
  const update = (i: number, patch: Partial<(typeof rows)[number]>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const save = () => start(async () => {
    const res = await saveGradingRules(rows.map((r) => ({ grade: r.grade, min: Number(r.min), max: Number(r.max), is_pass: r.is_pass })));
    if (res.ok) toast.success(res.message); else toast.error(res.error);
  });
  return (
    <Card>
      <CardHeader><CardTitle>Grading rules</CardTitle><CardDescription>Applied when results are published. Ranges must not overlap. A student also fails if any subject is below its passing marks.</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-center gap-2 text-xs font-medium text-muted-foreground"><span>Grade</span><span>Min %</span><span>Max %</span><span>Pass</span><span /></div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-center gap-2">
            <Input aria-label="Grade" value={r.grade} onChange={(e) => update(i, { grade: e.target.value })} />
            <Input aria-label="Minimum percentage" type="number" step="0.01" value={r.min} onChange={(e) => update(i, { min: e.target.value })} />
            <Input aria-label="Maximum percentage" type="number" step="0.01" value={r.max} onChange={(e) => update(i, { max: e.target.value })} />
            <Checkbox aria-label="Is pass grade" checked={r.is_pass} onCheckedChange={(v) => update(i, { is_pass: !!v })} />
            <Button variant="ghost" size="icon-sm" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} aria-label="Remove grade"><Trash2 /></Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRows((x) => [...x, { grade: "", min: "0", max: "0", is_pass: true }])}><Plus /> Add grade</Button>
          <Button onClick={save} disabled={pending}>{pending && <Loader2 className="animate-spin" />} Save grading rules</Button>
        </div>
      </CardContent>
    </Card>
  );
}
