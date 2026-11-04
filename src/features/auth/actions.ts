"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REMEMBER_COOKIE } from "@/lib/supabase/cookies";
import { normalizePhone, passwordSchema, phoneSchema, requiredText } from "@/lib/validations/common";
import { ROLE_HOME, type AppRole } from "@/lib/auth/session";

export type AuthState = { error?: string; message?: string } | undefined;

const GENERIC = "Incorrect mobile number/email or password.";

const STATUS_MESSAGES: Record<string, string> = {
  inactive: "Your account is inactive. Please contact the institute.",
  suspended: "Your account has been suspended. Please contact the institute.",
  pending_activation: "Your account has not been activated yet. Please contact the institute.",
  no_role: "Your account has no access assigned yet. Please contact the institute.",
};
export async function statusMessage(code?: string) {
  return code ? STATUS_MESSAGES[code] : undefined;
}

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

export async function loginAction(_: AuthState, form: FormData): Promise<AuthState> {
  const identifier = String(form.get("identifier") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const remember = form.get("remember") === "on";
  const next = String(form.get("next") ?? "");
  if (!identifier || !password) return { error: "Enter your mobile number or email and password." };

  let email = identifier.toLowerCase();
  if (!identifier.includes("@")) {
    const phone = normalizePhone(identifier);
    if (!/^\d{10}$/.test(phone)) return { error: GENERIC };
    // Resolve phone -> email server-side (never exposed to the browser).
    const admin = createAdminClient();
    const { data } = await admin.from("profiles").select("email").eq("phone", phone).not("email", "is", null).limit(2);
    if (!data || data.length !== 1) return { error: GENERIC };
    email = data[0].email!;
  }

  const store = await cookies();
  store.set(REMEMBER_COOKIE, remember ? "1" : "0", { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", ...(remember ? { maxAge: 60 * 60 * 24 * 400 } : {}) });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: GENERIC };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("status, institute_id").eq("id", data.user.id).single();
  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    return { error: STATUS_MESSAGES[profile?.status ?? "pending_activation"] };
  }
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", data.user.id).eq("institute_id", profile.institute_id!);
  const roleList = (roles ?? []).map((r) => r.role as AppRole);
  if (roleList.length === 0) {
    await supabase.auth.signOut();
    return { error: STATUS_MESSAGES.no_role };
  }

  await admin.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);
  await admin.from("audit_logs").insert({ institute_id: profile.institute_id, user_id: data.user.id, action: "login", entity: "auth", entity_id: data.user.id });

  const order: AppRole[] = ["admin", "teacher", "parent", "student"];
  const home = ROLE_HOME[order.find((r) => roleList.includes(r))!];
  const safeNext = next.startsWith("/") && !next.startsWith("//") && Object.entries(ROLE_HOME).some(([r, p]) => roleList.includes(r as AppRole) && next.startsWith(p)) ? next : home;
  redirect(safeNext);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(REMEMBER_COOKIE);
  redirect("/login");
}

export async function forgotPasswordAction(_: AuthState, form: FormData): Promise<AuthState> {
  const identifier = String(form.get("identifier") ?? "").trim();
  if (!identifier) return { error: "Enter your email or mobile number." };
  let email: string | null = identifier.includes("@") ? identifier.toLowerCase() : null;
  if (!email) {
    const admin = createAdminClient();
    const { data } = await admin.from("profiles").select("email").eq("phone", normalizePhone(identifier)).limit(1).maybeSingle();
    email = data?.email ?? null;
  }
  if (email) {
    // Implicit-flow client: the emailed link works on any device (PKCE would require the same browser).
    const { createClient: createPlain } = await import("@supabase/supabase-js");
    const plain = createPlain(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false } });
    await plain.auth.resetPasswordForEmail(email, { redirectTo: `${await siteUrl()}/auth/callback?next=/reset-password` });
  }
  // Same response whether or not the account exists (no account enumeration).
  return { message: "If an account exists, a password reset link has been sent to its email address." };
}

export async function resetPasswordAction(_: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const parsed = passwordSchema(8).safeParse(password);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (password !== confirm) return { error: "Passwords do not match." };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { error: "Your reset link has expired. Please request a new one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  const admin = createAdminClient();
  // An invited user who sets a password becomes active.
  await admin.from("profiles").update({ status: "active" }).eq("id", claims.claims.sub).eq("status", "pending_activation");
  redirect("/");
}

// ---------- First-run setup: only works while no institute exists ----------
const setupSchema = z.object({
  institute_name: requiredText("Institute name", 120),
  full_name: requiredText("Your name", 100),
  email: z.email("Enter a valid email address"),
  phone: phoneSchema,
  password: passwordSchema(8),
});

export async function isSetupComplete() {
  const admin = createAdminClient();
  const { count } = await admin.from("institutes").select("id", { count: "exact", head: true });
  return (count ?? 0) > 0;
}

export async function setupAction(_: AuthState, form: FormData): Promise<AuthState> {
  if (await isSetupComplete()) return { error: "Setup has already been completed. Please sign in." };
  const parsed = setupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const admin = createAdminClient();

  const { data: inst, error: instErr } = await admin.from("institutes").insert({ name: v.institute_name, phone: v.phone, email: v.email.toLowerCase() }).select("id").single();
  if (instErr || !inst) return { error: "Could not create the institute. Please try again." };
  const { error: seedErr } = await admin.rpc("seed_institute_defaults", { p_inst: inst.id });
  if (seedErr) {
    await admin.from("institutes").delete().eq("id", inst.id);
    return { error: "Could not initialise institute settings: " + seedErr.message };
  }

  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email: v.email.toLowerCase(),
    password: v.password,
    email_confirm: true,
    user_metadata: { full_name: v.full_name },
  });
  if (userErr || !created.user) {
    await admin.from("institutes").delete().eq("id", inst.id);
    return { error: userErr?.message ?? "Could not create the admin account." };
  }
  await admin.from("profiles").update({ institute_id: inst.id, full_name: v.full_name, phone: v.phone, email: v.email.toLowerCase(), status: "active" }).eq("id", created.user.id);
  await admin.from("user_roles").insert({ user_id: created.user.id, institute_id: inst.id, role: "admin" });

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email: v.email.toLowerCase(), password: v.password });
  redirect("/admin/settings?welcome=1");
}
