import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatform } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { FilterBar, SearchInput, SelectFilter } from "@/components/shared/filters";
import { formatDate } from "@/lib/utilities/format";
import { pageParams, str } from "@/lib/utilities/query";
import { ACCESS, type Access } from "@/features/platform/format";

export const metadata: Metadata = { title: "Institutes" };

type Row = {
  id: string; name: string; code: string; created_at: string; access: Access; plan_code: string | null; plan_name: string | null;
  billing_cycle: string | null; ends_at: string | null; students: number; teachers: number;
  owner: { name: string; email: string | null; phone: string | null } | null;
};

export default async function InstitutesPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePlatform();
  const sp = await props.searchParams;
  const { page, pageSize } = pageParams(sp);
  const [{ rows, count }, plans] = await Promise.all([
    api<{ rows: Row[]; count: number }>("/platform/institutes", { query: { page, pageSize, q: str(sp.q), access: str(sp.access), plan: str(sp.plan) } }),
    api<{ code: string; name: string }[]>("/platform/plans"),
  ]);
  return (
    <>
      <PageHeader title="Institutes" description={`${count} institute${count === 1 ? "" : "s"}`} />
      <FilterBar>
        <SearchInput placeholder="Search name, code, email, phone" />
        <SelectFilter param="access" label="Status" options={(Object.keys(ACCESS) as Access[]).map((a) => ({ value: a, label: ACCESS[a].label }))} />
        <SelectFilter param="plan" label="Plan" options={plans.map((p) => ({ value: p.code, label: p.name }))} />
      </FilterBar>
      <DataTable
        rows={rows} rowKey={(r) => r.id} total={count} page={page} pageSize={pageSize}
        empty={{ title: "No institutes found" }}
        columns={[
          { key: "name", header: "Institute", cell: (r) => <Link href={`/platform/institutes/${r.id}`} className="font-medium hover:text-primary">{r.name}<div className="font-mono text-xs font-normal text-muted-foreground">{r.code}</div></Link> },
          { key: "owner", header: "Owner", hideOnMobile: true, cell: (r) => r.owner ? <div className="text-sm"><div>{r.owner.name}</div><div className="text-xs text-muted-foreground">{r.owner.email ?? r.owner.phone}</div></div> : "—" },
          { key: "plan", header: "Plan", cell: (r) => <div className="space-y-1"><StatusBadge status={r.access} label={ACCESS[r.access].label} tone={ACCESS[r.access].tone} /><div className="text-xs text-muted-foreground">{r.plan_name ?? "No plan"}{r.billing_cycle && r.access !== "trial" ? ` · ${r.billing_cycle}` : ""}</div></div> },
          { key: "ends", header: "Ends", hideOnMobile: true, cell: (r) => <span className="text-sm">{r.ends_at ? formatDate(r.ends_at) : "—"}</span> },
          { key: "students", header: "Students", className: "text-right", cell: (r) => <span className="tabular-nums">{r.students}</span> },
          { key: "teachers", header: "Teachers", hideOnMobile: true, className: "text-right", cell: (r) => <span className="tabular-nums">{r.teachers}</span> },
          { key: "created", header: "Joined", hideOnMobile: true, cell: (r) => <span className="text-sm text-muted-foreground">{formatDate(r.created_at)}</span> },
        ]}
      />
    </>
  );
}
