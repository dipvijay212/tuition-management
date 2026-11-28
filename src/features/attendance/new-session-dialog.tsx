"use client";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { ActionForm, Field, NativeSelect } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { createAdhocSessionAction } from "./actions";

type Props = {
  batches: { id: string; name: string }[];
  teachers: { id: string; full_name: string }[];
  subjects: { id: string; name: string }[];
  defaultDate: string;
  defaultBatchId?: string;
  trigger?: React.ReactElement;
};

export function NewSessionDialog({ batches, teachers, subjects, defaultDate, defaultBatchId, trigger }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button><CheckCircle2 className="size-4 mr-1" /> Take Attendance</Button>} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Take Attendance / New Class Session</DialogTitle>
          <DialogDescription>Select the batch and date to record student presence.</DialogDescription>
        </DialogHeader>
        <ActionForm action={createAdhocSessionAction} onSuccess={() => setOpen(false)}>
          {({ errors }) => (
            <>
              <Field label="Batch" name="batch_id" required error={errors.batch_id}>
                <NativeSelect id="batch_id" name="batch_id" required defaultValue={defaultBatchId ?? ""}>
                  <option value="" disabled>Select batch</option>
                  {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </NativeSelect>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Subject (optional)" name="subject_id" error={errors.subject_id}>
                  <NativeSelect id="subject_id" name="subject_id" defaultValue="">
                    <option value="">(All / General)</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </NativeSelect>
                </Field>
                <Field label="Teacher (optional)" name="teacher_id" error={errors.teacher_id}>
                  <NativeSelect id="teacher_id" name="teacher_id" defaultValue="">
                    <option value="">(Default teacher)</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </NativeSelect>
                </Field>
              </div>

              <Field label="Date" name="session_date" required error={errors.session_date}>
                <DateInput id="session_date" name="session_date" defaultValue={defaultDate} required />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Start time" name="start_time" required error={errors.start_time}>
                  <Input id="start_time" name="start_time" type="time" defaultValue="09:00" required />
                </Field>
                <Field label="End time" name="end_time" required error={errors.end_time}>
                  <Input id="end_time" name="end_time" type="time" defaultValue="10:00" required />
                </Field>
              </div>

              <Field label="Room (optional)" name="room" error={errors.room}>
                <Input id="room" name="room" placeholder="e.g. Main Hall / Room 1" />
              </Field>

              <SubmitButton className="w-full">Create & Open Attendance</SubmitButton>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
