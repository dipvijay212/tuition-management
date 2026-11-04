"use client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, Field, NativeSelect } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { saveGuardian, updateStudent } from "./actions";
import type { Tables } from "@/types/database";

type G = { id: string; full_name: string; phone: string; alt_phone: string | null; email: string | null };

export function StudentEditForm({ s, classes, subjects, guardians }: { s: Tables<"students">; classes: { id: string; name: string }[]; subjects: { id: string; name: string; class_id: string | null }[]; guardians: G[] }) {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <ActionForm action={updateStudent} onSuccess={() => router.push(`/admin/students/${s.id}`)}>
        {({ errors }) => (
          <Card>
            <CardHeader><CardTitle>Student details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="id" value={s.id} />
              <Field label="Full name" name="full_name" required error={errors.full_name} className="md:col-span-2"><Input id="full_name" name="full_name" defaultValue={s.full_name} /></Field>
              <Field label="Date of birth" name="date_of_birth"><Input id="date_of_birth" name="date_of_birth" type="date" defaultValue={s.date_of_birth ?? ""} /></Field>
              <Field label="Gender" name="gender"><NativeSelect id="gender" name="gender" defaultValue={s.gender ?? ""}><option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></NativeSelect></Field>
              <Field label="Blood group" name="blood_group"><Input id="blood_group" name="blood_group" defaultValue={s.blood_group ?? ""} /></Field>
              <Field label="Mobile" name="phone" error={errors.phone}><Input id="phone" name="phone" defaultValue={s.phone ?? ""} /></Field>
              <Field label="Email" name="email" error={errors.email}><Input id="email" name="email" type="email" defaultValue={s.email ?? ""} /></Field>
              <Field label="School" name="school_name"><Input id="school_name" name="school_name" defaultValue={s.school_name ?? ""} /></Field>
              <Field label="Class" name="class_id"><NativeSelect id="class_id" name="class_id" defaultValue={s.class_id ?? ""}><option value="">—</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect></Field>
              <Field label="Address" name="address" className="md:col-span-2"><Textarea id="address" name="address" rows={2} defaultValue={s.address ?? ""} /></Field>
              <Field label="City" name="city"><Input id="city" name="city" defaultValue={s.city ?? ""} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="State" name="state"><Input id="state" name="state" defaultValue={s.state ?? ""} /></Field>
                <Field label="PIN code" name="pin_code" error={errors.pin_code}><Input id="pin_code" name="pin_code" defaultValue={s.pin_code ?? ""} /></Field>
              </div>
              <Field label="Subjects" name="subject_ids" className="md:col-span-2">
                <div className="flex flex-wrap gap-2">{subjects.filter((x) => !x.class_id || x.class_id === s.class_id).map((x) => <label key={x.id} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm has-checked:border-primary has-checked:bg-primary/5"><input type="checkbox" name="subject_ids" value={x.id} defaultChecked={s.subject_ids.includes(x.id)} className="accent-primary" /> {x.name}</label>)}</div>
              </Field>
              <Field label="Previous academics" name="previous_academics" className="md:col-span-2"><Textarea id="previous_academics" name="previous_academics" rows={2} defaultValue={s.previous_academics ?? ""} /></Field>
              <div><SubmitButton>Save student</SubmitButton></div>
            </CardContent>
          </Card>
        )}
      </ActionForm>
      {guardians.map((g) => (
        <ActionForm key={g.id} action={saveGuardian}>
          {({ errors }) => (
            <Card>
              <CardHeader><CardTitle className="text-base">Parent: {g.full_name} <span className="font-normal text-muted-foreground">({g.phone})</span></CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <input type="hidden" name="id" value={g.id} />
                <Field label="Name" name="full_name" error={errors.full_name}><Input id={`gn-${g.id}`} name="full_name" defaultValue={g.full_name} /></Field>
                <Field label="Alternative mobile" name="alt_phone" error={errors.alt_phone}><Input id={`ga-${g.id}`} name="alt_phone" defaultValue={g.alt_phone ?? ""} /></Field>
                <Field label="Email" name="email" error={errors.email}><Input id={`ge-${g.id}`} name="email" type="email" defaultValue={g.email ?? ""} /></Field>
                <p className="text-xs text-muted-foreground md:col-span-3">The primary mobile number identifies the parent (and links siblings), so it can&apos;t be changed here.</p>
                <div><SubmitButton variant="outline">Save parent</SubmitButton></div>
              </CardContent>
            </Card>
          )}
        </ActionForm>
      ))}
    </div>
  );
}
