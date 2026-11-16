"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { api } from "@/lib/api/server";
import { makeAction } from "@/lib/utilities/action";
import { optionalDate, optionalText, optionalUuid } from "@/lib/validations/common";

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
  handler: async (v) => {
    await api("/timetable", { method: "POST", body: v });

    revalidatePath("/admin/timetable");
    revalidatePath("/teacher/timetable");
    return { ok: true, message: "Timetable slot saved" };
  },
});

export const deleteTimetableSlot = makeAction({
  roles: ["admin"],
  schema: z.object({ id: z.uuid() }),
  handler: async (v) => {
    await api(`/timetable/${encodeURIComponent(v.id)}/deactivate`, { method: "POST", body: {} });
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
    const r = await api<{ message: string }>("/timetable/generate-sessions", { method: "POST", body: v });
    revalidatePath("/admin/timetable");
    revalidatePath("/admin/attendance");
    revalidatePath("/teacher/timetable");
    revalidatePath("/teacher/attendance");
    return { ok: true, message: r.message };
  },
});
