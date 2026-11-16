"use client";
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionForm, Field } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { generateSessionsAction } from "./actions";

export function GenerateSessionsDialog({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline"><CalendarDays /> Generate class sessions</Button>} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate class sessions</DialogTitle>
          <DialogDescription>
            Creates concrete dated class sessions from the active timetable for attendance and tracking (up to 120 days).
          </DialogDescription>
        </DialogHeader>
        <ActionForm action={generateSessionsAction} onSuccess={() => setOpen(false)}>
          {({ errors }) => (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="From date" name="from_date" required error={errors.from_date}>
                  <Input id="from_date" name="from_date" type="date" defaultValue={defaultFrom} required />
                </Field>
                <Field label="To date" name="to_date" required error={errors.to_date}>
                  <Input id="to_date" name="to_date" type="date" defaultValue={defaultTo} required />
                </Field>
              </div>
              <SubmitButton className="w-full">Generate sessions</SubmitButton>
            </>
          )}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

