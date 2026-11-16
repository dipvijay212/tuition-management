"use client";
import { useState, useTransition } from "react";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/shared/form";
import { uploadStudyMaterialAction } from "./actions";

type Props = {
  classes: { id: string; name: string }[];
  batches: { id: string; name: string; class_id: string }[];
  subjects: { id: string; name: string; class_id: string | null }[];
  trigger?: React.ReactElement;
  defaultClassId?: string;
  defaultBatchId?: string;
};

export function UploadMaterialDialog({
  classes,
  batches,
  subjects,
  trigger,
  defaultClassId = "",
  defaultBatchId = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState(defaultClassId);
  const [batchId, setBatchId] = useState(defaultBatchId);
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredBatches = classId ? batches.filter((b) => b.class_id === classId) : batches;
  const filteredSubjects = classId ? subjects.filter((s) => !s.class_id || s.class_id === classId) : subjects;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a material title.");
      return;
    }
    if (!classId && !batchId) {
      toast.error("Please select a target class.");
      return;
    }
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", title.trim());
      if (description.trim()) fd.set("description", description.trim());
      if (classId) fd.set("class_id", classId);
      if (batchId) fd.set("batch_id", batchId);
      if (subjectId) fd.set("subject_id", subjectId);
      fd.set("file", file);

      const res = await uploadStudyMaterialAction(fd);
      if (!res.ok) {
        toast.error(res.error || "Upload failed");
        return;
      }

      toast.success(res.message || "Material uploaded successfully!");
      setOpen(false);
      setTitle("");
      setDescription("");
      setFile(null);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <Upload className="size-4 mr-1.5" /> Upload Material
            </Button>
          )
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Study Material / Notes</DialogTitle>
          <DialogDescription>
            Share PDF notes, formula sheets, or practice worksheets with your students.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <Field label="Material Title" name="title" required>
            <Input
              id="title"
              placeholder="e.g. Chapter 3 Trigonometry Formula Sheet"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Class" name="class_id" required>
              <NativeSelect
                id="class_id"
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setBatchId("");
                }}
                required
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Batch (optional)" name="batch_id" hint="Leave blank for entire class">
              <NativeSelect
                id="batch_id"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
              >
                <option value="">(All Batches in Class)</option>
                {filteredBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <Field label="Subject (optional)" name="subject_id">
            <NativeSelect
              id="subject_id"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">(General / All Subjects)</option>
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Description / Instructions (optional)" name="description">
            <Textarea
              id="description"
              rows={2}
              placeholder="Brief summary or instructions for students..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <Field label="Upload File (PDF, DOCX, Image, Worksheet)" name="file" required>
            <Input
              id="file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx,.txt"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Supports PDF, Word, PowerPoint, Images up to 25 MB.
            </p>
          </Field>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !title.trim() || !file}>
              {pending ? <Loader2 className="animate-spin size-4 mr-2" /> : <Upload className="size-4 mr-2" />}
              Upload Material
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
