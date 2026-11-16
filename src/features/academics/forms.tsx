"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, Field, NativeSelect } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { saveClass, saveSubject } from "./actions";

type Opt = { id: string; name: string };

export function ClassDialog({ trigger, years, value }: { trigger: React.ReactElement; years: Opt[]; value?: { id: string; name: string; description: string | null; academic_year_id: string | null; sort_order: number; status: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader><DialogTitle>{value ? "Edit class" : "New class"}</DialogTitle></DialogHeader>
        <ActionForm action={saveClass} onSuccess={() => setOpen(false)}>
          {({ errors }) => (
            <>
              {value && <input type="hidden" name="id" value={value.id} />}
              <Field label="Class name" name="name" required error={errors.name} hint="e.g. Standard 10, 9th Grade, 12th Science">
                <Input id="name" name="name" defaultValue={value?.name} placeholder="Standard 10" />
              </Field>
              <Field label="Academic year / Session" name="academic_year_id" hint="Select the institute academic year session (e.g. 2025–2026)">
                <NativeSelect id="academic_year_id" name="academic_year_id" defaultValue={value?.academic_year_id ?? years[0]?.id ?? ""}>
                  <option value="">All years / Ongoing</option>
                  {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Short description / Stream" name="description" hint="Optional notes, stream, or section (e.g. GSEB Board, CBSE)">
                <Textarea id="description" name="description" rows={2} defaultValue={value?.description ?? ""} placeholder="e.g. State Board Syllabus" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Display order" name="sort_order"><Input id="sort_order" name="sort_order" type="number" defaultValue={value?.sort_order ?? 0} /></Field>
                <Field label="Status" name="status"><NativeSelect id="status" name="status" defaultValue={value?.status ?? "active"}><option value="active">Active</option><option value="inactive">Inactive</option></NativeSelect></Field>
              </div>
              <SubmitButton className="w-full">Save class</SubmitButton>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

export function SubjectDialog({ trigger, classes, value }: { trigger: React.ReactElement; classes: Opt[]; value?: { id: string; name: string; code: string | null; class_id: string | null; description: string | null; status: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader><DialogTitle>{value ? "Edit subject" : "New subject"}</DialogTitle></DialogHeader>
        <ActionForm action={saveSubject} onSuccess={() => setOpen(false)}>
          {({ errors }) => (
            <>
              {value && <input type="hidden" name="id" value={value.id} />}
              <div className="grid grid-cols-[2fr_1fr] gap-3">
                <Field label="Subject name" name="name" required error={errors.name}><Input id="name" name="name" defaultValue={value?.name} placeholder="Mathematics" /></Field>
                <Field label="Code" name="code" error={errors.code}><Input id="code" name="code" defaultValue={value?.code ?? ""} placeholder="MATH10" /></Field>
              </div>
              <Field label="Class" name="class_id" hint="Leave as 'Any class' to reuse this subject across classes.">
                <NativeSelect id="class_id" name="class_id" defaultValue={value?.class_id ?? ""}><option value="">Any class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect>
              </Field>
              <Field label="Description" name="description"><Textarea id="description" name="description" rows={2} defaultValue={value?.description ?? ""} /></Field>
              <Field label="Status" name="status"><NativeSelect id="status" name="status" defaultValue={value?.status ?? "active"}><option value="active">Active</option><option value="inactive">Inactive</option></NativeSelect></Field>
              <SubmitButton className="w-full">Save subject</SubmitButton>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
