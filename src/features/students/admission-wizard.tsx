"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/shared/form-alert";
import { selectClass } from "@/components/shared/form";
import { cn } from "@/lib/utils";
import { formatDate, formatINR, titleCase } from "@/lib/utilities/format";
import { FEE_TYPE_LABEL, previewInstallments, type FeeType } from "@/lib/calculations/fees";
import { admissionSchema, type AdmissionInput } from "./schema";
import { admitStudent } from "./actions";

type Opt = { id: string; name: string };
export type AdmissionOptions = {
  today: string; defaultDueDay: number; currentYear: string | null;
  classes: Opt[]; years: Opt[];
  subjects: (Opt & { class_id: string | null })[];
  batches: (Opt & { class_id: string; capacity: number | null; enrolled: number })[];
  structures: { id: string; name: string; class_id: string | null; fee_type: FeeType; category: string; total_amount: number; installments: number; default_due_day: number | null; discount_eligible: boolean }[];
  discounts: { id: string; name: string; discount_type: string; value: number }[];
};

const STEPS = ["Student", "Parents", "Academic", "Fees", "Review"] as const;
const STEP_FIELDS: Path<AdmissionInput>[][] = [
  ["full_name", "date_of_birth", "gender", "phone", "email"],
  ["guardians"],
  ["admission_date", "class_id", "batch_ids", "admission_no"],
  ["fees"],
  [],
];

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-destructive">{msg}</p> : null;
}

export function AdmissionWizard({ o }: { o: AdmissionOptions }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const form = useForm<AdmissionInput>({
    resolver: zodResolver(admissionSchema),
    mode: "onTouched",
    defaultValues: {
      full_name: "", date_of_birth: "", gender: "", blood_group: "", phone: "", email: "", address: "", city: "", state: "Gujarat", pin_code: "",
      guardians: [{ full_name: "", phone: "", alt_phone: "", email: "", relationship: "father", is_primary: true, is_emergency_contact: true }],
      admission_no: "", admission_date: o.today, school_name: "", class_id: "", academic_year_id: o.currentYear ?? "", subject_ids: [], batch_ids: [], capacity_override_reason: "", previous_academics: "",
      fees: [], create_parent_login: true, create_student_login: false,
    },
  });
  const { register, control, formState: { errors }, setValue, trigger, getValues } = form;
  const guardians = useFieldArray({ control, name: "guardians" });
  const fees = useFieldArray({ control, name: "fees" });
  const classId = useWatch({ control, name: "class_id" });
  const batchIds = useWatch({ control, name: "batch_ids" }) ?? [];
  const values = useWatch({ control });

  const classSubjects = o.subjects.filter((s) => !s.class_id || s.class_id === classId);
  const classBatches = o.batches.filter((b) => b.class_id === classId);
  const fullBatches = classBatches.filter((b) => batchIds.includes(b.id) && b.capacity !== null && b.enrolled >= b.capacity);

  const next = async () => {
    setServerError(null);
    const ok = await trigger(STEP_FIELDS[step], { shouldFocus: true });
    if (step === 1 && ok && getValues("guardians").filter((g) => g.is_primary).length !== 1) { setServerError("Mark exactly one parent/guardian as the primary contact."); return; }
    if (step === 2 && ok && fullBatches.length && !(getValues("capacity_override_reason") ?? "").trim()) { setServerError("A selected batch is full. Enter a capacity override reason or choose another batch."); return; }
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const addStructure = (id: string) => {
    const s = o.structures.find((x) => x.id === id);
    if (!s) return;
    fees.append({ fee_structure_id: s.id, description: s.name, category: s.category as "tuition", fee_type: s.fee_type, base_amount: s.total_amount, installments: s.installments, start_date: getValues("admission_date"), due_day: s.default_due_day ?? o.defaultDueDay, discount_id: "", discount_amount: 0, scholarship_amount: 0, discount_reason: "" });
  };
  const addCustomFee = () => fees.append({ fee_structure_id: "", description: "Tuition fee", category: "tuition", fee_type: "monthly", base_amount: 0, installments: 12, start_date: getValues("admission_date"), due_day: o.defaultDueDay, discount_id: "", discount_amount: 0, scholarship_amount: 0, discount_reason: "" });

  const submit = () => start(async () => {
    setServerError(null);
    const valid = await trigger();
    if (!valid) { setServerError("Some details are invalid. Please go back and check each step."); return; }
    const res = await admitStudent(getValues());
    if (!res.ok) { setServerError(res.error); return; }
    toast.success(res.message, { description: res.data?.notes.join(" · ") || undefined, duration: 8000 });
    router.push(`/admin/students/${res.data!.id}`);
  });

  const feeTotals = useMemo(() => (values.fees ?? []).reduce((acc, f) => {
    const disc = Number(f?.discount_amount || 0) + Number(f?.scholarship_amount || 0);
    return { gross: acc.gross + Number(f?.base_amount || 0), disc: acc.disc + disc };
  }, { gross: 0, disc: 0 }), [values.fees]);

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2" aria-label="Admission steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => i < step && setStep(i)} disabled={i > step} className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm", i === step && "border-primary bg-primary text-primary-foreground", i < step && "border-primary/40 bg-primary/5 text-primary", i > step && "text-muted-foreground")} aria-current={i === step ? "step" : undefined}>
              <span className="grid size-5 place-items-center rounded-full bg-background/20 text-xs">{i < step ? <Check className="size-3.5" /> : i + 1}</span>{s}
            </button>
          </li>
        ))}
      </ol>

      {serverError && <FormAlert error={serverError} />}

      {step === 0 && (
        <Card>
          <CardHeader><CardTitle>Student information</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2"><Label htmlFor="full_name">Student full name <span className="text-destructive">*</span></Label><Input id="full_name" {...register("full_name")} aria-invalid={!!errors.full_name} /><Err msg={errors.full_name?.message} /></div>
            <div className="space-y-1.5"><Label htmlFor="date_of_birth">Date of birth</Label><Input id="date_of_birth" type="date" max={o.today} {...register("date_of_birth")} /><Err msg={errors.date_of_birth?.message} /></div>
            <div className="space-y-1.5"><Label htmlFor="gender">Gender</Label><select id="gender" className={selectClass} {...register("gender")}><option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
            <div className="space-y-1.5"><Label htmlFor="phone">Student mobile (optional)</Label><Input id="phone" type="tel" {...register("phone")} /><Err msg={errors.phone?.message} /></div>
            <div className="space-y-1.5"><Label htmlFor="email">Student email (optional)</Label><Input id="email" type="email" {...register("email")} /><Err msg={errors.email?.message} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label htmlFor="address">Address (optional)</Label><Textarea id="address" rows={2} {...register("address")} placeholder="Residential address" /></div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div><CardTitle>Parents / guardians</CardTitle><CardDescription>Siblings are linked automatically when the mobile number matches an existing parent.</CardDescription></div>
            <Button type="button" variant="outline" onClick={() => guardians.append({ full_name: "", phone: "", alt_phone: "", email: "", relationship: "mother", is_primary: false, is_emergency_contact: false })}><Plus /> Add</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {(errors.guardians?.root?.message || errors.guardians?.message) && <Err msg={errors.guardians?.root?.message ?? errors.guardians?.message} />}
            {guardians.fields.map((f, i) => (
              <div key={f.id} className="grid gap-4 rounded-lg border p-4 md:grid-cols-3">
                <div className="space-y-1.5"><Label htmlFor={`g${i}n`}>Name <span className="text-destructive">*</span></Label><Input id={`g${i}n`} {...register(`guardians.${i}.full_name`)} /><Err msg={errors.guardians?.[i]?.full_name?.message} /></div>
                <div className="space-y-1.5"><Label htmlFor={`g${i}r`}>Relationship</Label><select id={`g${i}r`} className={selectClass} {...register(`guardians.${i}.relationship`)}>{["father", "mother", "guardian", "grandparent", "sibling", "other"].map((r) => <option key={r} value={r}>{titleCase(r)}</option>)}</select></div>
                <div className="space-y-1.5"><Label htmlFor={`g${i}p`}>Mobile <span className="text-destructive">*</span></Label><Input id={`g${i}p`} type="tel" {...register(`guardians.${i}.phone`)} /><Err msg={errors.guardians?.[i]?.phone?.message} /></div>
                <div className="space-y-1.5"><Label htmlFor={`g${i}a`}>Alternative mobile</Label><Input id={`g${i}a`} type="tel" {...register(`guardians.${i}.alt_phone`)} /><Err msg={errors.guardians?.[i]?.alt_phone?.message} /></div>
                <div className="space-y-1.5"><Label htmlFor={`g${i}e`}>Email</Label><Input id={`g${i}e`} type="email" {...register(`guardians.${i}.email`)} /><Err msg={errors.guardians?.[i]?.email?.message} /></div>
                <div className="flex flex-wrap items-end gap-4 text-sm">
                  <label className="flex items-center gap-2"><input type="radio" name="primary" checked={!!values.guardians?.[i]?.is_primary} onChange={() => guardians.fields.forEach((_, j) => setValue(`guardians.${j}.is_primary`, j === i))} className="accent-primary" /> Primary contact</label>
                  <label className="flex items-center gap-2"><input type="checkbox" {...register(`guardians.${i}.is_emergency_contact`)} className="accent-primary" /> Emergency</label>
                  {guardians.fields.length > 1 && <Button type="button" variant="ghost" size="icon-sm" onClick={() => guardians.remove(i)} aria-label="Remove parent"><Trash2 /></Button>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>Academic information</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="class_id">Class <span className="text-destructive">*</span></Label><select id="class_id" className={selectClass} {...register("class_id", { onChange: () => { setValue("batch_ids", []); setValue("subject_ids", []); } })}><option value="">Select class</option>{o.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><Err msg={errors.class_id?.message} /></div>
            <div className="space-y-1.5"><Label htmlFor="academic_year_id">Academic year</Label><select id="academic_year_id" className={selectClass} {...register("academic_year_id")}><option value="">—</option>{o.years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select></div>
            <div className="space-y-1.5"><Label htmlFor="admission_date">Admission date <span className="text-destructive">*</span></Label><Input id="admission_date" type="date" max={o.today} {...register("admission_date")} /><Err msg={errors.admission_date?.message} /></div>
            <div className="space-y-1.5"><Label htmlFor="admission_no">Admission number</Label><Input id="admission_no" placeholder="Auto-generated" {...register("admission_no")} /><p className="text-xs text-muted-foreground">Leave blank to generate automatically.</p></div>
            <div className="space-y-1.5 md:col-span-2"><Label htmlFor="school_name">School name</Label><Input id="school_name" {...register("school_name")} /></div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Batches</Label>
              {!classId ? <p className="text-sm text-muted-foreground">Select a class first.</p> : classBatches.length === 0 ? <p className="text-sm text-muted-foreground">No active batches for this class.</p> : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {classBatches.map((b) => {
                    const full = b.capacity !== null && b.enrolled >= b.capacity;
                    return (
                      <label key={b.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm has-checked:border-primary has-checked:bg-primary/5">
                        <input type="checkbox" value={b.id} {...register("batch_ids")} className="accent-primary" />
                        <span className="flex-1"><span className="font-medium">{b.name}</span><span className={cn("block text-xs", full ? "text-destructive" : "text-muted-foreground")}>{b.enrolled}{b.capacity ? ` / ${b.capacity}` : ""} students{full ? " · Full" : ""}</span></span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            {fullBatches.length > 0 && <div className="space-y-1.5 md:col-span-2"><Label htmlFor="capacity_override_reason">Capacity override reason <span className="text-destructive">*</span></Label><Textarea id="capacity_override_reason" rows={2} {...register("capacity_override_reason")} /></div>}
            <div className="space-y-1.5 md:col-span-2">
              <Label>Subjects</Label>
              {classSubjects.length === 0 ? <p className="text-sm text-muted-foreground">{classId ? "No subjects configured for this class." : "Select a class first."}</p> : (
                <div className="flex flex-wrap gap-2">{classSubjects.map((s) => <label key={s.id} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm has-checked:border-primary has-checked:bg-primary/5"><input type="checkbox" value={s.id} {...register("subject_ids")} className="accent-primary" /> {s.name}</label>)}</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><CardTitle>Fees</CardTitle><CardDescription>Fee installments are generated automatically. Discounts need a reason and are recorded with your name.</CardDescription></div>
            <div className="flex flex-wrap gap-2">
              {o.structures.filter((s) => !s.class_id || s.class_id === classId).length > 0 && (
                <select className={cn(selectClass, "w-auto")} value="" onChange={(e) => addStructure(e.target.value)} aria-label="Add fee structure">
                  <option value="">+ Add fee structure</option>
                  {o.structures.filter((s) => !s.class_id || s.class_id === classId).map((s) => <option key={s.id} value={s.id}>{s.name} · {formatINR(s.total_amount)}</option>)}
                </select>
              )}
              <Button type="button" variant="outline" onClick={addCustomFee}><Plus /> Custom fee</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fees.fields.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No fees added. You can continue without fees and assign them later from the student profile.</p>}
            {fees.fields.map((f, i) => {
              const v = values.fees?.[i];
              const disc = o.discounts.find((d) => d.id === v?.discount_id);
              const base = Number(v?.base_amount || 0);
              const discAmt = disc ? (disc.discount_type === "percent" ? Math.round(base * disc.value) / 100 : disc.value) : Number(v?.discount_amount || 0);
              const totalDisc = discAmt + Number(v?.scholarship_amount || 0);
              const preview = previewInstallments({ base, discount: totalDisc, installments: Number(v?.installments || 1), feeType: (v?.fee_type ?? "custom") as FeeType, startDate: v?.start_date ?? "", dueDay: Number(v?.due_day || 1) });
              const fe = errors.fees?.[i];
              return (
                <div key={f.id} className="space-y-4 rounded-lg border p-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-1.5 md:col-span-2"><Label htmlFor={`f${i}d`}>Description</Label><Input id={`f${i}d`} {...register(`fees.${i}.description`)} /><Err msg={fe?.description?.message} /></div>
                    <div className="space-y-1.5"><Label htmlFor={`f${i}c`}>Category</Label><select id={`f${i}c`} className={selectClass} {...register(`fees.${i}.category`)}>{["tuition", "admission", "registration", "study_material", "other"].map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}</select></div>
                    <div className="space-y-1.5"><Label htmlFor={`f${i}t`}>Frequency</Label><select id={`f${i}t`} className={selectClass} {...register(`fees.${i}.fee_type`, { onChange: (e) => { const t = e.target.value as FeeType; setValue(`fees.${i}.installments`, ({ monthly: 12, quarterly: 4, half_yearly: 2, yearly: 1, course: 1, custom: 3 } as const)[t]); } })}>{Object.entries(FEE_TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
                    <div className="space-y-1.5"><Label htmlFor={`f${i}a`}>Total amount (₹)</Label><Input id={`f${i}a`} type="number" min={0} step="0.01" {...register(`fees.${i}.base_amount`)} /><Err msg={fe?.base_amount?.message} /></div>
                    <div className="space-y-1.5"><Label htmlFor={`f${i}n`}>Installments</Label><Input id={`f${i}n`} type="number" min={1} max={60} {...register(`fees.${i}.installments`)} /></div>
                    <div className="space-y-1.5"><Label htmlFor={`f${i}s`}>First period starts</Label><Input id={`f${i}s`} type="date" {...register(`fees.${i}.start_date`)} /></div>
                    <div className="space-y-1.5"><Label htmlFor={`f${i}u`}>Due day of month</Label><Input id={`f${i}u`} type="number" min={1} max={28} {...register(`fees.${i}.due_day`)} /></div>
                    <div className="space-y-1.5"><Label htmlFor={`f${i}dc`}>Discount</Label><select id={`f${i}dc`} className={selectClass} {...register(`fees.${i}.discount_id`)}><option value="">Manual amount</option>{o.discounts.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.discount_type === "percent" ? `${d.value}%` : formatINR(d.value)})</option>)}</select></div>
                    {!v?.discount_id && <div className="space-y-1.5"><Label htmlFor={`f${i}da`}>Discount (₹)</Label><Input id={`f${i}da`} type="number" min={0} step="0.01" {...register(`fees.${i}.discount_amount`)} /><Err msg={fe?.discount_amount?.message} /></div>}
                    <div className="space-y-1.5"><Label htmlFor={`f${i}sc`}>Scholarship (₹)</Label><Input id={`f${i}sc`} type="number" min={0} step="0.01" {...register(`fees.${i}.scholarship_amount`)} /></div>
                    {(totalDisc > 0 || v?.discount_id) && <div className="space-y-1.5 md:col-span-2"><Label htmlFor={`f${i}r`}>Discount reason {!v?.discount_id && <span className="text-destructive">*</span>}</Label><Input id={`f${i}r`} {...register(`fees.${i}.discount_reason`)} placeholder="e.g. Sibling discount approved by owner" /><Err msg={fe?.discount_reason?.message} /></div>}
                  </div>
                  {preview.length > 0 && (
                    <details className="rounded-md bg-muted/50 p-3 text-sm">
                      <summary className="cursor-pointer font-medium">{preview.length} installment(s) · Net {formatINR(base - totalDisc)} {totalDisc > 0 && <span className="text-muted-foreground">(original {formatINR(base)}, discount {formatINR(totalDisc)})</span>}</summary>
                      <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">{preview.map((p) => <li key={p.no} className="flex justify-between gap-3 rounded bg-background px-2 py-1"><span>#{p.no} · due {formatDate(p.due)}</span><span className="tabular-nums">{formatINR(p.net)}</span></li>)}</ul>
                    </details>
                  )}
                  <div className="flex justify-end"><Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => fees.remove(i)}><Trash2 /> Remove fee</Button></div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Review</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <dl className="grid grid-cols-2 gap-3">
                <div><dt className="text-muted-foreground">Student</dt><dd className="font-medium">{values.full_name}</dd></div>
                <div><dt className="text-muted-foreground">Date of birth</dt><dd>{formatDate(values.date_of_birth)}</dd></div>
                <div><dt className="text-muted-foreground">Class</dt><dd>{o.classes.find((c) => c.id === values.class_id)?.name}</dd></div>
                <div><dt className="text-muted-foreground">Admission date</dt><dd>{formatDate(values.admission_date)}</dd></div>
                <div className="col-span-2"><dt className="text-muted-foreground">Batches</dt><dd>{o.batches.filter((b) => batchIds.includes(b.id)).map((b) => b.name).join(", ") || "None"}</dd></div>
                <div className="col-span-2"><dt className="text-muted-foreground">Parents</dt><dd>{values.guardians?.map((g) => `${g?.full_name} (${titleCase(g?.relationship)}, ${g?.phone})${g?.is_primary ? " – primary" : ""}`).join("; ")}</dd></div>
                <div className="col-span-2"><dt className="text-muted-foreground">Fees</dt><dd>{values.fees?.length ? `${values.fees.length} fee(s): total ${formatINR(feeTotals.gross)}${feeTotals.disc ? `, discount ${formatINR(feeTotals.disc)}, net ${formatINR(feeTotals.gross - feeTotals.disc)}` : ""}` : "No fees"}</dd></div>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Account invitations</CardTitle><CardDescription>Invitations are emailed with a link to set a password.</CardDescription></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <label className="flex items-start gap-3 rounded-lg border p-3"><input type="checkbox" {...register("create_parent_login")} className="mt-0.5 accent-primary" /><span><span className="font-medium">Invite primary parent</span><span className="block text-muted-foreground">{values.guardians?.find((g) => g?.is_primary)?.email || "Primary parent has no email; no invitation will be sent."}</span></span></label>
              <label className="flex items-start gap-3 rounded-lg border p-3"><input type="checkbox" {...register("create_student_login")} className="mt-0.5 accent-primary" /><span><span className="font-medium">Invite student</span><span className="block text-muted-foreground">{values.email || "Student has no email."}</span></span></label>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-between gap-2">
        <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}><ChevronLeft /> Back</Button>
        {step < STEPS.length - 1
          ? <Button type="button" onClick={next}>Next <ChevronRight /></Button>
          : <Button type="button" onClick={submit} disabled={pending}>{pending && <Loader2 className="animate-spin" />} Confirm admission</Button>}
      </div>
    </div>
  );
}
