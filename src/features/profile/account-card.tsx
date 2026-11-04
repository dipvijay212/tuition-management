"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ActionForm, Field } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { changePassword, updateOwnName } from "./actions";

export function AccountCard({ name, email, phone }: { name: string; email: string | null; phone: string | null }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Account</CardTitle><CardDescription>Mobile number and email are managed by the institute.</CardDescription></CardHeader>
        <CardContent>
          <ActionForm action={updateOwnName}>
            {({ errors }) => (
              <>
                <Field label="Display name" name="full_name" error={errors.full_name}><Input id="full_name" name="full_name" defaultValue={name} /></Field>
                <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">Email</dt><dd>{email ?? "—"}</dd></div><div><dt className="text-xs text-muted-foreground">Mobile</dt><dd>{phone ?? "—"}</dd></div></dl>
                <SubmitButton variant="outline">Save</SubmitButton>
              </>
            )}
          </ActionForm>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Change password</CardTitle></CardHeader>
        <CardContent>
          <ActionForm action={changePassword} resetOnSuccess>
            {({ errors }) => (
              <>
                <Field label="Current password" name="current" error={errors.current}><Input id="current" name="current" type="password" autoComplete="current-password" /></Field>
                <Field label="New password" name="password" error={errors.password} hint="At least 8 characters with a letter and a number."><Input id="password" name="password" type="password" autoComplete="new-password" /></Field>
                <Field label="Confirm new password" name="confirm" error={errors.confirm}><Input id="confirm" name="confirm" type="password" autoComplete="new-password" /></Field>
                <SubmitButton>Change password</SubmitButton>
              </>
            )}
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
