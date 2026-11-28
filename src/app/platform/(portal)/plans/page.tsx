import type { Metadata } from "next";
import { requirePlatform } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatINR } from "@/lib/utilities/format";
import { limitText, storageText } from "@/features/platform/format";
import { PlanDialog, type Plan } from "@/features/platform/plan-dialog";

export const metadata: Metadata = { title: "Plans" };

export default async function PlansPage() {
  await requirePlatform();
  const plans = await api<Plan[]>("/platform/plans");
  return (
    <>
      <PageHeader title="Plans" description="Prices, limits and features. Payments are recorded manually from each institute's page." actions={<PlanDialog />} />
      <DataTable
        rows={plans} rowKey={(p) => p.id}
        empty={{ title: "No plans yet" }}
        columns={[
          { key: "name", header: "Plan", cell: (p) => <div><div className="font-medium">{p.name}</div><div className="font-mono text-xs text-muted-foreground">{p.code}</div></div> },
          { key: "price", header: "Price", cell: (p) => <div className="text-sm tabular-nums"><div>{formatINR(p.price_monthly)}/mo</div><div className="text-xs text-muted-foreground">{formatINR(p.price_yearly)}/yr</div></div> },
          { key: "limits", header: "Limits", hideOnMobile: true, cell: (p) => <div className="text-xs text-muted-foreground">{limitText(p.max_students)} students · {limitText(p.max_teachers)} teachers · {limitText(p.max_batches)} batches · {storageText(p.storage_mb)}</div> },
          { key: "features", header: "Features", hideOnMobile: true, cell: (p) => <div className="flex flex-wrap gap-1">{p.features.map((f) => <StatusBadge key={f} status={f} tone="neutral" />)}</div> },
          { key: "flags", header: "", cell: (p) => <div className="flex flex-wrap gap-1">{p.is_trial_default && <StatusBadge status="trial" label="Trial default" tone="info" />}{!p.is_public && <StatusBadge status="hidden" label="Hidden" tone="neutral" />}{!p.is_active && <StatusBadge status="inactive" />}</div> },
          { key: "count", header: "Institutes", className: "text-right", cell: (p) => <span className="tabular-nums">{p.institutes}</span> },
          { key: "act", header: "", className: "text-right", cell: (p) => <PlanDialog plan={p} /> },
        ]}
      />
    </>
  );
}
