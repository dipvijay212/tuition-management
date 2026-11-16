"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertRole, type AppRole } from "@/lib/auth/session";
import { provisionAccount } from "@/lib/auth/provision";
import { friendlyError, type ActionResult } from "@/lib/utilities/errors";
import { makeAction } from "@/lib/utilities/action";
import { passwordSchema, phoneSchema, requiredText } from "@/lib/validations/common";

async function audit(instituteId: string, userId: string, action: string, entityId: string, oldV: unknown, newV: unknown, reason?: string) {
  await createAdminClient().from("audit_logs").insert({ institute_id: instituteId, user_id: userId, action, entity: "user_accounts", entity_id: entityId, old_values: oldV as never, new_values: newV as never, reason: reason ?? null });
}

export async function setAccountStatus(userId: string, status: "active" | "inactive" | "suspended", reason: string): Promise<ActionResult> {
  try {
    const ctx = await assertRole("admin");
    if (userId === ctx.userId) return { ok: false, error: "You cannot change your own account status." };
    if (reason.trim().length < 5) return { ok: false, error: "Please give a reason." };
    const admin = createAdminClient();
    const { data: p } = await admin.from("profiles").select("status, institute_id").eq("id", userId).single();
    if (!p || p.institute_id !== ctx.institute!.id) return { ok: false, error: "User not found." };
    const { error } = await admin.from("profiles").update({ status }).eq("id", userId);
    if (error) throw error;
    // Revoke live sessions for blocked users.
    if (status !== "active") await admin.auth.admin.signOut(userId, "global").catch(() => undefined);
    await audit(ctx.institute!.id, ctx.userId, "account_status_changed", userId, { status: p.status }, { status }, reason);
    revalidatePath("/admin/users");
    return { ok: true, message: `Account ${status}` };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function setRole(userId: string, role: AppRole, grant: boolean): Promise<ActionResult> {
  try {
    const ctx = await assertRole("admin");
    if (userId === ctx.userId && role === "admin" && !grant) return { ok: false, error: "You cannot remove your own admin access." };
    const admin = createAdminClient();
    const { data: p } = await admin.from("profiles").select("institute_id").eq("id", userId).single();
    if (!p || p.institute_id !== ctx.institute!.id) return { ok: false, error: "User not found." };
    if (grant) {
      const { error } = await admin.from("user_roles").upsert({ user_id: userId, institute_id: ctx.institute!.id, role, created_by: ctx.userId }, { onConflict: "user_id,institute_id,role", ignoreDuplicates: true });
      if (error) throw error;
    } else {
      if (role === "admin") {
        const { count } = await admin.from("user_roles").select("id", { count: "exact", head: true }).eq("institute_id", ctx.institute!.id).eq("role", "admin");
        if ((count ?? 0) <= 1) return { ok: false, error: "At least one admin must remain." };
      }
      const { error } = await admin.from("user_roles").delete().eq("user_id", userId).eq("institute_id", ctx.institute!.id).eq("role", role);
      if (error) throw error;
    }
    await audit(ctx.institute!.id, ctx.userId, grant ? "role_granted" : "role_revoked", userId, null, { role });
    revalidatePath("/admin/users");
    return { ok: true, message: grant ? `${role} access granted` : `${role} access removed` };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function sendPasswordReset(userId: string): Promise<ActionResult> {
  try {
    const ctx = await assertRole("admin");
    const admin = createAdminClient();
    const { data: p } = await admin.from("profiles").select("full_name, email, institute_id").eq("id", userId).single();
    if (!p?.email || p.institute_id !== ctx.institute!.id) return { ok: false, error: "This user has no email address." };
    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100").replace(/\/$/, "");
    const redirectTo = `${site}/auth/callback?next=/reset-password`;

    let linkRes = await admin.auth.admin.generateLink({
      type: "recovery",
      email: p.email,
      options: { redirectTo },
    });

    if (linkRes.error || !linkRes.data?.properties) {
      linkRes = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: p.email,
        options: { redirectTo },
      });
    }

    const props = linkRes.data?.properties;
    const actionLink = props?.hashed_token
      ? `${site}/auth/callback?token_hash=${props.hashed_token}&type=recovery&next=/reset-password`
      : props?.action_link;

    if (!actionLink) {
      return { ok: false, error: linkRes.error?.message ?? "Could not generate reset link." };
    }

    const { renderPasswordResetEmail, sendEmail } = await import("@/lib/email");
    const tpl = renderPasswordResetEmail({
      instituteName: ctx.institute?.name,
      recipientName: p.full_name || undefined,
      recipientEmail: p.email,
      actionLink,
    });

    const sendRes = await sendEmail({
      to: p.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      instituteId: ctx.institute?.id,
    });

    if (!sendRes.ok) {
      return { ok: false, error: `Email dispatch failed: ${sendRes.error}` };
    }

    await audit(ctx.institute!.id, ctx.userId, "password_reset_sent", userId, null, null);
    return { ok: true, message: `Reset link sent to ${p.email}` };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export const createAdminUser = makeAction({
  roles: ["admin"],
  schema: z.object({ full_name: requiredText("Name", 100), email: z.email("Enter a valid email"), phone: phoneSchema, password: passwordSchema(8) }),
  handler: async (v, ctx) => {
    await provisionAccount(ctx, { email: v.email, phone: v.phone, fullName: v.full_name, role: "admin", mode: "password", password: v.password });
    revalidatePath("/admin/users");
    return { ok: true, message: "Admin account created" };
  },
});
