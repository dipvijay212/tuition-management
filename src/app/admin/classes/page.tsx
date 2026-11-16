import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Layers, Users, BookOpen } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { FilterBar, SearchInput, SelectFilter } from "@/components/shared/filters";
import { Button } from "@/components/ui/button";
import { ClassDialog } from "@/features/academics/forms";
import { str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "Classes" };

export default async function ClassesPage(props: PageProps<"/admin/classes">) {
  await requireRole("admin");
  const sp = await props.searchParams;
  type Row = { id: string; name: string; description: string | null; academic_year_id: string | null; sort_order: number; status: "active" | "inactive"; academic_years: { name: string } | null; batches: { count: number }[]; subjects: { count: number }[]; students: { count: number }[] };
  const { rows, years } = await api<{ rows: Row[]; years: { id: string; name: string }[] }>("/academics/classes", { query: { q: str(sp.q), status: str(sp.status) } });
  const yearOpts = years ?? [];
  const count = (x: unknown) => (x as { count: number }[] | null)?.[0]?.count ?? 0;

  return (
    <>
      <PageHeader
        title="Classes"
        description="Academic classes such as Standard 1–12. Batches and subjects belong to a class."
        actions={<ClassDialog years={yearOpts} trigger={<Button><Plus /> New class</Button>} />}
      />
      <FilterBar>
        <SearchInput placeholder="Search classes" />
        <SelectFilter
          param="status"
          label="Status"
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
      </FilterBar>
      <DataTable
        rows={rows ?? []}
        rowKey={(r) => r.id}
        empty={{
          title: "No classes yet",
          description: "Create your first class, e.g. Standard 10.",
          action: <ClassDialog years={yearOpts} trigger={<Button><Plus /> New class</Button>} />,
        }}
        columns={[
          {
            key: "name",
            header: "Class",
            cell: (r) => (
              <div>
                <div className="font-semibold text-foreground">{r.name}</div>
                {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
              </div>
            ),
          },
          {
            key: "year",
            header: "Academic session",
            hideOnMobile: true,
            cell: (r) => (
              <span className="text-xs font-medium text-muted-foreground">
                {r.academic_years?.name ?? "All sessions"}
              </span>
            ),
          },
          {
            key: "batches",
            header: "Batches",
            cell: (r) => {
              const bCount = count(r.batches);
              return (
                <Link
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  href={`/admin/batches?class=${r.id}`}
                >
                  <Layers className="size-3.5" />
                  {bCount} {bCount === 1 ? "batch" : "batches"}
                </Link>
              );
            },
          },
          {
            key: "subjects",
            header: "Subjects",
            hideOnMobile: true,
            cell: (r) => {
              const sCount = count(r.subjects);
              return (
                <Link
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                  href={`/admin/subjects?class=${r.id}`}
                >
                  <BookOpen className="size-3.5" />
                  {sCount} subjects
                </Link>
              );
            },
          },
          {
            key: "students",
            header: "Students",
            hideOnMobile: true,
            cell: (r) => {
              const stCount = count(r.students);
              return (
                <Link
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                  href={`/admin/students?class=${r.id}`}
                >
                  <Users className="size-3.5" />
                  {stCount} enrolled
                </Link>
              );
            },
          },
          {
            key: "status",
            header: "Status",
            cell: (r) => <StatusBadge status={r.status} />,
          },
          {
            key: "act",
            header: "",
            className: "text-right",
            cell: (r) => (
              <div className="flex items-center justify-end gap-1.5">
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/admin/batches/new" />}>
                  + Batch
                </Button>
                <ClassDialog years={yearOpts} value={r} trigger={<Button variant="ghost" size="sm">Edit</Button>} />
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
