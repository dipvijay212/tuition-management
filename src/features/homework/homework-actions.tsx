"use client";
import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteHomeworkAction } from "./actions";

export function DeleteHomeworkButton({ id, title }: { id: string; title: string }) {
  const [loading, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to delete homework "${title}"?`)) return;

    startTransition(async () => {
      const res = await deleteHomeworkAction(id);
      if (!res.ok) {
        toast.error(res.error || "Failed to delete homework");
        return;
      }
      toast.success(res.message || "Homework deleted");
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleDelete}
      disabled={loading}
      className="text-muted-foreground hover:text-destructive"
      title="Delete homework"
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </Button>
  );
}
