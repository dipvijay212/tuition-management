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

  const { data: existing } = await admin.from("profiles").select("id, institute_id, status").ilike("email", email).maybeSingle();
  if (existing) {
    if (existing.institute_id && existing.institute_id !== institute) throw new Error("This email is registered with another institute.");
    await admin.from("profiles").update({ institute_id: institute, ...(input.phone ? { phone: input.phone } : {}) }).eq("id", existing.id);
    const { error } = await admin.from("user_roles").upsert({ user_id: existing.id, institute_id: institute, role: input.role, created_by: ctx.userId }, { onConflict: "user_id,institute_id,role", ignoreDuplicates: true });
    if (error) throw error;
    await audit(ctx, "role_granted", existing.id, { role: input.role, email });

    // If invitation is requested, still send an invitation link so they can access this role
    if (input.mode === "invite") {
      const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100").replace(/\/$/, "");
      const redirectTo = `${site}/auth/callback?next=/reset-password`;

      const linkRes = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { data: { full_name: input.fullName }, redirectTo },
      });

      const props = linkRes.data?.properties;
      const actionLink = props?.hashed_token
        ? `${site}/auth/callback?token_hash=${props.hashed_token}&type=recovery&next=/reset-password`
        : props?.action_link;

      if (actionLink) {
        const { renderInvitationEmail, sendEmail } = await import("@/lib/email");
        const tpl = renderInvitationEmail({
          instituteName: ctx.institute?.name,
          recipientName: input.fullName,
          recipientEmail: email,
          role: input.role,
          actionLink,
        });

        await sendEmail({
          to: email,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          instituteId: institute,
        });
      }
      return { userId: existing.id, created: false, invited: true };
    }

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
    const redirectTo = `${site}/auth/callback?next=/reset-password`;

    // 1. Generate activation link via Supabase Auth Admin (does not send Supabase rate-limited emails)
    let actionLink: string | null = null;
    let linkUser = null;

    const linkRes = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        data: { full_name: input.fullName },
        redirectTo,
      },
    });

    if (linkRes.error || !linkRes.data.user) {
      // If user already exists in auth pool, generate a magiclink / recovery link
      const fallbackRes = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          data: { full_name: input.fullName },
          redirectTo,
        },
      });

      if (fallbackRes.error || !fallbackRes.data.user) {
        throw new Error(linkRes.error?.message ?? fallbackRes.error?.message ?? "Could not generate invitation link.");
      }
      const props = fallbackRes.data.properties;
      actionLink = props.hashed_token
        ? `${site}/auth/callback?token_hash=${props.hashed_token}&type=recovery&next=/reset-password`
        : props.action_link;
      linkUser = fallbackRes.data.user;
    } else {
      const props = linkRes.data.properties;
      actionLink = props.hashed_token
        ? `${site}/auth/callback?token_hash=${props.hashed_token}&type=invite&next=/reset-password`
        : props.action_link;
      linkUser = linkRes.data.user;
    }

    userId = linkUser.id;
    invited = true;

    // 2. Dispatch customized, branded invitation email via Nodemailer
    if (actionLink) {
      const { renderInvitationEmail, sendEmail } = await import("@/lib/email");
      const tpl = renderInvitationEmail({
        instituteName: ctx.institute?.name,
        recipientName: input.fullName,
        recipientEmail: email,
        role: input.role,
        actionLink,
      });

      await sendEmail({
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        instituteId: institute,
      });
    }
  } else {
    if (!input.password) throw new Error("Password is required.");
    const { data, error } = await admin.auth.admin.createUser({ email, password: input.password, email_confirm: true, user_metadata: { full_name: input.fullName } });
    if (error || !data.user) throw new Error(error?.message ?? "Could not create the account.");
    userId = data.user.id;
  }

  const { error: pErr } = await admin.from("profiles").upsert({
    id: userId,
    institute_id: institute,
    full_name: input.fullName,
    email,
    phone: input.phone ?? null,
    status: input.mode === "password" ? "active" : "pending_activation",
  });
  if (pErr) throw pErr;
  const { error: rErr } = await admin.from("user_roles").upsert(
    { user_id: userId, institute_id: institute, role: input.role, created_by: ctx.userId },
    { onConflict: "user_id,institute_id,role" }
  );
  if (rErr) throw rErr;
  await audit(ctx, "account_created", userId, { role: input.role, email, mode: input.mode });
  return { userId, created: true, invited };
}

async function audit(ctx: SessionContext, action: string, entityId: string, values: Record<string, unknown>) {
  const admin = createAdminClient();
  await admin.from("audit_logs").insert({ institute_id: ctx.institute!.id, user_id: ctx.userId, action, entity: "user_accounts", entity_id: entityId, new_values: values as never });
}
