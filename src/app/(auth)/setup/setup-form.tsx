"use client";
import { useActionState, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { checkInstituteCode, setupAction, type AuthState } from "@/features/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormAlert } from "@/components/shared/form-alert";

type CodeCheck = { state: "idle" | "checking" | "ok" | "taken" | "invalid"; message?: string };

/**
 * Live "is this code free?" check, debounced so typing doesn't spam the API.
 * Results are keyed by the code they belong to, so a stale answer is never shown.
 */
function useCodeCheck() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ code: string } & CodeCheck>({ code: "", state: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const update = (raw: string) => {
    const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    setCode(c);
    if (timer.current) clearTimeout(timer.current);
    if (!c) return;
    timer.current = setTimeout(async () => {
      const r = await checkInstituteCode(c);
      setResult({ code: c, ...(r.available ? { state: "ok" } : r.reason ? { state: "invalid", message: r.reason } : { state: "taken" }) });
    }, 400);
  };
  const check: CodeCheck = !code ? { state: "idle" } : result.code === code ? result : { state: "checking" };
  return { code, update, check };
}

export function SetupForm() {
  const [state, action] = useActionState<AuthState, FormData>(setupAction, undefined);
  const { code, update, check } = useCodeCheck();
  return (
    <form action={action} className="space-y-4">
      <FormAlert error={state?.error} />
      <div className="space-y-2">
        <Label htmlFor="institute_name">Institute name</Label>
        <Input id="institute_name" name="institute_name" autoComplete="organization" required className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="institute_code">Institute code <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Input
          id="institute_code"
          name="institute_code"
          value={code}
          onChange={(e) => update(e.target.value)}
          spellCheck={false}
          placeholder="e.g. SHREE01"
          className="h-11 font-mono tracking-wider placeholder:font-sans placeholder:tracking-normal"
          aria-describedby="code-hint"
        />
        <p id="code-hint" className="flex items-center gap-1 text-xs text-muted-foreground">
          {check.state === "ok" && <><CheckCircle2 className="size-3.5 text-success" /> Available</>}
          {check.state === "taken" && <><XCircle className="size-3.5 text-destructive" /> Already taken. Try another.</>}
          {check.state === "invalid" && <><XCircle className="size-3.5 text-destructive" /> {check.message}</>}
          {(check.state === "idle" || check.state === "checking") && "4–12 letters or numbers. Your staff, students and parents type it to sign in. Leave empty to get one automatically."}
        </p>
      </div>
      {[
        { name: "full_name", label: "Your full name", auto: "name" },
        { name: "email", label: "Email", type: "email", auto: "email" },
        { name: "phone", label: "Mobile number", type: "tel", auto: "tel" },
      ].map((f) => (
        <div key={f.name} className="space-y-2">
          <Label htmlFor={f.name}>{f.label}</Label>
          <Input id={f.name} name={f.name} type={f.type ?? "text"} autoComplete={f.auto} required className="h-11" />
        </div>
      ))}
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required className="h-11" />
        <p className="text-xs text-muted-foreground">Already use this app at another institute? Use the same email and that account&apos;s password.</p>
      </div>
      <SubmitButton className="h-11 w-full" pendingText="Creating…" disabled={check.state === "taken" || check.state === "invalid"}>
        Start free trial
      </SubmitButton>
    </form>
  );
}
