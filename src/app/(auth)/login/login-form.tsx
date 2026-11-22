"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Building2, ChevronRight, ArrowLeft } from "lucide-react";
import { loginAction, type AuthState } from "@/features/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormAlert } from "@/components/shared/form-alert";

export function LoginForm({
  next,
  initialError,
  defaultCode,
}: {
  next?: string;
  initialError?: string;
  defaultCode?: string;
}) {
  const [state, action] = useActionState<AuthState, FormData>(
    loginAction,
    initialError ? { error: initialError } : undefined
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [instituteCode, setInstituteCode] = useState(defaultCode ?? "");

  // If the user belongs to multiple institutes, show the institute selection screen (Slack/Notion style)
  if (state?.requiresInstituteSelection && state.institutes && state.institutes.length > 0) {
    return (
      <div className="space-y-5">
        <FormAlert error={state.error} />
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">Select your institute</h3>
          <p className="text-sm text-muted-foreground">
            Your account is associated with multiple institutes. Choose where you want to sign in:
          </p>
        </div>

        <form action={action} className="space-y-2">
          <input type="hidden" name="next" value={next ?? ""} />
          <input type="hidden" name="identifier" value={state.savedIdentifier ?? ""} />
          <input type="hidden" name="password" value={state.savedPassword ?? ""} />
          {state.savedRemember && <input type="hidden" name="remember" value="on" />}

          <div className="space-y-2 pt-1">
            {state.institutes.map((inst) => (
              <button
                key={inst.id}
                type="submit"
                name="institute_code"
                value={inst.code}
                className="group flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Building2 className="size-5" />
                  </span>
                  <div>
                    <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {inst.name}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">Code: {inst.code}</div>
                  </div>
                </div>
                <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 flex w-full items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground pt-2"
          >
            <ArrowLeft className="size-3.5" /> Sign in with a different account
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <FormAlert error={state?.error} />

      {/* When arrived via an institute-specific URL (?code=XYZ) */}
      {defaultCode && !showCodeInput && (
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          <span>
            Institute: <strong className="font-mono font-semibold text-foreground">{defaultCode}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              setInstituteCode("");
              setShowCodeInput(true);
            }}
            className="font-medium text-primary hover:underline"
          >
            Change
          </button>
          <input type="hidden" name="institute_code" value={instituteCode} />
        </div>
      )}

      {/* Optional manual institute code input */}
      {showCodeInput && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="institute_code">Institute code (optional)</Label>
            {!defaultCode && (
              <button
                type="button"
                onClick={() => {
                  setShowCodeInput(false);
                  setInstituteCode("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Auto-detect instead
              </button>
            )}
          </div>
          <Input
            id="institute_code"
            name="institute_code"
            value={instituteCode}
            onChange={(e) => setInstituteCode(e.target.value.toUpperCase())}
            autoComplete="organization"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={14}
            placeholder="e.g. SVCC2026"
            className="h-11 font-mono tracking-wider uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case"
          />
          <p className="text-xs text-muted-foreground">
            Optional. Leave empty to auto-detect your institute from your email or phone number.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="identifier">Mobile number or email</Label>
        <Input
          id="identifier"
          name="identifier"
          autoComplete="username"
          required
          placeholder="you@example.com or 98765 43210"
          className="h-11"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="h-11 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {!showCodeInput && !defaultCode && (
        <div className="text-right">
          <button
            type="button"
            onClick={() => setShowCodeInput(true)}
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            Have an institute code?
          </button>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="remember" defaultChecked /> Remember me on this device
      </label>

      <SubmitButton className="h-11 w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
