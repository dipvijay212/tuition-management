"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { api } from "@/lib/api/server";
import { assertRole, type AppRole } from "@/lib/auth/session";
import { friendlyError, type ActionResult } from "@/lib/utilities/errors";
import { makeAction } from "@/lib/utilities/action";
import { passwordSchema, phoneSchema, requiredText } from "@/lib/validations/common";

export async function setAccountStatus(userId: string, status: "active" | "inactive" | "suspended", reason: string): Promise<ActionResult> {
  try {
    const ctx = await assertRole("admin");
    if (userId === ctx.userId) return { ok: false, error: "You cannot change your own account status." };
    if (reason.trim().length < 5) return { ok: false, error: "Please give a reason." };
    // The backend also signs blocked users out everywhere.
    const r = await api<{ message: string }>(`/users/${encodeURIComponent(userId)}/status`, { method: "POST", body: { status, reason } });
    revalidatePath("/admin/users");
    return { ok: true, message: r.message };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function setRole(userId: string, role: AppRole, grant: boolean): Promise<ActionResult> {
  try {
    const ctx = await assertRole("admin");
    if (userId === ctx.userId && role === "admin" && !grant) return { ok: false, error: "You cannot remove your own admin access." };
    const r = await api<{ message: string }>(`/users/${encodeURIComponent(userId)}/roles`, { method: "POST", body: { role, grant } });
    revalidatePath("/admin/users");
    return { ok: true, message: r.message };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function sendPasswordReset(userId: string): Promise<ActionResult> {
  try {
    await assertRole("admin");
    const r = await api<{ message: string }>(`/users/${encodeURIComponent(userId)}/password-reset`, { method: "POST", body: {} });
    return { ok: true, message: r.message };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export const createAdminUser = makeAction({
  roles: ["admin"],
  schema: z.object({ full_name: requiredText("Name", 100), email: z.email("Enter a valid email"), phone: phoneSchema, password: passwordSchema(8) }),
  handler: async (v) => {
    const r = await api<{ message: string }>("/users/admins", { method: "POST", body: v });
    revalidatePath("/admin/users");
    return { ok: true, message: r.message };
  },
});
