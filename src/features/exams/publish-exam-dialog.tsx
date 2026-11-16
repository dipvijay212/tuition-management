"use client";
import { useState } from "react";
import { Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionForm, Field } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { publishExamAction } from "./actions";

export function PublishExamDialog({ examId, examName }: { examId: string; examName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="default"><Trophy className="mr-1.5 size-4" /> Publish Results</Button>} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Publish Examination Results</DialogTitle>
          <DialogDescription>
            This will calculate totals, grades, ranks, and percentages for {examName}, making them visible to students and parents.
          </DialogDescription>
        </DialogHeader>
        <ActionForm action={publishExamAction} onSuccess={() => setOpen(false)}>
          {() => (
            <>
              <input type="hidden" name="exam_id" value={examId} />
              <Field label="Publish note or reason (optional)" name="reason">
                <Input id="reason" name="reason" placeholder="e.g. Regular term publication" />
              </Field>
              <SubmitButton className="w-full">Calculate & Publish Results</SubmitButton>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

