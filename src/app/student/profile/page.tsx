import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { AccountCard } from "@/features/profile/account-card";
import { StudentDetails } from "@/features/family/student-details";

export const metadata: Metadata = { title: "My profile" };

export default async function StudentProfile() {
  const ctx = await requireRole("student");
  const supabase = await createClient();
  const { data: me } = await supabase.from("students").select("id").eq("profile_id", ctx.userId).maybeSingle();
  return (
    <>
      <PageHeader title="My profile" />
      <div className="space-y-6">
        {me && <StudentDetails studentId={me.id} />}
        <AccountCard name={ctx.profile.full_name} email={ctx.profile.email} phone={ctx.profile.phone} />
      </div>
    </>
  );
}
