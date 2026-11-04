import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { TeacherForm } from "@/features/teachers/teacher-form";

export const metadata: Metadata = { title: "Add teacher" };

export default async function NewTeacherPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: subjects } = await supabase.from("subjects").select("id, name, code").eq("status", "active").order("name");
  return (
    <div className="max-w-4xl">
      <PageHeader title="Add teacher" back={{ href: "/admin/teachers", label: "Teachers" }} />
      <TeacherForm subjects={subjects ?? []} />
    </div>
  );
}
