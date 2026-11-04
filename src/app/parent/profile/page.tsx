import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { AccountCard } from "@/features/profile/account-card";

export const metadata: Metadata = { title: "Profile" };

export default async function ParentProfile() {
  const ctx = await requireRole("parent");
  return (
    <>
      <PageHeader title="My profile" />
      <AccountCard name={ctx.profile.full_name} email={ctx.profile.email} phone={ctx.profile.phone} />
    </>
  );
}
