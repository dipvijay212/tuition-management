"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { check, makeAction } from "@/lib/utilities/action";
import { passwordSchema, requiredText } from "@/lib/validations/common";

export const changePassword = makeAction({
  roles: ["admin", "teacher", "student", "parent"],
  schema: z.object({ current: z.string().min(1, "Enter your current password"), password: passwordSchema(8), confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" }),
  handler: async (v, ctx) => {
    const supabase = await createClient();
    // Re-verify the current password before changing it.
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: ctx.email!, password: v.current });
    if (authErr) return { ok: false, error: "Current password is incorrect.", fieldErrors: { current: ["Current password is incorrect"] } };
    const { error } = await supabase.auth.updateUser({ password: v.password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, message: "Password changed" };
  },
});

export const updateOwnName = makeAction({
  roles: ["admin", "teacher", "student", "parent"],
  schema: z.object({ full_name: requiredText("Name", 100) }),
  handler: async (v, ctx) => {
    const supabase = await createClient();
    check(await supabase.from("profiles").update({ full_name: v.full_name }).eq("id", ctx.userId));
    revalidatePath("/", "layout");
    return { ok: true, message: "Profile updated" };
  },
});
