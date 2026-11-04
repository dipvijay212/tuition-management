import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { DateFilter, FilterBar, SearchInput, SelectFilter } from "@/components/shared/filters";
import { formatDateTime, titleCase } from "@/lib/utilities/format";
import { likeTerm, pageParams, str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "Audit logs" };
const ENTITIES = ["students", "student_batches", "payments", "fee_obligations", "fee_structures", "student_fee_assignments", "attendance", "marks", "examinations", "user_accounts", "user_roles", "institute_settings", "expenses", "batches", "auth"];

function Diff({ oldV, newV }: { oldV: unknown; newV: unknown }) {
  if (!oldV && !newV) return null;
  const o = (oldV ?? {}) as Record<string, unknown>, n = (newV ?? {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(o), ...Object.keys(n)])].filter((k) => !["updated_at", "created_at"].includes(k) && JSON.stringify(o[k]) !== JSON.stringify(n[k]));
  if (!keys.length) return null;
  return (
    <details className="mt-1 text-xs">
      <summary className="cursor-pointer text-primary">{keys.length} field(s)</summary>
      <dl className="mt-1 space-y-0.5">{keys.slice(0, 15).map((k) => <div key={k} className="font-mono break-all"><dt className="inline text-muted-foreground">{k}: </dt><dd className="inline">{oldV ? <><span className="text-destructive line-through">{JSON.stringify(o[k])}</span> → </> : null}<span className="text-success">{JSON.stringify(n[k])}</span></dd></div>)}</dl>
    </details>
  );
}

export default async function AuditLogsPage(props: PageProps<"/admin/audit-logs">) {
  const ctx = await requireRole("admin");
  const sp = await props.searchParams;
  const { page, pageSize, from, to } = pageParams(sp, 30);
  const supabase = await createClient();
  let q = supabase.from("audit_logs").select("id, action, entity, entity_id, old_values, new_values, reason, created_at, profiles(full_name)", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (str(sp.q)) q = q.ilike("action", likeTerm(str(sp.q)!));
  if (str(sp.entity)) q = q.eq("entity", str(sp.entity)!);
  if (str(sp.from)) q = q.gte("created_at", `${str(sp.from)}T00:00:00+05:30`);
  if (str(sp.to)) q = q.lte("created_at", `${str(sp.to)}T23:59:59+05:30`);
  const { data, count, error } = await q;
  if (error) throw error;
  return (
    <>
      <PageHeader title="Audit logs" description="Read-only record of sensitive actions. Entries cannot be edited or deleted." />
      <FilterBar>
        <SearchInput placeholder="Search action (e.g. payment)" />
        <SelectFilter param="entity" label="Entity" options={ENTITIES.map((e) => ({ value: e, label: titleCase(e) }))} />
        <DateFilter param="from" label="From" />
        <DateFilter param="to" label="To" />
      </FilterBar>
      <DataTable
        rows={data ?? []} rowKey={(r) => String(r.id)} total={count ?? 0} page={page} pageSize={pageSize}
        empty={{ title: "No log entries", description: "Sensitive actions will appear here." }}
        columns={[
          { key: "at", header: "When", cell: (r) => <span className="text-sm whitespace-nowrap">{formatDateTime(r.created_at, ctx.timezone)}</span> },
          { key: "who", header: "User", cell: (r) => r.profiles?.full_name ?? "System" },
          { key: "action", header: "Action", cell: (r) => <div><span className="font-medium">{titleCase(r.action)}</span><span className="text-muted-foreground"> · {titleCase(r.entity)}</span>{r.reason && <div className="text-xs">Reason: {r.reason}</div>}<Diff oldV={r.old_values} newV={r.new_values} /></div> },
        ]}
      />
    </>
  );
}
