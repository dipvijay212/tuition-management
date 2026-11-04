"use client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { endEnrolment } from "./actions";

export function RemoveEnrolmentButton({ enrolmentId, studentName }: { enrolmentId: string; studentName: string }) {
  return (
    <ConfirmDialog
      trigger={<Button variant="ghost" size="sm" className="text-destructive">Remove</Button>}
      title={`Remove ${studentName} from this batch?`}
      description="The enrolment is ended, not deleted. Past attendance, fees and results are kept."
      requireReason reasonLabel="Reason"
      confirmLabel="Remove from batch" destructive
      onConfirm={(reason) => endEnrolment(enrolmentId, reason)}
    />
  );
}
