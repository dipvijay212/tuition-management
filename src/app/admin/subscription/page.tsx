import type { Metadata } from "next";
import { Check, Mail, MessageCircle, Phone } from "lucide-react";
import { requireRole, type Access, type SubscriptionInfo } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatINR } from "@/lib/utilities/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Subscription" };

type Plan = {
  id: string; code: string; name: string; description: string | null; price_monthly: number; price_yearly: number;
  max_students: number | null; max_teachers: number | null; max_batches: number | null; storage_mb: number | null; features: string[];
};
type Data = {
  subscription: SubscriptionInfo | null;
  usage: { students: number; teachers: number; batches: number };
  storageBytes: number;
  plans: Plan[];
  history: { event: string; amount: number | null; created_at: string; details: { plan?: string; from?: string; to?: string; billing_cycle?: string; status?: string } }[];
};

const ACCESS_LABEL: Record<Access, { label: string; tone: "success" | "info" | "warning" | "danger" }> = {
  trial: { label: "Free trial", tone: "info" },
  active: { label: "Active", tone: "success" },
  grace: { label: "Renewal due", tone: "warning" },
  expired: { label: "Expired (read-only)", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
};
const FEATURE_LABEL: Record<string, string> = { exams: "Exams & results", homework: "Homework", materials: "Study materials" };
const limitText = (n: number | null, unit = "") => (n === null ? "Unlimited" : `${n.toLocaleString("en-IN")}${unit}`);
const storageText = (mb: number | null) => (mb === null ? "Unlimited" : mb >= 1024 ? `${+(mb / 1024).toFixed(1)} GB` : `${mb} MB`);
const bytesText = (b: number) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(2)} GB` : b >= 1024 ** 2 ? `${(b / 1024 ** 2).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

function Meter({ label, used, limit, display }: { label: string; used: number; limit: number | null; display?: [string, string] }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{display ? display[0] : used.toLocaleString("en-IN")} <span className="text-muted-foreground">/ {display ? display[1] : limitText(limit)}</span></span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn("h-full rounded-full", pct >= 90 ? "bg-destructive" : pct >= 75 ? "bg-warning" : "bg-primary")} style={{ width: limit ? `${pct}%` : "0%" }} />
      </div>
    </div>
  );
}

export default async function SubscriptionPage() {
  const ctx = await requireRole("admin");
  const d = await api<Data>("/subscription");
  const s = d.subscription;
  const current = d.plans.find((p) => p.code === s?.plan?.code);
  const support = { email: process.env.SUPPORT_EMAIL, phone: process.env.SUPPORT_PHONE, whatsapp: process.env.SUPPORT_WHATSAPP };
  const access = s ? ACCESS_LABEL[s.access] : null;

  return (
    <>
      <PageHeader title="Subscription" description="Your plan, usage and renewals." />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {s?.plan?.name ?? "No plan"} plan {access && <StatusBadge status={s!.access} label={access.label} tone={access.tone} />}
            </CardTitle>
            <CardDescription>
              {s?.access === "trial" && s.endsAt && <>Free trial ends on {formatDate(s.endsAt)} ({s.daysLeft} days left).</>}
              {(s?.access === "active" || s?.access === "grace") && (s.endsAt ? <>Paid until {formatDate(new Date(new Date(s.endsAt).getTime() - 86400000))}{s.billingCycle ? `, billed ${s.billingCycle}` : ""}.</> : <>No end date.</>)}
              {s?.access === "expired" && <>Your account is read-only. Everything is kept safe; renew to continue making changes.</>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Meter label="Active students" used={d.usage.students} limit={s?.limits.students ?? null} />
            <Meter label="Teachers" used={d.usage.teachers} limit={s?.limits.teachers ?? null} />
            <Meter label="Active batches" used={d.usage.batches} limit={s?.limits.batches ?? null} />
            <Meter
              label="File storage"
              used={d.storageBytes}
              limit={s?.limits.storageMb != null ? s.limits.storageMb * 1024 * 1024 : null}
              display={[bytesText(d.storageBytes), storageText(s?.limits.storageMb ?? null)]}
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Object.keys(FEATURE_LABEL).map((f) => (
                <StatusBadge key={f} status={f} label={FEATURE_LABEL[f]} tone={s?.features.includes(f as never) ? "success" : "neutral"} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upgrade or renew</CardTitle>
            <CardDescription>Contact us with your institute code and the plan you want. We activate it as soon as payment is received.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Your institute code</div>
              <div className="font-mono text-lg font-semibold tracking-widest">{ctx.institute?.code}</div>
            </div>
            {support.phone && <a className="flex items-center gap-2 hover:text-primary" href={`tel:${support.phone}`}><Phone className="size-4" /> {support.phone}</a>}
            {support.whatsapp && (
              <a className="flex items-center gap-2 hover:text-primary" href={`https://wa.me/${support.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, I want to renew/upgrade. Institute code: ${ctx.institute?.code}`)}`} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" /> WhatsApp {support.whatsapp}
              </a>
            )}
            {support.email && (
              <a className="flex items-center gap-2 hover:text-primary" href={`mailto:${support.email}?subject=${encodeURIComponent(`Subscription – ${ctx.institute?.code}`)}`}>
                <Mail className="size-4" /> {support.email}
              </a>
            )}
            {!support.phone && !support.whatsapp && !support.email && <p className="text-muted-foreground">Please contact the platform team to change your plan.</p>}
          </CardContent>
        </Card>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold">Plans</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {d.plans.map((p) => {
          const isCurrent = p.id === current?.id;
          return (
            <div key={p.id} className={cn("flex flex-col rounded-xl border bg-card p-5", isCurrent && "border-primary ring-1 ring-primary")}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{p.name}</h3>
                {isCurrent && <StatusBadge status="current" label="Current plan" tone="primary" />}
              </div>
              {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
              <p className="mt-3 text-2xl font-semibold tabular-nums">{formatINR(p.price_monthly)}<span className="text-sm font-normal text-muted-foreground"> / month</span></p>
              <p className="text-xs text-muted-foreground">or {formatINR(p.price_yearly)} / year</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {[
                  `${limitText(p.max_students)} active students`,
                  `${limitText(p.max_teachers)} teachers`,
                  `${limitText(p.max_batches)} batches`,
                  `${storageText(p.storage_mb)} storage`,
                  ...p.features.map((f) => FEATURE_LABEL[f] ?? f),
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" /> {t}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {d.history.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 text-lg font-semibold">History</h2>
          <div className="divide-y rounded-xl border bg-card">
            {d.history.map((h, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">{h.event === "renewed" ? `Renewed: ${h.details.plan ?? ""}` : `Started ${h.details.status === "trialing" ? "free trial" : "subscription"}: ${h.details.plan ?? ""}`}</div>
                  {h.details.from && <div className="text-xs text-muted-foreground">{formatDate(h.details.from)} – {formatDate(h.details.to)}</div>}
                </div>
                <div className="text-right">
                  {h.amount != null && <div className="font-medium tabular-nums">{formatINR(h.amount)}</div>}
                  <div className="text-xs text-muted-foreground">{formatDate(h.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
