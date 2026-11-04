import type { Metadata } from "next";
import { requireRole, type AppRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { FilterBar, SearchInput, SelectFilter } from "@/components/shared/filters";
import { UserRowActions } from "@/features/users/user-row-actions";
import { NewAdminDialog } from "@/features/users/new-admin-dialog";
import { formatDateTime } from "@/lib/utilities/format";
import { likeTerm, pageParams, str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "User management" };

export default async function UsersPage(props: PageProps<"/admin/users">) {
  const ctx = await requireRole("admin");
  const sp = await props.searchParams;
  const { page, pageSize, from, to } = pageParams(sp);
  const supabase = await createClient();
  const role = str(sp.role) as AppRole | undefined;
  let q = supabase.from("profiles").select(`id, full_name, email, phone, status, last_login_at, user_roles!user_roles_user_id_fkey${role ? "!inner" : ""}(role)`, { count: "exact" }).order("full_name").range(from, to);
  if (str(sp.q)) { const t = likeTerm(str(sp.q)!); q = q.or(`full_name.ilike.${t},email.ilike.${t},phone.ilike.${t}`); }
  if (str(sp.status)) q = q.eq("status", str(sp.status) as "active");
  if (role) q = q.eq("user_roles.role", role);
  const { data, count, error } = await q;
  if (error) throw error;
  return (
    <>
      <PageHeader title="User management" description="Login accounts, roles and access status. Users can never change their own role." actions={<NewAdminDialog />} />
      <FilterBar>
        <SearchInput placeholder="Search name, email, mobile" />
        <SelectFilter param="role" label="Role" options={["admin", "teacher", "student", "parent"].map((r) => ({ value: r, label: r[0].toUpperCase() + r.slice(1) }))} />
        <SelectFilter param="status" label="Status" options={["active", "pending_activation", "inactive", "suspended"].map((s) => ({ value: s, label: s.replace("_", " ") }))} />
      </FilterBar>
      <DataTable
        rows={data ?? []} rowKey={(r) => r.id} total={count ?? 0} page={page} pageSize={pageSize}
        empty={{ title: "No users found" }}
        columns={[
          { key: "name", header: "User", cell: (r) => <div><div className="font-medium">{r.full_name || "—"}{r.id === ctx.userId && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}</div><div className="text-xs text-muted-foreground">{r.email}</div></div> },
          { key: "phone", header: "Mobile", hideOnMobile: true, cell: (r) => r.phone ?? "—" },
          { key: "roles", header: "Roles", cell: (r) => <div className="flex flex-wrap gap-1">{r.user_roles.map((x) => <StatusBadge key={x.role} status={x.role} tone={x.role === "admin" ? "primary" : "neutral"} />)}</div> },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          { key: "login", header: "Last login", hideOnMobile: true, cell: (r) => <span className="text-sm text-muted-foreground">{r.last_login_at ? formatDateTime(r.last_login_at, ctx.timezone) : "Never"}</span> },
          { key: "act", header: "", className: "text-right", cell: (r) => <UserRowActions userId={r.id} status={r.status} roles={r.user_roles.map((x) => x.role as AppRole)} isSelf={r.id === ctx.userId} /> },
        ]}
      />
    </>
  );
}
