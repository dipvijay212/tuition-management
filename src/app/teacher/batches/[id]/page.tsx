import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { formatDate, formatTime, DAYS } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "Batch" };

export default async function TeacherBatchPage(props: PageProps<"/teacher/batches/[id]">) {
  await requireRole("teacher");
  const { id } = await props.params;
  const supabase = await createClient();
  // RLS: only students in this teacher's batches are returned.
  const { data: tb } = await supabase.from("teacher_batches").select("id").eq("batch_id", id).eq("is_active", true).maybeSingle();
  if (!tb) notFound();
  const [{ data: b }, { data: rows }] = await Promise.all([
    supabase.from("batches").select("name, class_days, start_time, end_time, room, classes(name)").eq("id", id).single(),
    supabase.from("student_batches").select("id, start_date, students(id, full_name, admission_no, phone)").eq("batch_id", id).eq("status", "active").order("start_date"),
  ]);
  if (!b) notFound();
  return (
    <>
      <PageHeader title={b.name} description={`${b.classes?.name} · ${b.class_days.map((d) => DAYS[d]).join(", ")} · ${formatTime(b.start_time)}–${formatTime(b.end_time)}${b.room ? ` · Room ${b.room}` : ""}`} back={{ href: "/teacher/batches", label: "My batches" }} />
      <DataTable rows={(rows ?? []).sort((a, z) => (a.students?.full_name ?? "").localeCompare(z.students?.full_name ?? ""))} rowKey={(r) => r.id} empty={{ title: "No students in this batch yet" }}
        columns={[
          { key: "n", header: "Student", cell: (r) => <span className="font-medium">{r.students?.full_name}</span> },
          { key: "a", header: "Admission no.", cell: (r) => r.students?.admission_no },
          { key: "s", header: "Since", hideOnMobile: true, cell: (r) => formatDate(r.start_date) },
        ]} />
    </>
  );
}
