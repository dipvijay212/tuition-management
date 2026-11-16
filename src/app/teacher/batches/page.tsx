import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatTime, DAYS } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "My batches" };

export default async function TeacherBatches() {
  await requireRole("teacher");
  type Row = Pick<Tables<"batches">, "id" | "name" | "room" | "status" | "class_days" | "start_time" | "end_time" | "capacity"> & {
    classes: { name: string } | null;
    student_batches: { status: string }[];
    batch_subjects: { subjects: { name: string } | null }[];
  };
  const data = await api<Row[]>("/batches/mine/list");
  return (
    <>
      <PageHeader title="My batches" description="Batches assigned to you by the institute." />
      <DataTable rows={data ?? []} rowKey={(r) => r.id} empty={{ title: "No batches assigned", description: "The admin will assign batches to you." }}
        columns={[
          { key: "n", header: "Batch", cell: (r) => <Link href={`/teacher/batches/${r.id}`} className="font-medium hover:text-primary">{r.name}<div className="text-xs font-normal text-muted-foreground">{r.classes?.name}</div></Link> },
          { key: "s", header: "Schedule", cell: (r) => <span className="text-sm">{r.class_days.map((d) => DAYS[d]).join(", ")}<br /><span className="text-muted-foreground">{formatTime(r.start_time)} – {formatTime(r.end_time)}</span></span> },
          { key: "sub", header: "Subjects", hideOnMobile: true, cell: (r) => r.batch_subjects.map((x) => x.subjects?.name).join(", ") || "—" },
          { key: "st", header: "Students", cell: (r) => r.student_batches.filter((x) => x.status === "active").length },
          { key: "r", header: "Room", hideOnMobile: true, cell: (r) => r.room ?? "—" },
          { key: "x", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
        ]} />
    </>
  );
}
