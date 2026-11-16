"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ActionForm } from "@/components/shared/form";
import { SubmitButton } from "@/components/shared/submit-button";
import { saveSubjectMarks } from "./actions";

type StudentMarksEntry = {
  id: string;
  full_name: string;
  admission_no: string;
  obtained_marks?: number | null;
  is_absent?: boolean;
  remarks?: string;
};

export function MarksEntryTable({
  examId,
  examSubjectId,
  maxMarks,
  students,
}: {
  examId: string;
  examSubjectId: string;
  maxMarks: number;
  students: StudentMarksEntry[];
}) {
  const [entries, setEntries] = useState<Record<string, { marks: string; absent: boolean; remarks: string }>>(() => {
    const init: Record<string, { marks: string; absent: boolean; remarks: string }> = {};
    for (const s of students) {
      init[s.id] = {
        marks: s.obtained_marks !== null && s.obtained_marks !== undefined ? String(s.obtained_marks) : "",
        absent: s.is_absent ?? false,
        remarks: s.remarks ?? "",
      };
    }
    return init;
  });

  const updateEntry = (studentId: string, updates: Partial<{ marks: string; absent: boolean; remarks: string }>) => {
    setEntries((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], ...updates },
    }));
  };

  const payload = JSON.stringify(
    students.map((s) => {
      const cur = entries[s.id];
      return {
        student_id: s.id,
        obtained_marks: cur?.absent ? null : cur?.marks !== "" ? Number(cur.marks) : null,
        is_absent: cur?.absent ?? false,
        remarks: cur?.remarks || undefined,
      };
    })
  );

  return (
    <div className="space-y-4">
      <ActionForm action={saveSubjectMarks}>
        {() => (
          <>
            <input type="hidden" name="examination_id" value={examId} />
            <input type="hidden" name="examination_subject_id" value={examSubjectId} />
            <input type="hidden" name="marks_json" value={payload} />

            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                    <th className="py-2.5 px-4 font-medium">Student</th>
                    <th className="py-2.5 px-4 font-medium w-36">Obtained (Max {maxMarks})</th>
                    <th className="py-2.5 px-4 font-medium w-28">Absent</th>
                    <th className="py-2.5 px-4 font-medium">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map((s) => {
                    const cur = entries[s.id] ?? { marks: "", absent: false, remarks: "" };
                    return (
                      <tr key={s.id} className="hover:bg-muted/20">
                        <td className="py-2 px-4">
                          <div className="font-medium text-foreground">{s.full_name}</div>
                          <div className="text-xs text-muted-foreground">Adm: {s.admission_no}</div>
                        </td>
                        <td className="py-2 px-4">
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max={maxMarks}
                            disabled={cur.absent}
                            placeholder="Marks"
                            value={cur.marks}
                            onChange={(e) => updateEntry(s.id, { marks: e.target.value })}
                            className="h-8 w-28"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <label className="flex items-center gap-2 cursor-pointer text-xs">
                            <Checkbox
                              checked={cur.absent}
                              onCheckedChange={(c) => updateEntry(s.id, { absent: !!c, ...(c ? { marks: "" } : {}) })}
                            />
                            <span>Absent</span>
                          </label>
                        </td>
                        <td className="py-2 px-4">
                          <Input
                            placeholder="Remarks..."
                            value={cur.remarks}
                            onChange={(e) => updateEntry(s.id, { remarks: e.target.value })}
                            className="h-8"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <SubmitButton>Save Marks</SubmitButton>
            </div>
          </>
        )}
      </ActionForm>
    </div>
  );
}

