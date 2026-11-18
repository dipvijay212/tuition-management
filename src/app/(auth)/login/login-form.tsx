"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { loginAction, type AuthState } from "@/features/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormAlert } from "@/components/shared/form-alert";

export function LoginForm({ next, initialError, defaultCode }: { next?: string; initialError?: string; defaultCode?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(loginAction, initialError ? { error: initialError } : undefined);
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <FormAlert error={state?.error} />
      <div className="space-y-2">
        <Label htmlFor="institute_code">Institute code</Label>
        <Input
          id="institute_code"
          name="institute_code"
          required
          defaultValue={defaultCode}
          autoComplete="organization"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={14}
          placeholder="e.g. SVCC2026"
          className="h-11 font-mono tracking-wider uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case"
        />
        <p className="text-xs text-muted-foreground">Given by your institute. It is saved on this device after you sign in.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="identifier">Mobile number or email</Label>
        <Input id="identifier" name="identifier" autoComplete="username" required placeholder="98765 43210 or you@example.com" className="h-11" autoFocus={!!defaultCode} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
        </div>
        <div className="relative">
          <Input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required className="h-11 pr-10" />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground" aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="remember" defaultChecked /> Remember me on this device
      </label>
      <SubmitButton className="h-11 w-full" pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
