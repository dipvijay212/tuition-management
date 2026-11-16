import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { FilterBar, SearchInput, SelectFilter } from "@/components/shared/filters";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utilities/format";
import { pageParams, str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "Students" };
const STATUSES = ["active", "inactive", "on_hold", "discontinued", "completed"] as const;

export default async function StudentsPage(props: PageProps<"/admin/students">) {
  await requireRole("admin");
  const sp = await props.searchParams;
  const { page, pageSize } = pageParams(sp);
  const batch = str(sp.batch);
  type Row = Pick<Tables<"students">, "id" | "full_name" | "admission_no" | "phone" | "status" | "admission_date"> & {
    classes: { name: string } | null;
    parent_students: { is_primary: boolean; guardians: { full_name: string; phone: string } | null }[];
    student_batches: { status: string; batch_id: string; batches: { name: string } | null }[];
  };
  const { rows: data, count, classes, batches } = await api<{ rows: Row[]; count: number; classes: { id: string; name: string }[]; batches: { id: string; name: string }[] }>("/students", {
    query: { page, pageSize, q: str(sp.q), class: str(sp.class), status: str(sp.status), batch },
  });
  const newBtn = <Button nativeButton={false} render={<Link href="/admin/students/new" />}><UserPlus /> New admission</Button>;
  return (
    <>
      <PageHeader title="Students" description={`${count ?? 0} student record(s)`} actions={newBtn} />
      <FilterBar>
        <SearchInput placeholder="Search name, admission no., mobile" />
        <SelectFilter param="class" label="Class" options={(classes ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        <SelectFilter param="batch" label="Batch" options={(batches ?? []).map((b) => ({ value: b.id, label: b.name }))} />
        <SelectFilter param="status" label="Status" options={STATUSES.map((s) => ({ value: s, label: s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase()) }))} />
      </FilterBar>
      <DataTable
        rows={data ?? []} rowKey={(r) => r.id} total={count ?? 0} page={page} pageSize={pageSize}
        empty={{ title: "No students found", description: str(sp.q) || str(sp.class) || str(sp.status) || batch ? "Try changing the filters." : "Start by admitting your first student.", action: newBtn }}
        columns={[
          { key: "name", header: "Student", cell: (r) => <Link href={`/admin/students/${r.id}`} className="font-medium hover:text-primary">{r.full_name}<div className="text-xs font-normal text-muted-foreground">{r.admission_no}</div></Link> },
          { key: "class", header: "Class / batch", cell: (r) => <div className="text-sm">{r.classes?.name ?? "—"}<div className="text-xs text-muted-foreground">{r.student_batches.filter((b) => b.status === "active").map((b) => b.batches?.name).join(", ") || "No batch"}</div></div> },
          { key: "parent", header: "Parent", hideOnMobile: true, cell: (r) => { const p = r.parent_students.find((x) => x.is_primary) ?? r.parent_students[0]; return p ? <div className="text-sm">{p.guardians?.full_name}<div className="text-xs text-muted-foreground">{p.guardians?.phone}</div></div> : "—"; } },
          { key: "date", header: "Admitted", hideOnMobile: true, cell: (r) => formatDate(r.admission_date) },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
    </>
  );
}
