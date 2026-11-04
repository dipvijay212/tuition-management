"use client";
import { useState, useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { markAllRead, setPreference } from "./actions";
import { titleCase } from "@/lib/utilities/format";

export function MarkAllRead({ disabled }: { disabled: boolean }) {
  const [pending, start] = useTransition();
  return <Button variant="outline" disabled={disabled || pending} onClick={() => start(async () => { const r = await markAllRead(); if (r.ok) toast.success(r.message); else toast.error(r.error); })}><CheckCheck /> Mark all read</Button>;
}

export function Preferences({ types, initial }: { types: readonly string[]; initial: Record<string, boolean> }) {
  const [state, setState] = useState(initial);
  const [, start] = useTransition();
  return (
    <ul className="divide-y">
      {types.map((t) => (
        <li key={t} className="flex items-center justify-between gap-4 py-2.5 text-sm">
          <span>{titleCase(t)}</span>
          <Switch checked={state[t] ?? true} aria-label={`${titleCase(t)} notifications`} onCheckedChange={(v) => { setState((s) => ({ ...s, [t]: v })); start(async () => { const r = await setPreference(t, v); if (!r.ok) { toast.error(r.error); setState((s) => ({ ...s, [t]: !v })); } }); }} />
        </li>
      ))}
    </ul>
  );
}
