import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole, SessionContext } from "./session";

export type ProvisionInput = {
  email: string;
  phone?: string | null;
  fullName: string;
  role: AppRole;
  mode: "invite" | "password";
  password?: string;
};

/**
 * Create (or reuse) a login for a person and grant a role in the admin's institute.
 * - Reuses an existing auth user with the same email (no duplicate accounts).
 * - Refuses to touch users that belong to a different institute.
 * Caller MUST have verified admin role (assertRole("admin")) first.
 */
export async function provisionAccount(ctx: SessionContext, input: ProvisionInput): Promise<{ userId: string; created: boolean; invited: boolean }> {
  const admin = createAdminClient();
  const institute = ctx.institute!.id;
  const email = input.email.trim().toLowerCase();

  const { data: existing } = await admin.from("profiles").select("id, institute_id, status").eq("email", email).maybeSingle();
  if (existing) {
    if (existing.institute_id && existing.institute_id !== institute) throw new Error("This email is registered with another institute.");
    await admin.from("profiles").update({ institute_id: institute, ...(input.phone ? { phone: input.phone } : {}) }).eq("id", existing.id);
    const { error } = await admin.from("user_roles").upsert({ user_id: existing.id, institute_id: institute, role: input.role, created_by: ctx.userId }, { onConflict: "user_id,institute_id,role", ignoreDuplicates: true });
    if (error) throw error;
    await audit(ctx, "role_granted", existing.id, { role: input.role, email });
    return { userId: existing.id, created: false, invited: false };
  }

  if (input.phone) {
    const { data: phoneOwner } = await admin.from("profiles").select("id").eq("institute_id", institute).eq("phone", input.phone).maybeSingle();
    if (phoneOwner) throw new Error("This mobile number is already used by another login. Use that person's email to link the account.");
  }

  let userId: string;
  let invited = false;
  if (input.mode === "invite") {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: input.fullName }, redirectTo: `${site}/auth/callback?next=/reset-password` });
    if (error || !data.user) throw new Error(error?.message.includes("rate limit") ? "Email rate limit reached. Try again later or set a password instead." : error?.message ?? "Could not send the invitation.");
    userId = data.user.id;
    invited = true;
  } else {
    if (!input.password) throw new Error("Password is required.");
    const { data, error } = await admin.auth.admin.createUser({ email, password: input.password, email_confirm: true, user_metadata: { full_name: input.fullName } });
    if (error || !data.user) throw new Error(error?.message ?? "Could not create the account.");
    userId = data.user.id;
  }

  const { error: pErr } = await admin.from("profiles").update({
    institute_id: institute, full_name: input.fullName, email, phone: input.phone ?? null,
    status: input.mode === "password" ? "active" : "pending_activation",
  }).eq("id", userId);
  if (pErr) throw pErr;
  const { error: rErr } = await admin.from("user_roles").insert({ user_id: userId, institute_id: institute, role: input.role, created_by: ctx.userId });
  if (rErr) throw rErr;
  await audit(ctx, "account_created", userId, { role: input.role, email, mode: input.mode });
  return { userId, created: true, invited };
}

async function audit(ctx: SessionContext, action: string, entityId: string, values: Record<string, unknown>) {
  const admin = createAdminClient();
  await admin.from("audit_logs").insert({ institute_id: ctx.institute!.id, user_id: ctx.userId, action, entity: "user_accounts", entity_id: entityId, new_values: values as never });
}
