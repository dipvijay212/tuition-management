import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { familyTimetable } from "@/features/family/data";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { formatTime, DAYS } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "Children Timetable" };

export default async function ParentTimetablePage() {
  await requireRole("parent");
  const slots = await familyTimetable();

  return (
    <>
      <PageHeader
        title="Children Timetable"
        description="Weekly class schedule for your child's batches."
      />
      <DataTable
        rows={slots ?? []}
        rowKey={(r) => r.id}
        empty={{
          title: "No timetable found",
          description: "There are currently no active schedule slots for your child's batches.",
        }}
        columns={[
          {
            key: "day",
            header: "Day",
            cell: (r) => <span className="font-medium text-foreground">{DAYS[r.day_of_week]}</span>,
          },
          {
            key: "time",
            header: "Time",
            cell: (r) => `${formatTime(r.start_time)} – ${formatTime(r.end_time)}`,
          },
          {
            key: "batch",
            header: "Batch",
            cell: (r) => <span className="font-medium">{r.batches?.name}</span>,
          },
          {
            key: "subject",
            header: "Subject",
            cell: (r) => r.subjects?.name ?? "—",
          },
          {
            key: "teacher",
            header: "Teacher",
            cell: (r) => r.teachers?.full_name ?? "—",
          },
          {
            key: "room",
            header: "Room",
            cell: (r) => r.room ?? "—",
          },
        ]}
      />
    </>
  );
}

