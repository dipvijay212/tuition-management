"use client";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/utilities/errors";
import { FormAlert } from "./form-alert";

export type FormAction = (prev: ActionResult<unknown> | undefined, form: FormData) => Promise<ActionResult<unknown>>;

/** Form bound to a server action; shows toast on success and field-level errors. */
export function ActionForm({ action, children, className, onSuccess, resetOnSuccess }: { action: FormAction; children: (s: { errors: Record<string, string[]> }) => React.ReactNode; className?: string; onSuccess?: (data: unknown) => void; resetOnSuccess?: boolean }) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Saved");
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state.data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form ref={ref} action={formAction} className={cn("space-y-4", className)} noValidate>
      {state && !state.ok && <FormAlert error={state.error} />}
      {children({ errors })}
    </form>
  );
}

export function Field({ label, name, error, hint, required, children, className }: { label: string; name: string; error?: string[]; hint?: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={name}>{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
      {error?.[0] ? <p className="text-xs text-destructive" id={`${name}-error`}>{error[0]}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export const selectClass = "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive";

export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return <select {...props} className={cn(selectClass, className)} />;
}
