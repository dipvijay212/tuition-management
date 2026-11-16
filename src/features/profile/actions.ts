"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { api } from "@/lib/api/server";
import { makeAction } from "@/lib/utilities/action";
import { passwordSchema, requiredText } from "@/lib/validations/common";

export const changePassword = makeAction({
  roles: ["admin", "teacher", "student", "parent"],
  schema: z.object({ current: z.string().min(1, "Enter your current password"), password: passwordSchema(8), confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" }),
  handler: async (v) => {
    // The backend re-verifies the current password before changing it.
    const r = await api<{ message: string }>("/auth/change-password", { method: "POST", body: { current: v.current, password: v.password } });
    return { ok: true, message: r.message };
  },
});

export const updateOwnName = makeAction({
  roles: ["admin", "teacher", "student", "parent"],
  schema: z.object({ full_name: requiredText("Name", 100) }),
  handler: async (v) => {
    await api("/auth/profile", { method: "PATCH", body: { full_name: v.full_name } });
    revalidatePath("/", "layout");
    return { ok: true, message: "Profile updated" };
  },
});
