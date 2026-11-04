import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/states";
import { FamilyDashboard } from "@/features/family/family-dashboard";
import { myChildren } from "@/features/family/children";
import { cn } from "@/lib/utils";
import { str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "Dashboard" };

export default async function ParentDashboard(props: PageProps<"/parent">) {
  const ctx = await requireRole("parent");
  const sp = await props.searchParams;
  const kids = await myChildren();
  if (!kids.length) return <><PageHeader title="Dashboard" /><EmptyState title="No children linked" description="Please ask the institute to link your child to your account." /></>;
  const selected = kids.find((k) => k.id === str(sp.child)) ?? kids[0];
  return (
    <>
      <PageHeader title={`Hello, ${ctx.profile.full_name.split(" ")[0]}`} description="Your child's progress at a glance." />
      {kids.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Select child">
          {kids.map((k) => <Link key={k.id} href={`/parent?child=${k.id}`} role="tab" aria-selected={k.id === selected.id} className={cn("rounded-full border px-4 py-1.5 text-sm", k.id === selected.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>{k.full_name}</Link>)}
        </div>
      )}
      <FamilyDashboard studentId={selected.id} base="/parent" timezone={ctx.timezone} showName />
    </>
  );
}
