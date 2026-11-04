"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth/session";
import { friendlyError, type ActionResult } from "@/lib/utilities/errors";
import { OPTIONAL_TYPES } from "./types";


export async function markAllRead(): Promise<ActionResult> {
  try {
    await assertRole("admin", "teacher", "student", "parent");
    const supabase = await createClient();
    const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, message: "All marked as read" };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function setPreference(type: string, inApp: boolean): Promise<ActionResult> {
  try {
    const ctx = await assertRole("admin", "teacher", "student", "parent");
    if (!(OPTIONAL_TYPES as readonly string[]).includes(type)) return { ok: false, error: "This notification type cannot be turned off." };
    const supabase = await createClient();
    const { error } = await supabase.from("notification_preferences").upsert({ user_id: ctx.userId, type, in_app: inApp, email: inApp });
    if (error) throw error;
    return { ok: true, message: "Preference saved" };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}
