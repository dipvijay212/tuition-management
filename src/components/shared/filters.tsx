"use client";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function useParamSetter() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const set = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(updates)) if (v) next.set(k, v); else next.delete(k);
    next.delete("page");
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`));
  };
  return { set, sp, pending };
}

export function SearchInput({ placeholder = "Search…", param = "q", className }: { placeholder?: string; param?: string; className?: string }) {
  const { set, sp, pending } = useParamSetter();
  const [value, setValue] = useState(sp.get(param) ?? "");
  const current = sp.get(param) ?? "";
  useEffect(() => {
    // Only navigate when the typed text differs from the URL (idempotent; safe under StrictMode).
    if (value.trim() === current) return;
    const t = setTimeout(() => set({ [param]: value.trim() || null }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className={cn("relative w-full sm:w-72", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="h-10 pr-9 pl-9" aria-label={placeholder} />
      {pending ? <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" /> :
        value && <button type="button" onClick={() => setValue("")} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search"><X className="size-4" /></button>}
    </div>
  );
}

export function SelectFilter({ param, options, allLabel = "All", label }: { param: string; options: { value: string; label: string }[]; allLabel?: string; label: string }) {
  const { set, sp } = useParamSetter();
  return (
    <select aria-label={label} value={sp.get(param) ?? ""} onChange={(e) => set({ [param]: e.target.value || null })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <option value="">{label}: {allLabel}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function DateFilter({ param, label }: { param: string; label: string }) {
  const { set, sp } = useParamSetter();
  return (
    <label className="flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input type="date" value={sp.get(param) ?? ""} onChange={(e) => set({ [param]: e.target.value || null })} className="bg-transparent outline-none" />
    </label>
  );
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="no-print mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;
}
