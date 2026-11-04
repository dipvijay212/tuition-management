import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { StudentDetails } from "@/features/family/student-details";
import { myChildren } from "@/features/family/children";

export const metadata: Metadata = { title: "My children" };

export default async function ChildrenPage() {
  await requireRole("parent");
  const kids = await myChildren();
  return (
    <>
      <PageHeader title="My children" description="Profiles of children linked to your account." />
      {kids.length === 0 ? <EmptyState title="No children linked" /> : <div className="space-y-6">{kids.map((k) => <StudentDetails key={k.id} studentId={k.id} />)}</div>}
    </>
  );
}
