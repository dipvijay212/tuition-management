"use client";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AttendanceSheet } from "./attendance-sheet";

type Props = {
  sessionId: string;
  batchName: string;
  sessionDate: string;
  sessionTime: string;
  isCompleted: boolean;
  students: {
    id: string;
    full_name: string;
    admission_no: string;
    current_status?: "present" | "absent" | "late" | "excused";
    current_remarks?: string;
  }[];
};

export function AttendanceDialog({ sessionId, batchName, sessionDate, sessionTime, isCompleted, students }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant={isCompleted ? "outline" : "default"}>
            <CheckCircle2 className="size-3.5 mr-1" />
            {isCompleted ? "Edit attendance" : "Mark attendance"}
          </Button>
        }
      />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Mark Attendance: {batchName}</DialogTitle>
          <DialogDescription>
            Session on {sessionDate} ({sessionTime})
          </DialogDescription>
        </DialogHeader>
        <AttendanceSheet sessionId={sessionId} students={students} onComplete={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

