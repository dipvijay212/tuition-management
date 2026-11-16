import Link from "next/link";
import { Bell } from "lucide-react";
import { requireRole, type AppRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar, SelectFilter } from "@/components/shared/filters";
import { Pagination } from "@/components/shared/pagination";
import { formatDateTime } from "@/lib/utilities/format";
import { pageParams, str } from "@/lib/utilities/query";
import { resolveNotificationLink } from "@/lib/utilities/links";
import { MarkAllRead, Preferences } from "./notification-controls";
import { OPTIONAL_TYPES } from "./types";
import { cn } from "@/lib/utils";

export async function NotificationsPage({ role, searchParams }: { role: AppRole; searchParams: Record<string, string | string[] | undefined> }) {
  const ctx = await requireRole(role);
  const { page, pageSize } = pageParams(searchParams, 25);
  type Row = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };
  const { rows: data, count, unread, prefs } = await api<{ rows: Row[]; count: number; unread: number; prefs: { type: string; in_app: boolean }[] }>("/notifications", {
    query: { page, pageSize, filter: str(searchParams.filter) },
  });
  return (
    <>
      <PageHeader title="Notifications" description={`${unread ?? 0} unread`} actions={<MarkAllRead disabled={!unread} />} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <FilterBar><SelectFilter param="filter" label="Show" allLabel="All" options={[{ value: "unread", label: "Unread only" }]} /></FilterBar>
          {data.length === 0 ? <EmptyState icon={Bell} title="No notifications" description="Updates about attendance, fees, results and announcements appear here." /> : (
            <div className="overflow-hidden rounded-xl border bg-card">
              <ul className="divide-y">
                {data.map((n) => (
                  <li key={n.id}>
                    <Link href={resolveNotificationLink(role, n.link)} className={cn("flex gap-3 px-4 py-3 hover:bg-muted/50", !n.read_at && "bg-primary/5")}>
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")} />
                      <span className="min-w-0 flex-1"><span className="block font-medium">{n.title}</span>{n.body && <span className="block text-sm text-muted-foreground">{n.body}</span>}<span className="mt-1 block text-xs text-muted-foreground">{formatDateTime(n.created_at, ctx.timezone)}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="border-t px-4 py-3"><Pagination total={count ?? 0} page={page} pageSize={pageSize} /></div>
            </div>
          )}
        </div>
        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Preferences</CardTitle><CardDescription>Payment confirmations, results, admissions and class cancellations are always delivered.</CardDescription></CardHeader>
          <CardContent><Preferences types={OPTIONAL_TYPES} initial={Object.fromEntries((prefs ?? []).map((p) => [p.type, p.in_app]))} /></CardContent>
        </Card>
      </div>
    </>
  );
}
