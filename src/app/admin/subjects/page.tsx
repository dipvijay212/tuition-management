import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { FilterBar, SearchInput, SelectFilter } from "@/components/shared/filters";
import { Button } from "@/components/ui/button";
import { SubjectDialog } from "@/features/academics/forms";
import { str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "Subjects" };

export default async function SubjectsPage(props: PageProps<"/admin/subjects">) {
  await requireRole("admin");
  const sp = await props.searchParams;
  type Row = { id: string; name: string; code: string | null; class_id: string | null; description: string | null; status: "active" | "inactive"; classes: { name: string } | null };
  const { rows, classes } = await api<{ rows: Row[]; classes: { id: string; name: string }[] }>("/academics/subjects", { query: { q: str(sp.q), class: str(sp.class), status: str(sp.status) } });
  const classOpts = classes ?? [];
  return (
    <>
      <PageHeader title="Subjects" description="Subjects can belong to one class or be reused across classes." actions={<SubjectDialog classes={classOpts} trigger={<Button><Plus /> New subject</Button>} />} />
      <FilterBar>
        <SearchInput placeholder="Search name or code" />
        <SelectFilter param="class" label="Class" options={classOpts.map((c) => ({ value: c.id, label: c.name }))} />
        <SelectFilter param="status" label="Status" options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
      </FilterBar>
      <DataTable
        rows={rows ?? []}
        rowKey={(r) => r.id}
        empty={{ title: "No subjects found", description: "Add subjects like Mathematics, Science or English.", action: <SubjectDialog classes={classOpts} trigger={<Button><Plus /> New subject</Button>} /> }}
        columns={[
          { key: "name", header: "Subject", cell: (r) => <span className="font-medium">{r.name}</span> },
          { key: "code", header: "Code", cell: (r) => r.code ? <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.code}</code> : "—" },
          { key: "class", header: "Class", hideOnMobile: true, cell: (r) => r.classes?.name ?? <span className="text-muted-foreground">Any class</span> },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          { key: "act", header: "", className: "text-right", cell: (r) => <SubjectDialog classes={classOpts} value={r} trigger={<Button variant="outline" size="sm">Edit</Button>} /> },
        ]}
      />
    </>
  );
}
