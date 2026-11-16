import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { formatTime, DAYS } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "My Timetable" };

export default async function TeacherTimetablePage() {
  await requireRole("teacher");
  const supabase = await createClient();

  const { data: slots, error } = await supabase
    .from("timetable")
    .select("id, day_of_week, start_time, end_time, room, batches(name), subjects(name)")
    .eq("is_active", true)
    .order("day_of_week")
    .order("start_time");

  if (error) throw error;

  return (
    <>
      <PageHeader
        title="My Timetable"
        description="Your scheduled classes and timings across assigned batches."
      />
      <DataTable
        rows={slots ?? []}
        rowKey={(r) => r.id}
        empty={{
          title: "No classes scheduled",
          description: "No recurring slots have been assigned to your batches yet.",
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
            key: "room",
            header: "Room",
            cell: (r) => r.room ?? "—",
          },
        ]}
      />
    </>
  );
}

