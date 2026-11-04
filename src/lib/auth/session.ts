import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "teacher" | "student" | "parent";
export const ROLE_HOME: Record<AppRole, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
};
const ROLE_PRIORITY: AppRole[] = ["admin", "teacher", "parent", "student"];

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
  institute: { id: string; name: string; logo_path: string | null } | null;
  timezone: string;
};

/** Loads the signed-in user's profile + roles from protected tables (never from client input). */
export const getSession = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, avatar_path, status, institute_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  let roles: AppRole[] = [];
  let institute: SessionContext["institute"] = null;
  let timezone = "Asia/Kolkata";
  if (profile.status === "active" && profile.institute_id) {
    const [{ data: r }, { data: inst }, { data: settings }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).eq("institute_id", profile.institute_id),
      supabase.from("institutes").select("id, name, logo_path").eq("id", profile.institute_id).maybeSingle(),
      supabase.from("institute_settings").select("timezone").eq("institute_id", profile.institute_id).maybeSingle(),
    ]);
    roles = ROLE_PRIORITY.filter((role) => r?.some((x) => x.role === role));
    institute = inst ?? null;
    timezone = settings?.timezone ?? timezone;
  }
  return {
    userId,
    email: (claims?.claims?.email as string | undefined) ?? profile.email,
    profile: profile as SessionContext["profile"],
    roles,
    institute,
    timezone,
  };
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
