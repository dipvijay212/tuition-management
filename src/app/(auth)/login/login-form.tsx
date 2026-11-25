"use client";
import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Building2, ChevronRight, ArrowLeft } from "lucide-react";
import type { InstituteOption } from "@/features/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
  const [error, setError] = useState<string | undefined>(initialError);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [instituteCode, setInstituteCode] = useState(defaultCode ?? "");
  const [multiInstitutes, setMultiInstitutes] = useState<InstituteOption[] | null>(null);
  const [savedCredentials, setSavedCredentials] = useState<{
    identifier: string;
    password: string;
    remember: boolean;
  } | null>(null);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const identifier = String(form.get("identifier") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const code = String(form.get("institute_code") ?? "").trim();
    const remember = form.get("remember") === "on";

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          institute_code: code || undefined,
          remember,
          next,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to sign in. Please check your credentials.");
        setPending(false);
        return;
      }

      if (data.requiresInstituteSelection) {
        setMultiInstitutes(data.institutes);
        setSavedCredentials({ identifier, password, remember });
        setPending(false);
        return;
      }

      // Success: redirect to user's portal
      window.location.href = data.redirect || "/";
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please check your network connection.");
      setPending(false);
    }
  }

  async function selectInstitute(code: string) {
    if (!savedCredentials) return;
    setError(undefined);
    setPending(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: savedCredentials.identifier,
          password: savedCredentials.password,
          institute_code: code,
          remember: savedCredentials.remember,
          next,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to sign in to selected institute.");
        setPending(false);
        return;
      }

      window.location.href = data.redirect || "/";
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
      setPending(false);
    }
  }

  // If the user belongs to multiple institutes, show the institute selection screen (Slack/Notion style)
  if (multiInstitutes && multiInstitutes.length > 0) {
    return (
      <div className="space-y-5">
        <FormAlert error={error} />
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">Select your institute</h3>
          <p className="text-sm text-muted-foreground">
            Your account is associated with multiple institutes. Choose where you want to sign in:
          </p>
        </div>

        <div className="space-y-2 pt-1">
          {multiInstitutes.map((inst) => (
            <button
              key={inst.id}
              type="button"
              disabled={pending}
              onClick={() => selectInstitute(inst.code)}
              className="group flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
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
          onClick={() => {
            setMultiInstitutes(null);
            setSavedCredentials(null);
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground pt-2"
        >
          <ArrowLeft className="size-3.5" /> Sign in with a different account
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <FormAlert error={error} />

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

      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
