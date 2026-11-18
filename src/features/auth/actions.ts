"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { api, ApiError, clearSessionCookie, clientMeta, setSessionCookie } from "@/lib/api/server";
import { passwordSchema } from "@/lib/validations/common";
import { ROLE_HOME, type AppRole } from "@/lib/auth/session";

export type AuthState = { error?: string; message?: string } | undefined;

const STATUS_MESSAGES: Record<string, string> = {
  inactive: "Your account is inactive. Please contact the institute.",
  suspended: "Your account has been suspended. Please contact the institute.",
  pending_activation: "Your account has not been activated yet. Please contact the institute.",
  no_role: "Your account has no access assigned yet. Please contact the institute.",
  institute_suspended: "This institute's account has been suspended. Please contact support.",
};

/** Last institute code used on this device, so people don't retype it. */
const INSTITUTE_COOKIE = "tc_institute";
export async function rememberedInstituteCode() {
  return (await cookies()).get(INSTITUTE_COOKIE)?.value ?? "";
}
async function rememberInstituteCode(code: string) {
  (await cookies()).set(INSTITUTE_COOKIE, code, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
}
const normalizeCode = (v: FormDataEntryValue | null) => String(v ?? "").trim().toUpperCase().replace(/[\s-]/g, "");
export async function statusMessage(code?: string) {
  return code ? STATUS_MESSAGES[code] : undefined;
}

type IssuedSession = { token: string; expiresAt: string; persistent: boolean };
const errorOf = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong. Please try again.");

export async function loginAction(_: AuthState, form: FormData): Promise<AuthState> {
  const institute_code = normalizeCode(form.get("institute_code"));
  const identifier = String(form.get("identifier") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const remember = form.get("remember") === "on";
  const next = String(form.get("next") ?? "");
  if (!institute_code) return { error: "Enter your institute code." };
  if (!identifier || !password) return { error: "Enter your mobile number or email and password." };

  let res: IssuedSession & { roles: AppRole[]; home: string; institute: { code: string } };
  try {
    res = await api("/auth/login", { method: "POST", token: null, body: { institute_code, identifier, password, remember, ...(await clientMeta()) } });
  } catch (e) {
    return { error: errorOf(e) };
  }
  await setSessionCookie(res);
  await rememberInstituteCode(res.institute.code);

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
  const institute_code = normalizeCode(form.get("institute_code"));
  if (!identifier) return { error: "Enter your email or mobile number." };
  try {
    const r = await api<{ message: string }>("/auth/forgot-password", { method: "POST", token: null, body: { identifier, institute_code } });
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

// ---------- Institute registration / setup ----------
export async function isSetupComplete() {
  const r = await api<{ complete: boolean }>("/auth/setup-status", { token: null });
  return r.complete;
}

export async function setupAction(_: AuthState, form: FormData): Promise<AuthState> {
  const f = Object.fromEntries(form) as Record<string, string>;
  let res: IssuedSession & { home: string; institute_code: string };
  try {
    res = await api("/auth/register", {
      method: "POST",
      token: null,
      body: {
        institute_name: f.institute_name ?? "",
        institute_code: normalizeCode(f.institute_code ?? ""),
        full_name: f.full_name ?? "",
        email: f.email ?? "",
        phone: f.phone ?? "",
        password: f.password ?? "",
        ...(await clientMeta()),
      },
    });
  } catch (e) {
    return { error: errorOf(e) };
  }
  await setSessionCookie(res);
  await rememberInstituteCode(res.institute_code);
  redirect(res.home);
}

/** Live check used by the registration form. */
export async function checkInstituteCode(code: string): Promise<{ available: boolean; code?: string; reason?: string }> {
  const c = normalizeCode(code);
  if (!c) return { available: false };
  try {
    return await api(`/auth/code-available/${encodeURIComponent(c)}`, { token: null });
  } catch {
    return { available: false };
  }
}

// ---------- Institute switcher (one login, several institutes) ----------
export type MyInstitute = { id: string; name: string; code: string; logo_path: string | null; roles: AppRole[]; current: boolean };
export async function myInstitutesAction(): Promise<MyInstitute[]> {
  try {
    return await api<MyInstitute[]>("/auth/institutes");
  } catch {
    return [];
  }
}

export async function switchInstituteAction(instituteId: string): Promise<{ error?: string }> {
  let res: { home: string };
  try {
    res = await api("/auth/switch", { method: "POST", body: { institute_id: instituteId } });
    const list = await api<MyInstitute[]>("/auth/institutes");
    const code = list.find((i) => i.id === instituteId)?.code;
    if (code) await rememberInstituteCode(code);
  } catch (e) {
    return { error: errorOf(e) };
  }
  redirect(res.home);
}

// ---------- Platform (super admin) ----------
export async function platformLoginAction(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  let res: IssuedSession & { home: string };
  try {
    res = await api("/auth/platform-login", { method: "POST", token: null, body: { email, password, ...(await clientMeta()) } });
  } catch (e) {
    return { error: errorOf(e) };
  }
  await setSessionCookie(res);
  redirect(res.home);
}

export async function platformLogoutAction() {
  try {
    await api("/auth/logout", { method: "POST", body: {} });
  } catch {
    // already gone
  }
  await clearSessionCookie();
  redirect("/platform/login");
}

export const registerInstituteAction = setupAction;
