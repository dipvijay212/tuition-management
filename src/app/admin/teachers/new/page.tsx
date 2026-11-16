import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import { PageHeader } from "@/components/shared/page-header";
import { TeacherForm } from "@/features/teachers/teacher-form";

export const metadata: Metadata = { title: "Add teacher" };

export default async function NewTeacherPage() {
  await requireRole("admin");
  const subjects = await api<{ id: string; name: string; code: string | null }[]>("/teachers/subject-options");
  return (
    <div className="max-w-4xl">
      <PageHeader title="Add teacher" back={{ href: "/admin/teachers", label: "Teachers" }} />
      <TeacherForm subjects={subjects ?? []} />
    </div>
  );
}
