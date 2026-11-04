import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/utilities/format";

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "primary";
const TONE_CLASS: Record<Tone, string> = {
  success: "bg-success/12 text-success ring-success/25",
  warning: "bg-warning/15 text-[color-mix(in_oklch,var(--warning),black_25%)] ring-warning/30 dark:text-warning",
  danger: "bg-destructive/10 text-destructive ring-destructive/25",
  info: "bg-info/12 text-info ring-info/25",
  neutral: "bg-muted text-muted-foreground ring-border",
  primary: "bg-primary/10 text-primary ring-primary/25",
};

const STATUS_TONE: Record<string, Tone> = {
  active: "success", paid: "success", present: "success", completed: "success", published: "success", reviewed: "success", submitted: "info",
  inactive: "neutral", cancelled: "neutral", waived: "neutral", ended: "neutral", transferred: "info", draft: "neutral", resigned: "neutral",
  on_hold: "warning", partially_paid: "warning", late: "warning", pending: "warning", pending_activation: "warning", on_leave: "warning", scheduled: "info",
  marks_entry: "info", pending_approval: "warning", excused: "info", leave: "info", rescheduled: "warning",
  discontinued: "danger", suspended: "danger", unpaid: "danger", overdue: "danger", absent: "danger", reversed: "danger", terminated: "danger",
  resubmission_required: "warning",
};

export function StatusBadge({ status, label, tone, className }: { status: string; label?: string; tone?: Tone; className?: string }) {
  const t = tone ?? STATUS_TONE[status] ?? "neutral";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset", TONE_CLASS[t], className)}>
      {label ?? titleCase(status)}
    </span>
  );
}
