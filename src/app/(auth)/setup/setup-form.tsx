"use client";
import { useActionState } from "react";
import { setupAction, type AuthState } from "@/features/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormAlert } from "@/components/shared/form-alert";

export function SetupForm() {
  const [state, action] = useActionState<AuthState, FormData>(setupAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormAlert error={state?.error} />
      {[
        { name: "institute_name", label: "Institute name", auto: "organization" },
        { name: "full_name", label: "Your full name", auto: "name" },
        { name: "email", label: "Email", type: "email", auto: "email" },
        { name: "phone", label: "Mobile number", type: "tel", auto: "tel" },
        { name: "password", label: "Password", type: "password", auto: "new-password" },
      ].map((f) => (
        <div key={f.name} className="space-y-2">
          <Label htmlFor={f.name}>{f.label}</Label>
          <Input id={f.name} name={f.name} type={f.type ?? "text"} autoComplete={f.auto} required className="h-11" />
        </div>
      ))}
      <SubmitButton className="h-11 w-full" pendingText="Creating…">Create institute</SubmitButton>
    </form>
  );
}
