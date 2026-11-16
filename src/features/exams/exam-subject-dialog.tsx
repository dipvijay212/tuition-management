"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionForm, Field, NativeSelect } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { addExamSubject } from "./actions";

type Props = {
  examId: string;
  subjects: { id: string; name: string }[];
};

export function ExamSubjectDialog({ examId, subjects }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus /> Add subject</Button>} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add examination subject</DialogTitle>
          <DialogDescription>Add a subject to be tested with maximum and passing marks.</DialogDescription>
        </DialogHeader>
        <ActionForm action={addExamSubject} onSuccess={() => setOpen(false)}>
          {({ errors }) => (
            <>
              <input type="hidden" name="examination_id" value={examId} />
              <Field label="Subject" name="subject_id" required error={errors.subject_id}>
                <NativeSelect id="subject_id" name="subject_id" required defaultValue="">
                  <option value="" disabled>Select subject</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </NativeSelect>
              </Field>

              <Field label="Exam date" name="exam_date" error={errors.exam_date}>
                <Input id="exam_date" name="exam_date" type="date" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Max marks" name="max_marks" required error={errors.max_marks}>
                  <Input id="max_marks" name="max_marks" type="number" step="0.5" defaultValue="100" required />
                </Field>
                <Field label="Passing marks" name="passing_marks" required error={errors.passing_marks}>
                  <Input id="passing_marks" name="passing_marks" type="number" step="0.5" defaultValue="35" required />
                </Field>
              </div>

              <SubmitButton className="w-full">Add subject</SubmitButton>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

