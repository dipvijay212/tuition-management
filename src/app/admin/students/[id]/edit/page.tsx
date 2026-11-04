import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { StudentEditForm } from "@/features/students/edit-form";

export const metadata: Metadata = { title: "Edit student" };

export default async function EditStudentPage(props: PageProps<"/admin/students/[id]/edit">) {
  await requireRole("admin");
  const { id } = await props.params;
  const supabase = await createClient();
  const [{ data: s }, { data: classes }, { data: subjects }, { data: links }] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).maybeSingle(),
    supabase.from("classes").select("id, name").order("sort_order").order("name"),
    supabase.from("subjects").select("id, name, class_id").eq("status", "active").order("name"),
    supabase.from("parent_students").select("guardians(id, full_name, phone, alt_phone, email)").eq("student_id", id),
  ]);
  if (!s) notFound();
  return (
    <div className="max-w-4xl">
      <PageHeader title={`Edit ${s.full_name}`} back={{ href: `/admin/students/${id}`, label: "Student profile" }} />
      <StudentEditForm s={s} classes={classes ?? []} subjects={subjects ?? []} guardians={(links ?? []).map((l) => l.guardians!).filter(Boolean)} />
    </div>
  );
}
