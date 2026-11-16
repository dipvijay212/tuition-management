"use client";
import { useTransition } from "react";
import { Download, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteStudyMaterialAction, getMaterialSignedUrlAction } from "./actions";

export function MaterialDownloadButton({ filePath }: { filePath: string; fileName?: string }) {
  const [loading, startTransition] = useTransition();

  const handleDownload = () => {
    startTransition(async () => {
      const res = await getMaterialSignedUrlAction(filePath);
      if (!res.ok) {
        toast.error(res.error || "Failed to download material");
        return;
      }
      if (res.data) {
        window.open(res.data, "_blank");
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={loading}
      className="text-xs font-semibold gap-1.5"
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
      Download
    </Button>
  );
}

export function DeleteMaterialButton({ id, title }: { id: string; title: string }) {
  const [loading, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    startTransition(async () => {
      const res = await deleteStudyMaterialAction(id);
      if (!res.ok) {
        toast.error(res.error || "Failed to delete material");
        return;
      }
      toast.success(res.message || "Material deleted");
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleDelete}
      disabled={loading}
      className="text-muted-foreground hover:text-destructive"
      title="Delete material"
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </Button>
  );
}
