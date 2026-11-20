"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { ActionForm, Field, NativeSelect } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { DAYS } from "@/lib/utilities/format";
import { saveBatch } from "./actions";

type Opt = { id: string; name: string };
type Subject = Opt & { class_id: string | null };
export type BatchValue = {
  id: string; name: string; class_id: string; academic_year_id: string | null; start_date: string | null; end_date: string | null;
  class_days: number[]; start_time: string | null; end_time: string | null; capacity: number | null; room: string | null; status: string;
  teacher_ids: string[]; subject_ids: string[];
};

function Chips({ name, options, selected }: { name: string; options: Opt[]; selected: string[] }) {
  if (!options.length) return <p className="text-sm text-muted-foreground">None available.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o.id} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm has-checked:border-primary has-checked:bg-primary/5">
          <input type="checkbox" name={name} value={o.id} defaultChecked={selected.includes(o.id)} className="accent-primary" /> {o.name}
        </label>
      ))}
    </div>
  );
}

export function BatchForm({ batch, classes, years, teachers, subjects, defaultYear }: { batch?: BatchValue; classes: Opt[]; years: Opt[]; teachers: Opt[]; subjects: Subject[]; defaultYear?: string | null }) {
  const router = useRouter();
  const [classId, setClassId] = useState(batch?.class_id ?? "");
  const subjectOpts = subjects.filter((s) => !s.class_id || s.class_id === classId);
  return (
    <ActionForm action={saveBatch} onSuccess={(d) => router.push(`/admin/batches/${(d as { id: string }).id}`)} className="space-y-6">
      {({ errors }) => (
        <>
          {batch && <input type="hidden" name="id" value={batch.id} />}
          <Card>
            <CardHeader><CardTitle>Batch details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Batch name" name="name" required error={errors.name}><Input id="name" name="name" defaultValue={batch?.name} placeholder="Standard 10 – Morning" /></Field>
              <Field label="Class" name="class_id" required error={errors.class_id}>
                <NativeSelect id="class_id" name="class_id" value={classId} onChange={(e) => setClassId(e.target.value)}><option value="">Select class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect>
              </Field>
              <Field label="Academic year" name="academic_year_id">
                <NativeSelect id="academic_year_id" name="academic_year_id" defaultValue={batch?.academic_year_id ?? defaultYear ?? ""}><option value="">—</option>{years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</NativeSelect>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Capacity" name="capacity" error={errors.capacity}><Input id="capacity" name="capacity" type="number" min={1} defaultValue={batch?.capacity ?? ""} placeholder="30" /></Field>
                <Field label="Room" name="room"><Input id="room" name="room" defaultValue={batch?.room ?? ""} placeholder="R1" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start date" name="start_date" error={errors.start_date}><DateInput id="start_date" name="start_date" defaultValue={batch?.start_date ?? ""} /></Field>
                <Field label="End date" name="end_date" error={errors.end_date}><DateInput id="end_date" name="end_date" defaultValue={batch?.end_date ?? ""} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start time" name="start_time" error={errors.start_time}><Input id="start_time" name="start_time" type="time" defaultValue={batch?.start_time?.slice(0, 5) ?? ""} /></Field>
                <Field label="End time" name="end_time" error={errors.end_time}><Input id="end_time" name="end_time" type="time" defaultValue={batch?.end_time?.slice(0, 5) ?? ""} /></Field>
              </div>
              <Field label="Class days" name="class_days" error={errors.class_days} className="md:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <label key={d} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm has-checked:border-primary has-checked:bg-primary/5">
                      <input type="checkbox" name="class_days" value={d} defaultChecked={(batch?.class_days ?? [1, 2, 3, 4, 5]).includes(d)} className="accent-primary" /> {DAYS[d]}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Status" name="status"><NativeSelect id="status" name="status" defaultValue={batch?.status ?? "active"}><option value="active">Active</option><option value="inactive">Inactive</option></NativeSelect></Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Teachers & subjects</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Assigned teachers" name="teacher_ids"><Chips name="teacher_ids" options={teachers} selected={batch?.teacher_ids ?? []} /></Field>
              <Field label="Subjects" name="subject_ids" hint={classId ? undefined : "Select a class to see its subjects."}><Chips key={classId} name="subject_ids" options={subjectOpts} selected={batch?.subject_ids ?? []} /></Field>
            </CardContent>
          </Card>
          <SubmitButton pendingText="Saving…">{batch ? "Save changes" : "Create batch"}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
