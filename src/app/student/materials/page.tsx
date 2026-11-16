import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { MaterialDownloadButton } from "@/features/materials/material-actions";
import { formatDate } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "Study Materials & Notes" };

export default async function StudentMaterialsPage() {
  const session = await requireRole("student");
  const supabase = await createClient();

  if (!session.institute) {
    return (
      <div className="space-y-4">
        <PageHeader title="Study Materials & Notes" description="Download notes and worksheets." />
        <p className="text-sm text-muted-foreground">Institute not configured.</p>
      </div>
    );
  }

  // Find student ID, class, and active batch enrolments
  const { data: student } = await supabase
    .from("students")
    .select("id, class_id, student_batches(batch_id, status)")
    .eq("profile_id", session.userId)
    .eq("institute_id", session.institute.id)
    .limit(1)
    .maybeSingle();

  if (!student) {
    return (
      <div className="space-y-4">
        <PageHeader title="Study Materials & Notes" description="Download notes and worksheets." />
        <p className="text-sm text-muted-foreground">Student record not found.</p>
      </div>
    );
  }

  const activeBatchIds = (student.student_batches ?? [])
    .filter((b) => b.status === "active")
    .map((b) => b.batch_id);

  let q = supabase
    .from("study_materials")
    .select(
      "id, title, description, file_path, mime_type, size_bytes, created_at, classes(name), batches(name), subjects(name)"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (student.class_id && activeBatchIds.length > 0) {
    q = q.or(`class_id.eq.${student.class_id},batch_id.in.(${activeBatchIds.join(",")})`);
  } else if (student.class_id) {
    q = q.eq("class_id", student.class_id);
  }

  const { data: materials, error } = await q;
  if (error) throw error;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Study Materials & Notes"
        description="Download your chapter notes, formula sheets, and practice worksheets."
      />

      <DataTable
        rows={materials ?? []}
        rowKey={(r) => r.id}
        empty={{
          title: "No study materials available yet",
          description: "Your teachers will upload study notes and revision sheets here.",
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
