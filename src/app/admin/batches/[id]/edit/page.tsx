import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { BatchForm } from "@/features/batches/batch-form";
import { batchFormOptions } from "@/features/batches/load";

export const metadata: Metadata = { title: "Edit batch" };

export default async function EditBatchPage(props: PageProps<"/admin/batches/[id]/edit">) {
  await requireRole("admin");
  const { id } = await props.params;
  type Batch = Tables<"batches"> & { teacher_batches: { teacher_id: string; is_active: boolean }[]; batch_subjects: { subject_id: string }[] };
  const [{ batch: b }, opts] = await Promise.all([
    api<{ batch: Batch | null }>(`/batches/${encodeURIComponent(id)}`).catch(() => ({ batch: null })),
    batchFormOptions(),
  ]);
  if (!b) notFound();
  const value = { ...b, teacher_ids: b.teacher_batches.filter((t) => t.is_active).map((t) => t.teacher_id), subject_ids: b.batch_subjects.map((s) => s.subject_id) };
  return (
    <div className="max-w-4xl">
      <PageHeader title={`Edit ${b.name}`} back={{ href: `/admin/batches/${id}`, label: "Batch" }} />
      <BatchForm batch={value} {...opts} />
    </div>
  );
}
