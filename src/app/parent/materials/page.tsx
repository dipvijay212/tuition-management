import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { MaterialDownloadButton } from "@/features/materials/material-actions";
import { formatDate } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "Study Materials & Notes" };

export default async function ParentMaterialsPage() {
  await requireRole("parent");
  const supabase = await createClient();

  // Find linked children
  const { data: links } = await supabase
    .from("parent_students")
    .select("student_id, students(id, class_id, full_name, student_batches(batch_id, status))");

  const students = (links ?? []).map((l) => l.students).filter(Boolean);
  const classIds = Array.from(new Set(students.map((s) => s!.class_id).filter(Boolean))) as string[];
  const batchIds = Array.from(
    new Set(
      students.flatMap((s) =>
        (s!.student_batches ?? []).filter((sb) => sb.status === "active").map((sb) => sb.batch_id)
      )
    )
  );

  let q = supabase
    .from("study_materials")
    .select(
      "id, title, description, file_path, mime_type, size_bytes, created_at, classes(name), batches(name), subjects(name)"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (classIds.length > 0 && batchIds.length > 0) {
    q = q.or(`class_id.in.(${classIds.join(",")}),batch_id.in.(${batchIds.join(",")})`);
  } else if (classIds.length > 0) {
    q = q.in("class_id", classIds);
  }

  const { data: materials, error } = await q;
  if (error) throw error;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Study Materials & Notes"
        description="Download study notes, formula sheets, and practice worksheets for your children."
      />

      <DataTable
        rows={materials ?? []}
        rowKey={(r) => r.id}
        empty={{
          title: "No study materials available yet",
          description: "Materials uploaded by teachers for your child's classes will appear here.",
        }}
        columns={[
          {
            key: "title",
            header: "Material Title",
            cell: (r) => (
              <div className="space-y-0.5">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="size-4 text-primary shrink-0" />
                  <span>{r.title}</span>
                </div>
                {r.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{r.description}</p>
                )}
              </div>
            ),
          },
          {
            key: "class_batch",
            header: "For",
            cell: (r) => (
              <div className="text-sm">
                <span className="font-medium text-foreground">{r.classes?.name ?? "Class"}</span>
                {r.batches?.name && (
                  <span className="text-xs text-muted-foreground ml-1">({r.batches.name})</span>
                )}
              </div>
            ),
          },
          {
            key: "subject",
            header: "Subject",
            cell: (r) => (
              <span className="text-sm font-medium">{r.subjects?.name ?? "General"}</span>
            ),
          },
          {
            key: "size",
            header: "File Details",
            cell: (r) => {
              const mb = r.size_bytes ? (r.size_bytes / (1024 * 1024)).toFixed(1) : null;
              const ext = r.file_path.split(".").pop()?.toUpperCase() ?? "FILE";
              return (
                <div className="text-xs text-muted-foreground font-medium">
                  <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground mr-1.5">
                    {ext}
                  </span>
                  {mb ? `${mb} MB` : "—"}
                </div>
              );
            },
          },
          {
            key: "date",
            header: "Date Added",
            cell: (r) => (
              <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
            ),
          },
          {
            key: "action",
            header: "",
            className: "text-right",
            cell: (r) => (
              <MaterialDownloadButton filePath={r.file_path} fileName={r.title} />
            ),
          },
        ]}
      />
    </div>
  );
}
