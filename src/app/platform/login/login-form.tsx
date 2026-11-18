"use client";
import { useActionState } from "react";
import { platformLoginAction, type AuthState } from "@/features/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormAlert } from "@/components/shared/form-alert";

export function PlatformLoginForm() {
  const [state, action] = useActionState<AuthState, FormData>(platformLoginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormAlert error={state?.error} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-11" />
      </div>
      <SubmitButton className="h-11 w-full" pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
