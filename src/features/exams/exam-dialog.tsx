"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { ActionForm, Field, NativeSelect } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { saveExamination } from "./actions";

type Props = {
  classes: { id: string; name: string }[];
  batches: { id: string; name: string }[];
  defaultDate?: string;
  trigger?: React.ReactElement;
};

export function NewExamDialog({ classes, batches, defaultDate, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const today = defaultDate || new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button><Plus /> Create examination</Button>} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Examination / Test</DialogTitle>
          <DialogDescription>Schedule a test or exam to record student marks and generate report cards.</DialogDescription>
        </DialogHeader>
        <ActionForm action={saveExamination} onSuccess={() => setOpen(false)}>
          {({ errors }) => (
            <>
              <Field label="Exam / Test Name" name="name" required error={errors.name}>
                <Input id="name" name="name" placeholder="e.g. Unit Test 1 or Chapter 2 Test" required />
              </Field>

              <Field label="Exam Type" name="exam_type" required error={errors.exam_type}>
                <NativeSelect id="exam_type" name="exam_type" required defaultValue="weekly_test">
                  <option value="weekly_test">Weekly Class Test</option>
                  <option value="unit_test">Unit Test</option>
                  <option value="monthly_test">Monthly Test</option>
                  <option value="half_yearly">Half Yearly Exam</option>
                  <option value="final">Final Exam</option>
                  <option value="practice">Practice / Mock Test</option>
                </NativeSelect>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Class" name="class_id" error={errors.class_id}>
                  <NativeSelect id="class_id" name="class_id" defaultValue="">
                    <option value="">(Select class)</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </NativeSelect>
                </Field>
                <Field label="Batch (optional)" name="batch_id" error={errors.batch_id}>
                  <NativeSelect id="batch_id" name="batch_id" defaultValue="">
                    <option value="">(All batches in class)</option>
                    {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </NativeSelect>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Start date" name="start_date" required error={errors.start_date}>
                  <DateInput
                    id="start_date"
                    name="start_date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (endDate < e.target.value) setEndDate(e.target.value);
                    }}
                    required
                  />
                </Field>
                <Field label="End date" name="end_date" required error={errors.end_date}>
                  <DateInput
                    id="end_date"
                    name="end_date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </Field>
              </div>

              <Field label="Result publish date (optional)" name="result_publish_date" error={errors.result_publish_date}>
                <DateInput id="result_publish_date" name="result_publish_date" />
              </Field>

              <SubmitButton className="w-full">Create Examination</SubmitButton>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
