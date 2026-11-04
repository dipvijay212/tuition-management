"use client";
import { useActionState } from "react";
import { resetPasswordAction, type AuthState } from "@/features/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormAlert } from "@/components/shared/form-alert";

export default function ResetPasswordPage() {
  const [state, action] = useActionState<AuthState, FormData>(resetPasswordAction, undefined);
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Set a new password</h2>
        <p className="text-sm text-muted-foreground">Use at least 8 characters with a letter and a number.</p>
      </div>
      <form action={action} className="space-y-4">
        <FormAlert error={state?.error} />
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="h-11" />
        </div>
        <SubmitButton className="h-11 w-full" pendingText="Saving…">Save password</SubmitButton>
      </form>
    </div>
  );
}
