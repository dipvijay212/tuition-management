import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { StudentEditForm } from "@/features/students/edit-form";

export const metadata: Metadata = { title: "Edit student" };

export default async function EditStudentPage(props: PageProps<"/admin/students/[id]/edit">) {
  await requireRole("admin");
  const { id } = await props.params;
  type G = Pick<Tables<"guardians">, "id" | "full_name" | "phone" | "alt_phone" | "email">;
  const { student: s, classes, subjects, guardians } = await api<{ student: Tables<"students"> | null; classes: { id: string; name: string }[]; subjects: { id: string; name: string; class_id: string | null }[]; guardians: G[] }>(
    `/students/${encodeURIComponent(id)}/edit-data`,
  ).catch(() => ({ student: null, classes: [], subjects: [], guardians: [] as G[] }));
  if (!s) notFound();
  return (
    <div className="max-w-4xl">
      <PageHeader title={`Edit ${s.full_name}`} back={{ href: `/admin/students/${id}`, label: "Student profile" }} />
      <StudentEditForm s={s} classes={classes ?? []} subjects={subjects ?? []} guardians={guardians} />
    </div>
  );
}
