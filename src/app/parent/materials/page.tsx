import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { familyMaterials } from "@/features/family/data";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { MaterialDownloadButton } from "@/features/materials/material-actions";
import { formatDate } from "@/lib/utilities/format";

export const metadata: Metadata = { title: "Study Materials & Notes" };

export default async function ParentMaterialsPage() {
  await requireRole("parent");
  const materials = await familyMaterials();

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
