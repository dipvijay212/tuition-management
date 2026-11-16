"use client";
import { useState, useTransition } from "react";
import { Loader2, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/shared/form";
import { createHomeworkAction } from "./actions";

type Props = {
  batches: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  trigger?: React.ReactElement;
  defaultBatchId?: string;
};

export function AssignHomeworkDialog({
  batches,
  subjects,
  trigger,
  defaultBatchId = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [batchId, setBatchId] = useState(defaultBatchId);
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Default due date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDueDate = tomorrow.toISOString().slice(0, 10);
  const [dueDate, setDueDate] = useState(defaultDueDate);

  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId) {
      toast.error("Please select a batch.");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a homework title.");
      return;
    }
    if (!dueDate) {
      toast.error("Please choose a due date.");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("batch_id", batchId);
      if (subjectId) fd.set("subject_id", subjectId);
      fd.set("title", title.trim());
      if (description.trim()) fd.set("description", description.trim());
      fd.set("due_date", dueDate);

      const res = await createHomeworkAction(fd);
      if (!res.ok) {
        toast.error(res.error || "Failed to assign homework");
        return;
      }

      toast.success(res.message || "Homework assigned successfully!");
      setOpen(false);
      setTitle("");
      setDescription("");
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <NotebookPen className="size-4 mr-1.5" /> Assign Homework
            </Button>
          )
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Homework</DialogTitle>
          <DialogDescription>
            Give class homework to students and set a due date for checking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <Field label="Batch" name="batch_id" required>
            <NativeSelect
              id="batch_id"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              required
            >
              <option value="" disabled>Select batch</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Subject (optional)" name="subject_id">
            <NativeSelect
              id="subject_id"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">(General / All Subjects)</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Homework Title" name="title" required>
            <Input
              id="title"
              placeholder="e.g. Math Ex 3.2 — Questions 1 to 10"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Field>

          <Field label="Instructions / Questions (optional)" name="description">
            <Textarea
              id="description"
              rows={2}
              placeholder="Optional notes: e.g. Solve neatly in homework notebook..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <Field label="Due Date" name="due_date" required>
            <Input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </Field>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !title.trim() || !batchId}>
              {pending ? <Loader2 className="animate-spin size-4 mr-2" /> : <NotebookPen className="size-4 mr-2" />}
              Assign Homework
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
