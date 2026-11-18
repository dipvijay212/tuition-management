import Link from "next/link";
import { AlertTriangle, Clock, Lock } from "lucide-react";
import type { SubscriptionInfo } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

/**
 * Trial countdown / renewal reminders for admins, and the read-only notice for everyone.
 * Rendered on the server from the session (no extra request).
 */
export function SubscriptionBanner({ subscription: s, isAdmin }: { subscription: SubscriptionInfo | null; isAdmin: boolean }) {
  if (!s) return null;
  const days = s.daysLeft ?? 0;
  const plural = (n: number) => `${n} day${n === 1 ? "" : "s"}`;
  let tone: "info" | "warning" | "danger" = "info";
  let Icon = Clock;
  let text: string | null = null;

  if (s.access === "expired") {
    tone = "danger";
    Icon = Lock;
    text = isAdmin
      ? "Your subscription has expired. The account is read-only until you renew."
      : "This institute's subscription has expired. You can view information, but changes are paused.";
  } else if (!isAdmin) {
    return null;
  } else if (s.access === "grace") {
    tone = "warning";
    Icon = AlertTriangle;
    text = "Your subscription period has ended. Renew soon to avoid read-only mode.";
  } else if (s.access === "trial" && s.endsAt) {
    if (days > 14) return null;
    tone = days <= 3 ? "warning" : "info";
    text = days === 0 ? "Your free trial ends today." : `Free trial: ${plural(days)} left on the ${s.plan?.name ?? ""} plan.`;
  } else if (s.access === "active" && s.endsAt && days <= 7) {
    tone = "warning";
    text = `Your subscription renews in ${plural(days)}.`;
  }
  if (!text) return null;

  return (
    <div
      role="status"
      className={cn(
        "no-print flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-sm sm:px-6",
        tone === "info" && "bg-info/10 text-foreground",
        tone === "warning" && "bg-warning/15 text-foreground",
        tone === "danger" && "bg-destructive/10 text-foreground",
      )}
    >
      <Icon className={cn("size-4 shrink-0", tone === "danger" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-info")} />
      <span className="min-w-0 flex-1">{text}</span>
      {isAdmin && (
        <Link href="/admin/subscription" className="font-medium text-primary hover:underline">
          {s.access === "trial" ? "See plans" : "Renew"}
        </Link>
      )}
    </div>
  );
}
