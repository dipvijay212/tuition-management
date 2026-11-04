"use client";
import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { forgotPasswordAction, type AuthState } from "@/features/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormAlert } from "@/components/shared/form-alert";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState<AuthState, FormData>(forgotPasswordAction, undefined);
  return (
    <div className="space-y-8">
      <Link href="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to sign in</Link>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Reset your password</h2>
        <p className="text-sm text-muted-foreground">We&apos;ll email you a secure link to set a new password.</p>
      </div>
      <form action={action} className="space-y-4">
        <FormAlert error={state?.error} message={state?.message} />
        <div className="space-y-2">
          <Label htmlFor="identifier">Email or mobile number</Label>
          <Input id="identifier" name="identifier" required className="h-11" />
        </div>
        <SubmitButton className="h-11 w-full" pendingText="Sending…">Send reset link</SubmitButton>
      </form>
    </div>
  );
}
