import type { Metadata } from "next";
import { requirePlatform } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime, formatINR, titleCase } from "@/lib/utilities/format";
import { ACCESS, bytesText, limitText, storageText, type Access } from "@/features/platform/format";
import { EditInstituteDialog, EditSubscriptionDialog, RenewDialog, StatusDialog, type PlanOption, type Sub } from "@/features/platform/institute-dialogs";

export const metadata: Metadata = { title: "Institute" };

type Detail = {
  institute: { id: string; name: string; code: string; status: string; phone: string | null; email: string | null; address: string | null; created_at: string };
  access: { access: Access; plan_name: string | null; plan_code: string | null; ends_at: string | null; max_students: number | null; max_teachers: number | null; max_batches: number | null; storage_mb: number | null; features: string[] | null } | null;
  subscription: Sub & { updated_at?: string };
  usage: { students: number; students_total: number; teachers: number; batches: number; users: number; storage_bytes: number | null; last_login_at: string | null };
  admins: { id: string; name: string; email: string | null; phone: string | null; status: string; last_login_at: string | null }[];
  events: { id: string; event: string; amount: number | null; details: Record<string, unknown>; created_at: string; actor: string | null }[];
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function eventText(e: Detail["events"][number]) {
  const d = e.details as Record<string, string | number | null | undefined>;
  switch (e.event) {
    case "renewed": return `Renewed ${d.plan} (${d.periods} × ${d.billing_cycle}) ${d.from} → ${d.to}${d.method ? ` · ${titleCase(String(d.method))}` : ""}${d.reference ? ` · ${d.reference}` : ""}`;
    case "subscription_updated": return `Subscription set: ${d.plan}, ${d.status}${d.current_period_end ? `, until ${d.current_period_end}` : ""}${d.trial_ends_at ? `, trial until ${d.trial_ends_at}` : ""}`;
    case "created": return `Created: ${d.plan}${d.status ? `, ${d.status}` : ""}${d.note ? ` (${d.note})` : ""}`;
    case "suspended": return `Suspended: ${d.reason}`;
    case "reactivated": return `Reactivated: ${d.reason}`;
    case "profile_changed": return "Name / code changed";
    default: return titleCase(e.event);
  }
}

export default async function InstituteDetail(props: { params: Promise<{ id: string }> }) {
  await requirePlatform();
  const { id } = await props.params;
  const [d, plans] = await Promise.all([api<Detail>(`/platform/institutes/${encodeURIComponent(id)}`), api<PlanOption[]>("/platform/plans")]);
  const a = d.access;
  const suspended = d.institute.status !== "active";
  return (
    <>
      <PageHeader
        back={{ href: "/platform/institutes", label: "Institutes" }}
        title={d.institute.name}
        description={<span className="font-mono">{d.institute.code}</span>}
        actions={
          <>
            <RenewDialog instituteId={d.institute.id} plans={plans} sub={d.subscription} />
            <EditSubscriptionDialog instituteId={d.institute.id} plans={plans} sub={d.subscription} />
            <EditInstituteDialog instituteId={d.institute.id} name={d.institute.name} code={d.institute.code} />
            <StatusDialog instituteId={d.institute.id} suspended={suspended} />
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2">Subscription {a && <StatusBadge status={a.access} label={ACCESS[a.access].label} tone={ACCESS[a.access].tone} />}</CardTitle></CardHeader>
          <CardContent className="divide-y">
            <Row label="Plan">{a?.plan_name ?? "None"}</Row>
            <Row label="Status">{d.subscription ? titleCase(d.subscription.status) : "—"}</Row>
            <Row label="Billing">{d.subscription ? titleCase(d.subscription.billing_cycle) : "—"}</Row>
            <Row label={d.subscription?.status === "trialing" ? "Trial ends" : "Paid until"}>
              {d.subscription?.status === "trialing" ? formatDateTime(d.subscription.trial_ends_at) : d.subscription?.current_period_end ? formatDate(d.subscription.current_period_end) : "No end date"}
            </Row>
            <Row label="Grace days">{d.subscription?.grace_days ?? "—"}</Row>
            {d.subscription?.notes && <p className="pt-2 text-sm text-muted-foreground">{d.subscription.notes}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Usage</CardTitle></CardHeader>
          <CardContent className="divide-y">
            <Row label="Active students">{d.usage.students} / {limitText(a?.max_students ?? null)}</Row>
            <Row label="All students">{d.usage.students_total}</Row>
            <Row label="Teachers">{d.usage.teachers} / {limitText(a?.max_teachers ?? null)}</Row>
            <Row label="Active batches">{d.usage.batches} / {limitText(a?.max_batches ?? null)}</Row>
            <Row label="Storage">{bytesText(d.usage.storage_bytes)} / {storageText(a?.storage_mb ?? null)}</Row>
            <Row label="Active logins">{d.usage.users}</Row>
            <Row label="Last sign-in">{d.usage.last_login_at ? formatDateTime(d.usage.last_login_at) : "Never"}</Row>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Institute</CardTitle></CardHeader>
          <CardContent className="divide-y">
            <Row label="Platform status"><StatusBadge status={d.institute.status} /></Row>
            <Row label="Phone">{d.institute.phone ?? "—"}</Row>
            <Row label="Email">{d.institute.email ?? "—"}</Row>
            <Row label="Joined">{formatDate(d.institute.created_at)}</Row>
            <div className="pt-3">
              <p className="mb-2 text-sm text-muted-foreground">Admins</p>
              <ul className="space-y-2">
                {d.admins.map((ad) => (
                  <li key={ad.id} className="text-sm">
                    <div className="flex items-center gap-2 font-medium">{ad.name || "—"} <StatusBadge status={ad.status} /></div>
                    <div className="text-xs text-muted-foreground">{[ad.email, ad.phone].filter(Boolean).join(" · ")}</div>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
      <h2 className="mt-8 mb-3 text-lg font-semibold">History</h2>
      {d.events.length ? (
        <div className="divide-y rounded-xl border bg-card">
          {d.events.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{eventText(e)}</div>
                <div className="text-xs text-muted-foreground">{formatDateTime(e.created_at)}{e.actor ? ` · by ${e.actor}` : ""}</div>
              </div>
              {e.amount != null && <div className="font-medium tabular-nums">{formatINR(e.amount)}</div>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No history yet.</p>
      )}
    </>
  );
}
