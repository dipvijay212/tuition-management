import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getSession, hasFeature, type Feature } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

const LABEL: Record<Feature, string> = { exams: "Examinations & results", homework: "Homework", materials: "Study materials" };

/**
 * Route-segment guard for plan features. Uses the per-request cached session (no extra API call).
 * The API rejects these routes too; this just shows a friendly page instead of an error.
 */
export async function FeatureGate({ feature, children }: { feature: Feature; children: React.ReactNode }) {
  const s = await getSession();
  if (hasFeature(s, feature)) return <>{children}</>;
  const isAdmin = !!s?.roles.includes("admin");
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="size-7" /></span>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{LABEL[feature]} is not in your plan</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "Upgrade your plan to turn this feature on for your institute." : "Ask your institute to upgrade their plan to use this feature."}
        </p>
      </div>
      {isAdmin && <Button nativeButton={false} render={<Link href="/admin/subscription" />}>See plans</Button>}
    </div>
  );
}
