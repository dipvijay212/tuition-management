import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { Tables } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { FilterBar, SearchInput, SelectFilter } from "@/components/shared/filters";
import { UploadMaterialDialog } from "@/features/materials/upload-dialog";
import { MaterialDownloadButton, DeleteMaterialButton } from "@/features/materials/material-actions";
import { formatDate } from "@/lib/utilities/format";
import { pageParams, str } from "@/lib/utilities/query";

export const metadata: Metadata = { title: "Study Materials & Notes" };

export default async function AdminMaterialsPage(props: PageProps<"/admin/materials">) {
  await requireRole("admin");
  const sp = await props.searchParams;
  const { page, pageSize } = pageParams(sp);

  const selectedClass = str(sp.class);
  const selectedBatch = str(sp.batch);
  const selectedSubject = str(sp.subject);
  const searchQ = str(sp.q);
  type MatRow = Pick<Tables<"study_materials">, "id" | "title" | "description" | "file_path" | "mime_type" | "size_bytes" | "visibility" | "is_active" | "created_at"> & {
    classes: { id: string; name: string } | null;
    batches: { id: string; name: string } | null;
    subjects: { id: string; name: string } | null;
    profiles: { full_name: string } | null;
  };
  const { rows: materials, count, classes, batches, subjects } = await api<{
    rows: MatRow[];
    count: number;
    classes: { id: string; name: string }[];
    batches: { id: string; name: string; class_id: string }[];
    subjects: { id: string; name: string; class_id: string | null }[];
  }>("/learning/materials", { query: { page, pageSize, q: searchQ, class: selectedClass, batch: selectedBatch, subject: selectedSubject } });

  const uploadBtn = (
    <UploadMaterialDialog
      classes={classes ?? []}
      batches={batches ?? []}
      subjects={subjects ?? []}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Study Materials & Notes"
        description="Upload and organize notes, formula sheets, and worksheets for your students."
        actions={uploadBtn}
      />

      <FilterBar>
        <SearchInput placeholder="Search materials by title..." />
        <SelectFilter
          param="class"
          label="Class"
          options={(classes ?? []).map((c) => ({ value: c.id, label: c.name }))}
        />
        <SelectFilter
          param="batch"
          label="Batch"
          options={(batches ?? []).map((b) => ({ value: b.id, label: b.name }))}
        />
        <SelectFilter
          param="subject"
          label="Subject"
          options={(subjects ?? []).map((s) => ({ value: s.id, label: s.name }))}
        />
      </FilterBar>

      <DataTable
        rows={materials ?? []}
        rowKey={(r) => r.id}
        total={count ?? 0}
        page={page}
        pageSize={pageSize}
        empty={{
          title: "No study materials uploaded yet",
          description: "Upload PDFs, formula sheets, or revision worksheets for your students.",
          action: uploadBtn,
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
            header: "Class / Batch",
            cell: (r) => (
              <div className="text-sm">
                <span className="font-medium text-foreground">{r.classes?.name ?? "All Classes"}</span>
                <div className="text-xs text-muted-foreground">{r.batches?.name ?? "All Batches"}</div>
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
            header: "Uploaded",
            cell: (r) => (
              <div className="text-xs text-muted-foreground">
                <div className="font-medium text-foreground">{formatDate(r.created_at)}</div>
                <div>{r.profiles?.full_name ?? "Admin"}</div>
              </div>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            cell: (r) => (
              <div className="flex items-center justify-end gap-1">
                <MaterialDownloadButton filePath={r.file_path} fileName={r.title} />
                <DeleteMaterialButton id={r.id} title={r.title} />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
