"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { ActionForm, Field, NativeSelect } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { saveTimetableSlot } from "./actions";

type Props = {
  batches: { id: string; name: string }[];
  teachers: { id: string; full_name: string }[];
  subjects: { id: string; name: string }[];
};

const DAYS_OPTIONS = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "7", label: "Sunday" },
];

export function TimetableSlotDialog({ batches, teachers, subjects }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><Plus /> Add schedule slot</Button>} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add timetable slot</DialogTitle>
          <DialogDescription>Define a recurring weekly class slot for a batch.</DialogDescription>
        </DialogHeader>
        <ActionForm action={saveTimetableSlot} onSuccess={() => setOpen(false)}>
          {({ errors }) => (
            <>
              <Field label="Batch" name="batch_id" required error={errors.batch_id}>
                <NativeSelect id="batch_id" name="batch_id" required defaultValue="">
                  <option value="" disabled>Select batch</option>
                  {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </NativeSelect>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Subject" name="subject_id" error={errors.subject_id}>
                  <NativeSelect id="subject_id" name="subject_id" defaultValue="">
                    <option value="">(No subject specified)</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </NativeSelect>
                </Field>
                <Field label="Teacher" name="teacher_id" error={errors.teacher_id}>
                  <NativeSelect id="teacher_id" name="teacher_id" defaultValue="">
                    <option value="">(No teacher specified)</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </NativeSelect>
                </Field>
              </div>

              <Field label="Day of week" name="day_of_week" required error={errors.day_of_week}>
                <NativeSelect id="day_of_week" name="day_of_week" required defaultValue="1">
                  {DAYS_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </NativeSelect>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Start time" name="start_time" required error={errors.start_time}>
                  <Input id="start_time" name="start_time" type="time" required />
                </Field>
                <Field label="End time" name="end_time" required error={errors.end_time}>
                  <Input id="end_time" name="end_time" type="time" required />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Room" name="room" error={errors.room}>
                  <Input id="room" name="room" placeholder="e.g. Room 101" />
                </Field>
                <Field label="Effective from" name="effective_from" error={errors.effective_from}>
                  <DateInput id="effective_from" name="effective_from" />
                </Field>
              </div>

              <SubmitButton className="w-full">Save slot</SubmitButton>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

