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
import { ClassDialog } from "@/features/academics/forms";
import { likeTerm, str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "Classes" };

export default async function ClassesPage(props: PageProps<"/admin/classes">) {
  await requireRole("admin");
  const sp = await props.searchParams;
  const supabase = await createClient();
  let q = supabase.from("classes").select("id, name, description, academic_year_id, sort_order, status, academic_years(name), batches(count), subjects(count), students(count)").order("sort_order").order("name");
  if (str(sp.q)) q = q.ilike("name", likeTerm(str(sp.q)!));
  if (str(sp.status)) q = q.eq("status", str(sp.status) as "active" | "inactive");
  const [{ data: rows, error }, { data: years }] = await Promise.all([q, supabase.from("academic_years").select("id, name").order("start_date", { ascending: false })]);
  if (error) throw error;
  const yearOpts = years ?? [];
  const count = (x: unknown) => (x as { count: number }[] | null)?.[0]?.count ?? 0;
  return (
    <>
      <PageHeader title="Classes" description="Academic classes such as Standard 1–12. Batches and subjects belong to a class." actions={<ClassDialog years={yearOpts} trigger={<Button><Plus /> New class</Button>} />} />
      <FilterBar>
        <SearchInput placeholder="Search classes" />
        <SelectFilter param="status" label="Status" options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
      </FilterBar>
      <DataTable
        rows={rows ?? []}
        rowKey={(r) => r.id}
        empty={{ title: "No classes yet", description: "Create your first class, e.g. Standard 10.", action: <ClassDialog years={yearOpts} trigger={<Button><Plus /> New class</Button>} /> }}
        columns={[
          { key: "name", header: "Class", cell: (r) => <div><div className="font-medium">{r.name}</div>{r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}</div> },
          { key: "year", header: "Academic year", hideOnMobile: true, cell: (r) => r.academic_years?.name ?? "All years" },
          { key: "batches", header: "Batches", cell: (r) => <Link className="text-primary hover:underline" href={`/admin/batches?class=${r.id}`}>{count(r.batches)}</Link> },
          { key: "subjects", header: "Subjects", hideOnMobile: true, cell: (r) => <Link className="text-primary hover:underline" href={`/admin/subjects?class=${r.id}`}>{count(r.subjects)}</Link> },
          { key: "students", header: "Students", hideOnMobile: true, cell: (r) => <Link className="text-primary hover:underline" href={`/admin/students?class=${r.id}`}>{count(r.students)}</Link> },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          { key: "act", header: "", className: "text-right", cell: (r) => <ClassDialog years={yearOpts} value={r} trigger={<Button variant="outline" size="sm">Edit</Button>} /> },
        ]}
      />
    </>
  );
}
