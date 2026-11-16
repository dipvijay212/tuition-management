"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { api } from "@/lib/api/server";
import { makeAction } from "@/lib/utilities/action";
import { optionalText, optionalUuid, requiredText } from "@/lib/validations/common";

const status = z.enum(["active", "inactive"]).default("active");

export const saveClass = makeAction({
  roles: ["admin"],
  schema: z.object({ id: optionalUuid, name: requiredText("Class name", 60), description: optionalText, academic_year_id: optionalUuid, sort_order: z.coerce.number().int().default(0), status }),
  handler: async (v) => {
    const r = await api<{ message: string }>("/academics/classes", { method: "POST", body: v });
    revalidatePath("/admin/classes");
    return { ok: true, message: r.message };
  },
});

export const saveSubject = makeAction({
  roles: ["admin"],
  schema: z.object({ id: optionalUuid, name: requiredText("Subject name", 60), code: z.string().trim().max(20).optional().transform((v) => (v ? v.toUpperCase() : undefined)), class_id: optionalUuid, description: optionalText, status }),
  handler: async (v) => {
    const r = await api<{ message: string }>("/academics/subjects", { method: "POST", body: v });
    revalidatePath("/admin/subjects");
    return { ok: true, message: r.message };
  },
});
