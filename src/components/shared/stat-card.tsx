import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-info/12 text-info",
} as const;

export function StatCard({ label, value, hint, icon: Icon, tone = "primary", href }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon: LucideIcon; tone?: keyof typeof TONES; href?: string }) {
  const body = (
    <div className={cn("flex h-full items-start gap-3 rounded-xl border bg-card p-4 sm:gap-4 transition-shadow sm:p-5", href && "hover:shadow-md")}>
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", TONES[tone])}><Icon className="size-5" /></span>
      <div className="min-w-0">
        <p className="text-sm leading-snug text-muted-foreground [overflow-wrap:anywhere]">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{body}</Link> : body;
}
