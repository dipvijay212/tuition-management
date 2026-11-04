import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { BatchForm } from "@/features/batches/batch-form";
import { batchFormOptions } from "@/features/batches/load";

export const metadata: Metadata = { title: "New batch" };

export default async function NewBatchPage() {
  await requireRole("admin");
  const opts = await batchFormOptions();
  return (
    <div className="max-w-4xl">
      <PageHeader title="New batch" back={{ href: "/admin/batches", label: "Batches" }} />
      <BatchForm {...opts} />
    </div>
  );
}
