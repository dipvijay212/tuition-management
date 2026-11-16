import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { formatDate, formatTime, DAYS } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "Batch" };

export default async function TeacherBatchPage(props: PageProps<"/teacher/batches/[id]">) {
  await requireRole("teacher");
  const { id } = await props.params;
  // The backend only returns batches this teacher is assigned to.
  type Batch = Pick<Tables<"batches">, "name" | "class_days" | "start_time" | "end_time" | "room"> & { classes: { name: string } | null };
  type Row = { id: string; start_date: string; students: Pick<Tables<"students">, "id" | "full_name" | "admission_no" | "phone"> | null };
  const { batch: b, rows } = await api<{ batch: Batch | null; rows: Row[] }>(`/batches/mine/${encodeURIComponent(id)}`).catch(() => ({ batch: null, rows: [] as Row[] }));
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
