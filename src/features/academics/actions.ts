"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { check, makeAction } from "@/lib/utilities/action";
import { optionalText, optionalUuid, requiredText } from "@/lib/validations/common";

const status = z.enum(["active", "inactive"]).default("active");

export const saveClass = makeAction({
  roles: ["admin"],
  schema: z.object({ id: optionalUuid, name: requiredText("Class name", 60), description: optionalText, academic_year_id: optionalUuid, sort_order: z.coerce.number().int().default(0), status }),
  handler: async (v, ctx) => {
    const supabase = await createClient();
    const row = { institute_id: ctx.institute!.id, name: v.name, description: v.description ?? null, academic_year_id: v.academic_year_id ?? null, sort_order: v.sort_order, status: v.status };
    if (v.id) check(await supabase.from("classes").update(row).eq("id", v.id));
    else check(await supabase.from("classes").insert(row));
    revalidatePath("/admin/classes");
    return { ok: true, message: v.id ? "Class updated" : "Class created" };
  },
});

export const saveSubject = makeAction({
  roles: ["admin"],
  schema: z.object({ id: optionalUuid, name: requiredText("Subject name", 60), code: z.string().trim().max(20).optional().transform((v) => (v ? v.toUpperCase() : undefined)), class_id: optionalUuid, description: optionalText, status }),
  handler: async (v, ctx) => {
    const supabase = await createClient();
    const row = { institute_id: ctx.institute!.id, name: v.name, code: v.code ?? null, class_id: v.class_id ?? null, description: v.description ?? null, status: v.status };
    if (v.id) check(await supabase.from("subjects").update(row).eq("id", v.id));
    else check(await supabase.from("subjects").insert(row));
    revalidatePath("/admin/subjects");
    return { ok: true, message: v.id ? "Subject updated" : "Subject created" };
  },
});
