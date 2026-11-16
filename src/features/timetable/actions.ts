"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { check, makeAction } from "@/lib/utilities/action";
import { optionalDate, optionalText, optionalUuid } from "@/lib/validations/common";
import { todayIn } from "@/lib/utilities/format";

const timeRegex = /^\d{2}:\d{2}/;

export const saveTimetableSlot = makeAction({
  roles: ["admin"],
  schema: z.object({
    id: optionalUuid,
    batch_id: z.uuid("Select a batch"),
    subject_id: optionalUuid,
    teacher_id: optionalUuid,
    day_of_week: z.coerce.number().int().min(1).max(7, "Select day of week"),
    start_time: z.string().regex(timeRegex, "Enter start time"),
    end_time: z.string().regex(timeRegex, "Enter end time"),
    room: optionalText,
    effective_from: optionalDate,
    effective_to: optionalDate,
    override_reason: optionalText,
  }).superRefine((v, c) => {
    if (v.end_time <= v.start_time) c.addIssue({ code: "custom", path: ["end_time"], message: "End time must be after start time" });
    if (v.effective_from && v.effective_to && v.effective_to < v.effective_from) {
      c.addIssue({ code: "custom", path: ["effective_to"], message: "End date must be on or after start date" });
    }
  }),
  handler: async (v, ctx) => {
    const supabase = await createClient();
    const inst = ctx.institute!.id;
    const row = {
      institute_id: inst,
      batch_id: v.batch_id,
      subject_id: v.subject_id ?? null,
      teacher_id: v.teacher_id ?? null,
      day_of_week: v.day_of_week,
      start_time: v.start_time,
      end_time: v.end_time,
      room: v.room ?? null,
      effective_from: v.effective_from ?? todayIn(ctx.timezone),
      effective_to: v.effective_to ?? null,
      override_reason: v.override_reason ?? null,
      created_by: ctx.userId,
      is_active: true,
    };

    if (v.id) {
      check(await supabase.from("timetable").update(row).eq("id", v.id));
    } else {
      check(await supabase.from("timetable").insert(row));
    }

    revalidatePath("/admin/timetable");
    revalidatePath("/teacher/timetable");
    return { ok: true, message: "Timetable slot saved" };
  },
});

export const deleteTimetableSlot = makeAction({
  roles: ["admin"],
  schema: z.object({ id: z.uuid() }),
  handler: async (v) => {
    const supabase = await createClient();
    check(await supabase.from("timetable").update({ is_active: false }).eq("id", v.id));
    revalidatePath("/admin/timetable");
    revalidatePath("/teacher/timetable");
    return { ok: true, message: "Slot deactivated" };
  },
});

export const generateSessionsAction = makeAction({
  roles: ["admin"],
  schema: z.object({
    from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter start date"),
    to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter end date"),
  }).superRefine((v, c) => {
    if (v.to_date < v.from_date) c.addIssue({ code: "custom", path: ["to_date"], message: "End date must be on or after start date" });
  }),
  handler: async (v) => {
    const supabase = await createClient();
    const { data: count, error } = await supabase.rpc("generate_class_sessions", {
      p_from: v.from_date,
      p_to: v.to_date,
    });
    if (error) throw error;
    revalidatePath("/admin/timetable");
    revalidatePath("/admin/attendance");
    revalidatePath("/teacher/timetable");
    revalidatePath("/teacher/attendance");
    return { ok: true, message: `Successfully generated ${count ?? 0} class sessions` };
  },
});
