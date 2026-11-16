import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { familyTimetable } from "@/features/family/data";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { formatTime, DAYS } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "Class Timetable" };

export default async function StudentTimetablePage() {
  await requireRole("student");
  const slots = await familyTimetable();

  return (
    <>
      <PageHeader
        title="Class Timetable"
        description="Your weekly schedule for your enrolled batch."
      />
      <DataTable
        rows={slots ?? []}
        rowKey={(r) => r.id}
        empty={{
          title: "No classes scheduled",
          description: "There are currently no active schedule slots for your batch.",
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

