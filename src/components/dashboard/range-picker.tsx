"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateInput } from "@/components/ui/date-input";

const PRESETS = [{ v: "3", l: "3M" }, { v: "6", l: "6M" }, { v: "12", l: "12M" }];

export function RangePicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const preset = sp.get("from") ? null : sp.get("range") ?? "6";
  const go = (p: Record<string, string | null>) => {
    const n = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (v) n.set(k, v);
    start(() => router.replace(`${pathname}${n.size ? `?${n}` : ""}`));
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      <div className="inline-flex rounded-lg border bg-card p-0.5" role="group" aria-label="Date range">
        {PRESETS.map((p) => <button key={p.v} onClick={() => go({ range: p.v })} className={cn("rounded-md px-3 py-1.5 text-sm", preset === p.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{p.l}</button>)}
      </div>
      <DateInput aria-label="From date" value={from} max={to} required onChange={(e) => e.target.value && go({ from: e.target.value, to })} className="h-9 w-40" />
      <span className="text-muted-foreground">–</span>
      <DateInput aria-label="To date" value={to} min={from} required onChange={(e) => e.target.value && go({ from, to: e.target.value })} className="h-9 w-40" />
    </div>
  );
}
