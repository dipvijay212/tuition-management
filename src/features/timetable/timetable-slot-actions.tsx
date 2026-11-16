"use client";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteTimetableSlot } from "./actions";

export function TimetableSlotActions({ slotId }: { slotId: string }) {
  return (
    <ConfirmDialog
      title="Deactivate timetable slot?"
      description="This recurring slot will no longer generate future sessions."
      confirmLabel="Deactivate"
      destructive
      onConfirm={async () => {
        const fd = new FormData();
        fd.append("id", slotId);
        return deleteTimetableSlot(undefined, fd);
      }}
      trigger={
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive">
          <Trash2 className="size-4" />
        </Button>
      }
    />
  );
}
