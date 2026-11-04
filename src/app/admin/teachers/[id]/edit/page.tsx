import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { TeacherForm } from "@/features/teachers/teacher-form";

export const metadata: Metadata = { title: "Edit teacher" };

export default async function EditTeacherPage(props: PageProps<"/admin/teachers/[id]/edit">) {
  await requireRole("admin");
  const { id } = await props.params;
  const supabase = await createClient();
  const [{ data: teacher }, { data: subjects }] = await Promise.all([
    supabase.from("teachers").select("*").eq("id", id).maybeSingle(),
    supabase.from("subjects").select("id, name, code").eq("status", "active").order("name"),
  ]);
  if (!teacher) notFound();
  return (
    <div className="max-w-4xl">
      <PageHeader title={`Edit ${teacher.full_name}`} back={{ href: `/admin/teachers/${id}`, label: "Teacher profile" }} />
      <TeacherForm teacher={teacher} subjects={subjects ?? []} />
    </div>
  );
}
