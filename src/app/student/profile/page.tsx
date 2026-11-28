import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { myStudent } from "@/features/family/data";
import { PageHeader } from "@/components/shared/page-header";
import { AccountCard } from "@/features/profile/account-card";
import { StudentDetails } from "@/features/family/student-details";

export const metadata: Metadata = { title: "My profile" };

export default async function StudentProfile() {
  const ctx = await requireRole("student");
  const me = await myStudent();
  return (
    <>
      <PageHeader title="My profile" />
      <div className="space-y-6">
        {me && <StudentDetails studentId={me.id} />}
        <AccountCard
          name={ctx.profile.full_name}
          email={ctx.profile.email}
          phone={ctx.profile.phone}
          role="student"
          instituteName={ctx.institute?.name}
        />
      </div>
    </>
  );
}
