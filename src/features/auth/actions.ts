"use server";
import { redirect } from "next/navigation";
import { api, ApiError, clearSessionCookie, clientMeta, setSessionCookie } from "@/lib/api/server";
import { passwordSchema } from "@/lib/validations/common";
import { ROLE_HOME, type AppRole } from "@/lib/auth/session";

export type AuthState = { error?: string; message?: string } | undefined;

const STATUS_MESSAGES: Record<string, string> = {
  inactive: "Your account is inactive. Please contact the institute.",
  suspended: "Your account has been suspended. Please contact the institute.",
  pending_activation: "Your account has not been activated yet. Please contact the institute.",
  no_role: "Your account has no access assigned yet. Please contact the institute.",
};
export async function statusMessage(code?: string) {
  return code ? STATUS_MESSAGES[code] : undefined;
}

type IssuedSession = { token: string; expiresAt: string; persistent: boolean };
const errorOf = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong. Please try again.");

export async function loginAction(_: AuthState, form: FormData): Promise<AuthState> {
  const identifier = String(form.get("identifier") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const remember = form.get("remember") === "on";
  const next = String(form.get("next") ?? "");
  if (!identifier || !password) return { error: "Enter your mobile number or email and password." };

  let res: IssuedSession & { roles: AppRole[]; home: string };
  try {
    res = await api("/auth/login", { method: "POST", token: null, body: { identifier, password, remember, ...(await clientMeta()) } });
  } catch (e) {
    return { error: errorOf(e) };
  }
  await setSessionCookie(res);

  const safeNext =
    next.startsWith("/") && !next.startsWith("//") && Object.entries(ROLE_HOME).some(([r, p]) => res.roles.includes(r as AppRole) && next.startsWith(p))
      ? next
      : res.home;
  redirect(safeNext);
}

export async function logoutAction() {
  try {
    await api("/auth/logout", { method: "POST", body: {} });
  } catch {
    // Session already gone: still clear the cookie.
  }
  await clearSessionCookie();
  redirect("/login");
}

export async function forgotPasswordAction(_: AuthState, form: FormData): Promise<AuthState> {
  const identifier = String(form.get("identifier") ?? "").trim();
  if (!identifier) return { error: "Enter your email or mobile number." };
  try {
    const r = await api<{ message: string }>("/auth/forgot-password", { method: "POST", token: null, body: { identifier } });
    return { message: r.message };
  } catch (e) {
    return { error: errorOf(e) };
  }
}

/** Called by /auth/callback: exchanges a single-use email link for a session. */
export async function verifyEmailLinkAction(token: string): Promise<{ ok: true; next: string } | { ok: false; error: string }> {
  try {
    const s = await api<IssuedSession & { type: "invite" | "recovery" }>("/auth/verify-link", { method: "POST", token: null, body: { token, ...(await clientMeta()) } });
    await setSessionCookie(s);
    return { ok: true, next: "/reset-password" };
  } catch (e) {
    return { ok: false, error: errorOf(e) };
  }
}

export async function resetPasswordAction(_: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const parsed = passwordSchema(8).safeParse(password);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (password !== confirm) return { error: "Passwords do not match." };
  try {
    await api("/auth/reset-password", { method: "POST", body: { password } });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return { error: "Your reset link has expired. Please request a new one." };
    return { error: errorOf(e) };
  }
  redirect("/");
}

// ---------- First-run setup: only works while no institute exists ----------
export async function isSetupComplete() {
  const r = await api<{ complete: boolean }>("/auth/setup-status", { token: null });
  return r.complete;
}

export async function setupAction(_: AuthState, form: FormData): Promise<AuthState> {
  const f = Object.fromEntries(form) as Record<string, string>;
  let res: IssuedSession & { home: string };
  try {
    res = await api("/auth/setup", {
      method: "POST",
      token: null,
      body: { institute_name: f.institute_name ?? "", full_name: f.full_name ?? "", email: f.email ?? "", phone: f.phone ?? "", password: f.password ?? "", ...(await clientMeta()) },
    });
  } catch (e) {
    return { error: errorOf(e) };
  }
  await setSessionCookie(res);
  redirect(res.home);
}
