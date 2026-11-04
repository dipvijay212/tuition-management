import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { BatchForm } from "@/features/batches/batch-form";
import { batchFormOptions } from "@/features/batches/load";

export const metadata: Metadata = { title: "Edit batch" };

export default async function EditBatchPage(props: PageProps<"/admin/batches/[id]/edit">) {
  await requireRole("admin");
  const { id } = await props.params;
  const supabase = await createClient();
  const [{ data: b }, opts] = await Promise.all([
    supabase.from("batches").select("*, teacher_batches(teacher_id, is_active), batch_subjects(subject_id)").eq("id", id).maybeSingle(),
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
