import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { FilterBar, SearchInput, SelectFilter } from "@/components/shared/filters";
import { Button } from "@/components/ui/button";
import { likeTerm, pageParams, str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "Teachers" };

export default async function TeachersPage(props: PageProps<"/admin/teachers">) {
  await requireRole("admin");
  const sp = await props.searchParams;
  const { page, pageSize, from, to } = pageParams(sp);
  const supabase = await createClient();
  let q = supabase.from("teachers").select("id, full_name, phone, email, specialization, employment_status, profile_id, teacher_batches(count)", { count: "exact" }).order("full_name").range(from, to);
  if (str(sp.q)) { const t = likeTerm(str(sp.q)!); q = q.or(`full_name.ilike.${t},phone.ilike.${t},email.ilike.${t}`); }
  if (str(sp.status)) q = q.eq("employment_status", str(sp.status) as "active");
  const { data, count, error } = await q;
  if (error) throw error;
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
