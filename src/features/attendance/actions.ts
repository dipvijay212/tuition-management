"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { check, makeAction } from "@/lib/utilities/action";
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
  handler: async (v, ctx) => {
    const supabase = await createClient();
    const inst = ctx.institute!.id;

    // 1. Check if a non-cancelled session already exists for this batch and date (and subject if selected)
    let sessionQuery = supabase
      .from("class_sessions")
      .select("id, batch_id, session_date, subject_id, teacher_id, attendance_submitted_at, batches(name), subjects(name), teachers(full_name)")
      .eq("institute_id", inst)
      .eq("batch_id", v.batch_id)
      .eq("session_date", v.session_date)
      .neq("status", "cancelled");

    if (v.subject_id) {
      sessionQuery = sessionQuery.eq("subject_id", v.subject_id);
    }

    const { data: existingSessions } = await sessionQuery.order("created_at", { ascending: false });
    let session = existingSessions?.[0];

    if (!session) {
      // 2. Fetch batch info for start_time, end_time, room
      const { data: b } = await supabase
        .from("batches")
        .select("start_time, end_time, room")
        .eq("id", v.batch_id)
        .single();

      // 3. Fetch active assigned teacher for this batch
      const { data: tb } = await supabase
        .from("teacher_batches")
        .select("teacher_id")
        .eq("batch_id", v.batch_id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      const startTime = b?.start_time || "09:00";
      const endTime = b?.end_time || (startTime < "23:00" ? "10:00" : "23:59");

      // 4. Create the session seamlessly in the background
      const { data: newSession, error: sErr } = await supabase
        .from("class_sessions")
        .insert({
          institute_id: inst,
          batch_id: v.batch_id,
          subject_id: v.subject_id ?? null,
          teacher_id: tb?.teacher_id ?? null,
          session_date: v.session_date,
          start_time: startTime,
          end_time: endTime,
          room: b?.room ?? null,
          status: "scheduled",
        })
        .select("id, batch_id, session_date, subject_id, teacher_id, attendance_submitted_at, batches(name), subjects(name), teachers(full_name)")
        .single();

      if (sErr) throw sErr;
      session = newSession;
    }

    // 5. Fetch actively enrolled students in this batch
    const { data: enrolments } = await supabase
      .from("student_batches")
      .select("student_id, start_date, end_date, status, students(id, full_name, admission_no, status)")
      .eq("institute_id", inst)
      .eq("batch_id", v.batch_id)
      .eq("status", "active")
      .lte("start_date", v.session_date);

    // Active students whose end date is not past
    const activeStudents = (enrolments ?? [])
      .filter((e) => !e.end_date || e.end_date >= v.session_date)
      .map((e) => e.students)
      .filter((st): st is NonNullable<typeof st> => !!st && st.status === "active")
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    // 6. Fetch existing attendance records if any
    const { data: existingAttendance } = await supabase
      .from("attendance")
      .select("student_id, status, remarks")
      .eq("session_id", session.id);

    const attMap = new Map<string, { status: "present" | "absent" | "late" | "excused"; remarks?: string }>();
    for (const a of existingAttendance ?? []) {
      attMap.set(a.student_id, {
        status: a.status as "present" | "absent" | "late" | "excused",
        remarks: a.remarks ?? undefined,
      });
    }

    const students: AttendanceRosterStudent[] = activeStudents.map((st) => {
      const existing = attMap.get(st.id);
      return {
        id: st.id,
        full_name: st.full_name,
        admission_no: st.admission_no,
        status: existing ? existing.status : "present",
        remarks: existing?.remarks ?? "",
      };
    });

    const res: PreparedAttendanceSession = {
      sessionId: session.id,
      batchId: v.batch_id,
      batchName: (session.batches as { name: string } | null)?.name ?? "Batch",
      sessionDate: session.session_date,
      subjectName: (session.subjects as { name: string } | null)?.name ?? null,
      teacherName: (session.teachers as { full_name: string } | null)?.full_name ?? null,
      isAlreadyMarked: !!session.attendance_submitted_at || (existingAttendance?.length ?? 0) > 0,
      students,
    };

    return { ok: true, data: res };
  },
});

export const loadSessionAttendanceAction = makeAction({
  roles: ["admin", "teacher"],
  schema: z.object({
    session_id: z.uuid("Session ID is required"),
  }),
  handler: async (v, ctx) => {
    const supabase = await createClient();
    const inst = ctx.institute!.id;

    const { data: session, error } = await supabase
      .from("class_sessions")
      .select("id, batch_id, session_date, subject_id, teacher_id, attendance_submitted_at, batches(name), subjects(name), teachers(full_name)")
      .eq("institute_id", inst)
      .eq("id", v.session_id)
      .single();

    if (error || !session) throw new Error("Class session not found");

    // Fetch students active in that batch on that date
    const { data: enrolments } = await supabase
      .from("student_batches")
      .select("student_id, start_date, end_date, status, students(id, full_name, admission_no, status)")
      .eq("institute_id", inst)
      .eq("batch_id", session.batch_id)
      .eq("status", "active")
      .lte("start_date", session.session_date);

    const activeStudents = (enrolments ?? [])
      .filter((e) => !e.end_date || e.end_date >= session.session_date)
      .map((e) => e.students)
      .filter((st): st is NonNullable<typeof st> => !!st && st.status === "active")
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    // Fetch attendance records
    const { data: existingAttendance } = await supabase
      .from("attendance")
      .select("student_id, status, remarks")
      .eq("session_id", session.id);

    const attMap = new Map<string, { status: "present" | "absent" | "late" | "excused"; remarks?: string }>();
    for (const a of existingAttendance ?? []) {
      attMap.set(a.student_id, {
        status: a.status as "present" | "absent" | "late" | "excused",
        remarks: a.remarks ?? undefined,
      });
    }

    const students: AttendanceRosterStudent[] = activeStudents.map((st) => {
      const existing = attMap.get(st.id);
      return {
        id: st.id,
        full_name: st.full_name,
        admission_no: st.admission_no,
        status: existing ? existing.status : "present",
        remarks: existing?.remarks ?? "",
      };
    });

    const res: PreparedAttendanceSession = {
      sessionId: session.id,
      batchId: session.batch_id,
      batchName: (session.batches as { name: string } | null)?.name ?? "Batch",
      sessionDate: session.session_date,
      subjectName: (session.subjects as { name: string } | null)?.name ?? null,
      teacherName: (session.teachers as { full_name: string } | null)?.full_name ?? null,
      isAlreadyMarked: !!session.attendance_submitted_at || (existingAttendance?.length ?? 0) > 0,
      students,
    };

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
    const supabase = await createClient();
    let records: { student_id: string; status: "present" | "absent" | "late" | "excused"; remarks?: string }[];
    try {
      records = JSON.parse(v.records_json);
    } catch {
      throw new Error("Invalid attendance records format");
    }

    const { data: count, error } = await supabase.rpc("submit_attendance", {
      p_session: v.session_id,
      p_records: records,
      p_reason: v.reason ?? undefined,
    });
    if (error) throw error;

    revalidatePath("/admin/attendance");
    revalidatePath("/admin");
    revalidatePath("/teacher/attendance");
    revalidatePath("/student/attendance");
    revalidatePath("/parent/attendance");

    // Safe background trigger for absence emails
    try {
      const absentIds = records.filter((r) => r.status === "absent").map((r) => r.student_id);
      if (absentIds.length > 0) {
        const { data: session } = await supabase
          .from("class_sessions")
          .select("id, institute_id, session_date, batches(name), subjects(name), institutes(name, phone)")
          .eq("id", v.session_id)
          .maybeSingle();

        if (session) {
          const { data: stSettings } = await supabase
            .from("institute_settings")
            .select("notify_parent_on_absence, email_enabled")
            .eq("institute_id", session.institute_id)
            .maybeSingle();

          if (stSettings?.notify_parent_on_absence && stSettings?.email_enabled) {
            const { data: studentsWithGuardians } = await supabase
              .from("students")
              .select("id, full_name, parent_students(is_primary, guardians(email))")
              .in("id", absentIds);

            const { renderAbsenceAlertEmail, sendEmail } = await import("@/lib/email");
            const batchName = (session.batches as { name?: string } | null)?.name ?? "Batch";
            const subjectName = (session.subjects as { name?: string } | null)?.name ?? null;
            const instName = (session.institutes as { name?: string; phone?: string } | null)?.name;
            const instPhone = (session.institutes as { name?: string; phone?: string } | null)?.phone;

            for (const st of studentsWithGuardians ?? []) {
              const guardianEmails: string[] = [];
              for (const ps of st.parent_students ?? []) {
                const gEmail = (ps.guardians as { email?: string } | null)?.email;
                if (gEmail && !guardianEmails.includes(gEmail)) {
                  guardianEmails.push(gEmail);
                }
              }

              if (guardianEmails.length > 0) {
                const tpl = renderAbsenceAlertEmail({
                  instituteName: instName,
                  institutePhone: instPhone,
                  studentName: st.full_name,
                  batchName,
                  subjectName,
                  date: session.session_date,
                });

                await sendEmail({
                  to: guardianEmails,
                  subject: tpl.subject,
                  html: tpl.html,
                  text: tpl.text,
                  instituteId: session.institute_id,
                });
              }
            }
          }
        }
      }
    } catch (emailErr) {
      console.error("[Absence Email Trigger Failed]", emailErr);
    }

    return { ok: true, message: `Attendance saved for ${count ?? 0} students!` };
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
  handler: async (v, ctx) => {
    const supabase = await createClient();
    const inst = ctx.institute!.id;
    const session = check(
      await supabase
        .from("class_sessions")
        .insert({
          institute_id: inst,
          batch_id: v.batch_id,
          subject_id: v.subject_id ?? null,
          teacher_id: v.teacher_id ?? null,
          session_date: v.session_date,
          start_time: v.start_time,
          end_time: v.end_time,
          room: v.room ?? null,
          status: "scheduled",
        })
        .select("id")
        .single()
    );

    revalidatePath("/admin/attendance");
    revalidatePath("/teacher/attendance");
    return { ok: true, message: "Class session created", data: { sessionId: session.id } };
  },
});
