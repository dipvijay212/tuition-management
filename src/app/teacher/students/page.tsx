import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FilterBar, SearchInput } from "@/components/shared/filters";
import { pageParams, str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "My students" };

export default async function TeacherStudents(props: PageProps<"/teacher/students">) {
  await requireRole("teacher");
  const sp = await props.searchParams;
  const { page, pageSize } = pageParams(sp);
  // The backend limits this to students actively enrolled in the teacher's batches.
  type Row = { id: string; full_name: string; admission_no: string; classes: { name: string } | null; student_batches: { status: string; batches: { name: string } | null }[] };
  const { rows: data, count } = await api<{ rows: Row[]; count: number }>("/dashboard/teacher/students", { query: { page, pageSize, q: str(sp.q) } });
  return (
    <>
      <PageHeader title="My students" description="Students enrolled in your batches." />
      <FilterBar><SearchInput placeholder="Search name or admission no." /></FilterBar>
      <DataTable rows={data ?? []} rowKey={(r) => r.id} total={count ?? 0} page={page} pageSize={pageSize} empty={{ title: "No students found" }}
        columns={[
          { key: "n", header: "Student", cell: (r) => <span className="font-medium">{r.full_name}</span> },
          { key: "a", header: "Admission no.", cell: (r) => r.admission_no },
          { key: "c", header: "Class", hideOnMobile: true, cell: (r) => r.classes?.name ?? "—" },
          { key: "b", header: "Batches", cell: (r) => r.student_batches.filter((x) => x.status === "active").map((x) => x.batches?.name).join(", ") },
        ]} />
    </>
  );
}
