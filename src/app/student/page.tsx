import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { myStudent } from "@/features/family/data";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { FamilyDashboard } from "@/features/family/family-dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function StudentDashboard() {
  const ctx = await requireRole("student");
  const me = await myStudent();
  return (
    <>
      <PageHeader title={`Hi, ${ctx.profile.full_name.split(" ")[0]}`} description="Your attendance, fees, homework and results at a glance." />
      {me ? <FamilyDashboard studentId={me.id} base="/student" timezone={ctx.timezone} /> : <EmptyState title="Your login isn't linked to a student record" description="Please contact the institute office." />}
    </>
  );
}
