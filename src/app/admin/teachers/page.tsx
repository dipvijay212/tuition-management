import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { FilterBar, SearchInput, SelectFilter } from "@/components/shared/filters";
import { Button } from "@/components/ui/button";
import { pageParams, str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "Teachers" };

export default async function TeachersPage(props: PageProps<"/admin/teachers">) {
  await requireRole("admin");
  const sp = await props.searchParams;
  const { page, pageSize } = pageParams(sp);
  type Row = Pick<Tables<"teachers">, "id" | "full_name" | "phone" | "email" | "specialization" | "employment_status" | "profile_id"> & { teacher_batches: { count: number }[] };
  const { rows: data, count } = await api<{ rows: Row[]; count: number }>("/teachers", { query: { page, pageSize, q: str(sp.q), status: str(sp.status) } });
  return (
    <>
      <PageHeader title="Teachers" description="Teacher profiles, subjects, batches and login access." actions={<Button nativeButton={false} render={<Link href="/admin/teachers/new" />}><Plus /> Add teacher</Button>} />
      <FilterBar>
        <SearchInput placeholder="Search name, mobile, email" />
        <SelectFilter param="status" label="Status" options={[{ value: "active", label: "Active" }, { value: "on_leave", label: "On leave" }, { value: "resigned", label: "Resigned" }, { value: "terminated", label: "Terminated" }]} />
      </FilterBar>
      <DataTable
        rows={data ?? []} rowKey={(r) => r.id} total={count ?? 0} page={page} pageSize={pageSize}
        empty={{ title: "No teachers found", description: "Add teachers to assign them to batches.", action: <Button nativeButton={false} render={<Link href="/admin/teachers/new" />}><Plus /> Add teacher</Button> }}
        columns={[
          { key: "name", header: "Teacher", cell: (r) => <Link href={`/admin/teachers/${r.id}`} className="font-medium hover:text-primary">{r.full_name}<div className="text-xs font-normal text-muted-foreground">{r.specialization ?? ""}</div></Link> },
          { key: "phone", header: "Mobile", cell: (r) => r.phone },
          { key: "email", header: "Email", hideOnMobile: true, cell: (r) => r.email ?? "—" },
          { key: "batches", header: "Batches", hideOnMobile: true, cell: (r) => (r.teacher_batches as unknown as { count: number }[])?.[0]?.count ?? 0 },
          { key: "login", header: "Login", hideOnMobile: true, cell: (r) => r.profile_id ? <StatusBadge status="active" label="Enabled" /> : <StatusBadge status="inactive" label="None" /> },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.employment_status} /> },
        ]}
      />
    </>
  );
}
