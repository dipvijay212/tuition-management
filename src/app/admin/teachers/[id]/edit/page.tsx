import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { TeacherForm } from "@/features/teachers/teacher-form";

export const metadata: Metadata = { title: "Edit teacher" };

export default async function EditTeacherPage(props: PageProps<"/admin/teachers/[id]/edit">) {
  await requireRole("admin");
  const { id } = await props.params;
  const [r, subjects] = await Promise.all([
    api<{ teacher: Tables<"teachers"> | null }>(`/teachers/${encodeURIComponent(id)}`).catch(() => ({ teacher: null })),
    api<{ id: string; name: string; code: string | null }[]>("/teachers/subject-options"),
  ]);
  const teacher = r.teacher;
  if (!teacher) notFound();
  return (
    <div className="max-w-4xl">
      <PageHeader title={`Edit ${teacher.full_name}`} back={{ href: `/admin/teachers/${id}`, label: "Teacher profile" }} />
      <TeacherForm teacher={teacher} subjects={subjects ?? []} />
    </div>
  );
}
