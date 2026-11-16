import type { Metadata } from "next";
import Link from "next/link";
import { Plus, CalendarCheck, Users, Settings2 } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { FilterBar, SearchInput, SelectFilter } from "@/components/shared/filters";
import { Button } from "@/components/ui/button";
import { formatTime, DAYS } from "@/lib/utilities/format";
import { pageParams, str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "Batches" };

export default async function BatchesPage(props: PageProps<"/admin/batches">) {
  await requireRole("admin");
  const sp = await props.searchParams;
  const { page, pageSize } = pageParams(sp);
  type Row = Pick<Tables<"batches">, "id" | "name" | "capacity" | "room" | "status" | "class_days" | "start_time" | "end_time"> & {
    classes: { name: string } | null;
    teacher_batches: { is_active: boolean; teachers: { full_name: string } | null }[];
    student_batches: { status: string }[];
  };
  const { rows: data, count, classes } = await api<{ rows: Row[]; count: number; classes: { id: string; name: string }[] }>("/batches", {
    query: { page, pageSize, q: str(sp.q), class: str(sp.class), status: str(sp.status) },
  });
  const newBtn = (
    <Button nativeButton={false} render={<Link href="/admin/batches/new" />}>
      <Plus /> New batch
    </Button>
  );

  return (
    <>
      <PageHeader title="Batches" description="Groups of students who attend classes together." actions={newBtn} />
      <FilterBar>
        <SearchInput placeholder="Search batches" />
        <SelectFilter param="class" label="Class" options={(classes ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        <SelectFilter param="status" label="Status" options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
      </FilterBar>
      <DataTable
        rows={data ?? []}
        rowKey={(r) => r.id}
        total={count ?? 0}
        page={page}
        pageSize={pageSize}
        empty={{ title: "No batches found", description: "Create a batch and assign teachers and students.", action: newBtn }}
        columns={[
          {
            key: "name",
            header: "Batch",
            cell: (r) => (
              <Link href={`/admin/batches/${r.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                {r.name}
                <div className="text-xs font-normal text-muted-foreground">{r.classes?.name}</div>
              </Link>
            ),
          },
          {
            key: "schedule",
            header: "Schedule",
            hideOnMobile: true,
            cell: (r) => (
              <span className="text-sm">
                {r.class_days.map((d) => DAYS[d]).join(", ")}
                <br />
                <span className="text-muted-foreground text-xs">
                  {formatTime(r.start_time)} – {formatTime(r.end_time)}
                </span>
              </span>
            ),
          },
          {
            key: "teachers",
            header: "Teachers",
            hideOnMobile: true,
            cell: (r) =>
              r.teacher_batches
                .filter((t) => t.is_active)
                .map((t) => t.teachers?.full_name)
                .join(", ") || "—",
          },
          {
            key: "students",
            header: "Students",
            cell: (r) => {
              const n = r.student_batches.filter((s) => s.status === "active").length;
              return (
                <Link
                  href={`/admin/students?batch=${r.id}`}
                  className={`inline-flex items-center gap-1 text-sm font-medium hover:underline ${
                    r.capacity && n >= r.capacity ? "text-destructive" : "text-foreground"
                  }`}
                >
                  <Users className="size-3.5 text-muted-foreground" />
                  {n}
                  {r.capacity ? ` / ${r.capacity}` : ""}
                </Link>
              );
            },
          },
          {
            key: "room",
            header: "Room",
            hideOnMobile: true,
            cell: (r) => r.room ?? "—",
          },
          {
            key: "status",
            header: "Status",
            cell: (r) => <StatusBadge status={r.status} />,
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            cell: (r) => (
              <div className="flex items-center justify-end gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/admin/attendance?batch=${r.id}`} />}
                  title="Mark attendance for this batch"
                >
                  <CalendarCheck className="size-3.5" /> Attendance
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/admin/batches/${r.id}`} />}
                >
                  <Settings2 className="size-3.5" /> Manage
                </Button>
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
