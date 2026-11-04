"use client";
import { Input } from "@/components/ui/input";
import { ActionForm, NativeSelect } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { markTeacherAttendance } from "./actions";

export function TeacherAttendanceForm({ teacherId, today }: { teacherId: string; today: string }) {
  return (
    <ActionForm action={markTeacherAttendance}>
      {() => (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="teacher_id" value={teacherId} />
          <Input type="date" name="attendance_date" defaultValue={today} max={today} aria-label="Date" className="sm:w-40" />
          <NativeSelect name="status" aria-label="Status" className="sm:w-36"><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="leave">Leave</option></NativeSelect>
          <Input name="remarks" placeholder="Remarks (optional)" aria-label="Remarks" />
          <SubmitButton>Save</SubmitButton>
        </div>
      )}
    </ActionForm>
  );
}
