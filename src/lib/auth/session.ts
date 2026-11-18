import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { api, ApiError, SESSION_COOKIE } from "@/lib/api/server";

export type AppRole = "admin" | "teacher" | "student" | "parent";
export const ROLE_HOME: Record<AppRole, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
};

export type Feature = "exams" | "homework" | "materials";
/** trial/active/grace = full access; expired = read-only; suspended = blocked by the platform. */
export type Access = "trial" | "active" | "grace" | "expired" | "suspended";
export type SubscriptionInfo = {
  access: Access;
  readOnly: boolean;
  status: "trialing" | "active" | "cancelled" | null;
  plan: { code: string; name: string } | null;
  billingCycle: "monthly" | "yearly" | null;
  endsAt: string | null;
  daysLeft: number | null;
  features: Feature[];
  limits: { students: number | null; teachers: number | null; batches: number | null; storageMb: number | null };
};

export type SessionContext = {
  userId: string;
  email: string | null;
  profile: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    avatar_path: string | null;
    status: "active" | "inactive" | "suspended" | "pending_activation";
    institute_id: string | null;
  };
  roles: AppRole[];
  institute: { id: string; name: string; logo_path: string | null; code: string } | null;
  subscription: SubscriptionInfo | null;
  timezone: string;
  /** Platform staff (super admin) session. */
  platform: boolean;
};

/**
 * The signed-in user's profile + roles, loaded by the backend from protected tables
 * (never from client input). Cached per request.
 */
export const getSession = cache(async (): Promise<SessionContext | null> => {
  if (!(await cookies()).get(SESSION_COOKIE)?.value) return null;
  try {
    return await api<SessionContext>("/auth/session");
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
    throw e;
  }
});

export function primaryRole(s: SessionContext): AppRole | null {
  return s.roles[0] ?? null;
}

/**
 * Guard for portal layouts, pages and server actions.
 * Redirects instead of rendering for anyone who is signed out, inactive or lacks the role.
 */
export async function requireRole(...allowed: AppRole[]): Promise<SessionContext> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.platform) redirect("/platform");
  if (s.subscription?.access === "suspended") redirect("/login?error=institute_suspended");
  if (s.profile.status !== "active") redirect(`/login?error=${s.profile.status}`);
  if (!s.roles.some((r) => allowed.includes(r))) {
    const home = primaryRole(s);
    redirect(home ? ROLE_HOME[home] : "/login?error=no_role");
  }
  return s;
}

/** For server actions: throws instead of redirecting. */
export async function assertRole(...allowed: AppRole[]): Promise<SessionContext> {
  const s = await getSession();
  if (!s || s.profile.status !== "active" || !s.roles.some((r) => allowed.includes(r))) {
    throw new Error("You are not authorized to perform this action");
  }
  return s;
}

/** Guard for the platform (super admin) portal. */
export async function requirePlatform(): Promise<SessionContext> {
  const s = await getSession();
  if (!s?.platform) redirect("/platform/login");
  return s;
}

export async function assertPlatform(): Promise<SessionContext> {
  const s = await getSession();
  if (!s?.platform) throw new Error("You are not authorized to perform this action");
  return s;
}

/** Plan feature check (pages/nav). The API enforces the same rule. */
export const hasFeature = (s: SessionContext | null, f: Feature) => !!s?.subscription?.features.includes(f);
