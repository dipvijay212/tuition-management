"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { api } from "@/lib/api/server";
import { makeAction } from "@/lib/utilities/action";
import { optionalText, optionalUuid } from "@/lib/validations/common";

export type AttendanceRosterStudent = {
  id: string;
  full_name: string;
  admission_no: string;
  status: "present" | "absent" | "late" | "excused";
  remarks?: string;
};

export type PreparedAttendanceSession = {
  sessionId: string;
  batchId: string;
  batchName: string;
  sessionDate: string;
  subjectName?: string | null;
  teacherName?: string | null;
  isAlreadyMarked: boolean;
  students: AttendanceRosterStudent[];
};

export const prepareAttendanceSessionAction = makeAction({
  roles: ["admin", "teacher"],
  schema: z.object({
    batch_id: z.uuid("Select a batch"),
    session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter valid date"),
    subject_id: optionalUuid,
  }),
  handler: async (v) => {
    // Finds or creates the session, then returns the roster with any saved marks.
    const res = await api<PreparedAttendanceSession>("/attendance/prepare", { method: "POST", body: v });
    return { ok: true, data: res };
  },
});

export const loadSessionAttendanceAction = makeAction({
  roles: ["admin", "teacher"],
  schema: z.object({
    session_id: z.uuid("Session ID is required"),
  }),
  handler: async (v) => {
    const res = await api<PreparedAttendanceSession>(`/attendance/sessions/${encodeURIComponent(v.session_id)}/roster`);
    return { ok: true, data: res };
  },
});

export const submitAttendanceAction = makeAction({
  roles: ["admin", "teacher"],
  schema: z.object({
    session_id: z.uuid("Session ID is required"),
    reason: optionalText,
    records_json: z.string().min(2, "Invalid records"),
  }),
  handler: async (v) => {
    let records: { student_id: string; status: "present" | "absent" | "late" | "excused"; remarks?: string }[];
    try {
      records = JSON.parse(v.records_json);
    } catch {
      throw new Error("Invalid attendance records format");
    }
    // The backend saves via submit_attendance() and sends absence emails.
    const r = await api<{ message: string }>(`/attendance/sessions/${encodeURIComponent(v.session_id)}/submit`, { method: "POST", body: { records, reason: v.reason ?? null } });

    revalidatePath("/admin/attendance");
    revalidatePath("/admin");
    revalidatePath("/teacher/attendance");
    revalidatePath("/student/attendance");
    revalidatePath("/parent/attendance");
    return { ok: true, message: r.message };
  },
});

export const createAdhocSessionAction = makeAction({
  roles: ["admin", "teacher"],
  schema: z.object({
    batch_id: z.uuid("Select a batch"),
    subject_id: optionalUuid,
    teacher_id: optionalUuid,
    session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter valid date"),
    start_time: z.string().regex(/^\d{2}:\d{2}/, "Enter start time"),
    end_time: z.string().regex(/^\d{2}:\d{2}/, "Enter end time"),
    room: optionalText,
  }).superRefine((v, c) => {
    if (v.end_time <= v.start_time) c.addIssue({ code: "custom", path: ["end_time"], message: "End time must be after start time" });
  }),
  handler: async (v) => {
    const r = await api<{ message: string; sessionId: string }>("/attendance/sessions", { method: "POST", body: v });
    revalidatePath("/admin/attendance");
    revalidatePath("/teacher/attendance");
    return { ok: true, message: r.message, data: { sessionId: r.sessionId } };
  },
});
