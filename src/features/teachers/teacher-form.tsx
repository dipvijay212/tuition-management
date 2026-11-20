"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, Field, NativeSelect } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { saveTeacher } from "./actions";
import type { Tables } from "@/types/database";

export function TeacherForm({ teacher, subjects }: { teacher?: Tables<"teachers">; subjects: { id: string; name: string; code: string | null }[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"none" | "invite" | "password">("none");
  return (
    <ActionForm action={saveTeacher} onSuccess={(d) => router.push(`/admin/teachers/${(d as { id: string }).id}`)} className="space-y-6">
      {({ errors }) => (
        <>
          {teacher && <input type="hidden" name="id" value={teacher.id} />}
          <Card>
            <CardHeader><CardTitle>Personal details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Full name" name="full_name" required error={errors.full_name}><Input id="full_name" name="full_name" defaultValue={teacher?.full_name} /></Field>
              <Field label="Mobile number" name="phone" required error={errors.phone}><Input id="phone" name="phone" type="tel" defaultValue={teacher?.phone} /></Field>
              <Field label="Email" name="email" error={errors.email} hint="Required if the teacher will log in."><Input id="email" name="email" type="email" defaultValue={teacher?.email ?? ""} /></Field>
              <Field label="Photograph" name="photo" hint="PNG/JPG/WebP, max 2 MB"><Input id="photo" name="photo" type="file" accept="image/png,image/jpeg,image/webp" /></Field>
              <Field label="Address" name="address" className="md:col-span-2"><Textarea id="address" name="address" rows={2} defaultValue={teacher?.address ?? ""} /></Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Professional details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Qualification" name="qualification"><Input id="qualification" name="qualification" defaultValue={teacher?.qualification ?? ""} placeholder="M.Sc, B.Ed" /></Field>
              <Field label="Specialization" name="specialization"><Input id="specialization" name="specialization" defaultValue={teacher?.specialization ?? ""} placeholder="Mathematics" /></Field>
              <Field label="Joining date" name="joining_date" error={errors.joining_date}><DateInput id="joining_date" name="joining_date" defaultValue={teacher?.joining_date ?? ""} /></Field>
              <Field label="Employment status" name="employment_status">
                <NativeSelect id="employment_status" name="employment_status" defaultValue={teacher?.employment_status ?? "active"}>
                  <option value="active">Active</option><option value="on_leave">On leave</option><option value="resigned">Resigned</option><option value="terminated">Terminated</option>
                </NativeSelect>
              </Field>
              <Field label="Monthly salary (₹)" name="monthly_salary" error={errors.monthly_salary} hint="Optional. Used for salary records."><Input id="monthly_salary" name="monthly_salary" type="number" min={0} step="0.01" defaultValue={teacher?.monthly_salary ?? ""} /></Field>
              <Field label="Subjects taught" name="subject_ids" className="md:col-span-2">
                {subjects.length === 0 ? <p className="text-sm text-muted-foreground">No subjects yet. Add them under Subjects.</p> : (
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((s) => (
                      <label key={s.id} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm has-checked:border-primary has-checked:bg-primary/5">
                        <input type="checkbox" name="subject_ids" value={s.id} defaultChecked={teacher?.subject_ids.includes(s.id)} className="accent-primary" /> {s.name}{s.code && <span className="text-xs text-muted-foreground">({s.code})</span>}
                      </label>
                    ))}
                  </div>
                )}
              </Field>
            </CardContent>
          </Card>
          {!teacher?.profile_id && (
            <Card>
              <CardHeader><CardTitle>Login account</CardTitle><CardDescription>Teachers only see their assigned batches and students.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  {([["none", "No login for now"], ["invite", "Email an invitation"], ["password", "Set a password now"]] as const).map(([v, l]) => (
                    <label key={v} className="flex items-center gap-2 rounded-lg border p-3 text-sm has-checked:border-primary has-checked:bg-primary/5">
                      <input type="radio" name="account_mode" value={v} checked={mode === v} onChange={() => setMode(v)} className="accent-primary" /> {l}
                    </label>
                  ))}
                </div>
                {mode === "password" && <Field label="Temporary password" name="password" error={errors.password} hint="Share it securely; the teacher can change it later."><Input id="password" name="password" type="text" autoComplete="new-password" /></Field>}
              </CardContent>
            </Card>
          )}
          <SubmitButton pendingText="Saving…">{teacher ? "Save changes" : "Add teacher"}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
