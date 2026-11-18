import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Building2, Clock, CreditCard, IndianRupee, PauseCircle, UserPlus, Users } from "lucide-react";
import { requirePlatform } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatINR } from "@/lib/utilities/format";
import { ACCESS, type Access } from "@/features/platform/format";

export const metadata: Metadata = { title: "Platform overview" };

type Row = { id: string; name: string; code: string; access: Access; plan_name: string | null; ends_at?: string; created_at?: string };
type Overview = {
  institutes: number; by_access: Partial<Record<Access, number>>; signups_30d: number; active_students: number; mrr: number;
  ending_soon: Row[]; recent: Row[];
};

function InstituteList({ rows, empty, date }: { rows: Row[]; empty: string; date: "ends_at" | "created_at" }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/platform/institutes/${r.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-primary">
            <span className="min-w-0">
              <span className="block truncate font-medium">{r.name}</span>
              <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <StatusBadge status={r.access} label={`${ACCESS[r.access].label}${r.plan_name ? ` · ${r.plan_name}` : ""}`} tone={ACCESS[r.access].tone} />
              <span className="text-xs text-muted-foreground">{date === "ends_at" ? `Ends ${formatDate(r.ends_at)}` : `Joined ${formatDate(r.created_at)}`}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function PlatformOverview() {
  await requirePlatform();
  const d = await api<Overview>("/platform/overview");
  const n = (a: Access) => d.by_access[a] ?? 0;
  return (
    <>
      <PageHeader title="Overview" description="All institutes on the platform." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Institutes" value={d.institutes} icon={Building2} href="/platform/institutes" hint={`${d.signups_30d} new in 30 days`} />
        <StatCard label="Paying (active)" value={n("active") + n("grace")} icon={CreditCard} tone="success" href="/platform/institutes?access=active" hint={n("grace") ? `${n("grace")} in grace period` : undefined} />
        <StatCard label="On free trial" value={n("trial")} icon={Clock} tone="info" href="/platform/institutes?access=trial" />
        <StatCard label="Monthly revenue (est.)" value={formatINR(d.mrr)} icon={IndianRupee} tone="success" hint="Active paid plans, yearly ÷ 12" />
        <StatCard label="Expired (read-only)" value={n("expired")} icon={AlertTriangle} tone="warning" href="/platform/institutes?access=expired" />
        <StatCard label="Suspended" value={n("suspended")} icon={PauseCircle} tone="danger" href="/platform/institutes?access=suspended" />
        <StatCard label="Active students" value={d.active_students.toLocaleString("en-IN")} icon={Users} tone="primary" />
        <StatCard label="Signups (30 days)" value={d.signups_30d} icon={UserPlus} tone="info" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Ending in the next 7 days</CardTitle></CardHeader>
          <CardContent><InstituteList rows={d.ending_soon} empty="No trials or subscriptions end this week." date="ends_at" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Newest institutes</CardTitle></CardHeader>
          <CardContent><InstituteList rows={d.recent} empty="No institutes yet." date="created_at" /></CardContent>
        </Card>
      </div>
    </>
  );
}
