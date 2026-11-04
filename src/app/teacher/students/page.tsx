import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FilterBar, SearchInput } from "@/components/shared/filters";
import { likeTerm, pageParams, str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "My students" };

export default async function TeacherStudents(props: PageProps<"/teacher/students">) {
  await requireRole("teacher");
  const sp = await props.searchParams;
  const { page, pageSize, from, to } = pageParams(sp);
  const supabase = await createClient();
  // RLS limits this to students actively enrolled in the teacher's batches.
  let q = supabase.from("students").select("id, full_name, admission_no, classes(name), student_batches(status, batches(name))", { count: "exact" }).eq("status", "active").order("full_name").range(from, to);
  if (str(sp.q)) { const t = likeTerm(str(sp.q)!); q = q.or(`full_name.ilike.${t},admission_no.ilike.${t}`); }
  const { data, count, error } = await q;
  if (error) throw error;
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
