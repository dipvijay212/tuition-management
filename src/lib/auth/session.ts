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

  // Auto-heal / link roles if the user exists in guardians, students, or teachers by email or phone
  if (roles.length === 0) {
    const healed = await healUserRoles(
      userId,
      (claims?.claims?.email as string | undefined) ?? profile.email,
      profile.phone
    );
    if (healed.roles.length > 0) {
      roles = healed.roles;
      institute = healed.institute;
      timezone = healed.timezone;
      profile.institute_id = healed.instituteId;
      profile.status = "active";
    }
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

export async function healUserRoles(
  userId: string,
  email?: string | null,
  phone?: string | null
): Promise<{
  roles: AppRole[];
  institute: SessionContext["institute"];
  timezone: string;
  instituteId: string | null;
}> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  let userEmail = email?.trim().toLowerCase();
  let userPhone = phone?.trim();

  if (!userEmail || !userPhone) {
    const { data: prof } = await admin.from("profiles").select("email, phone").eq("id", userId).maybeSingle();
    userEmail = userEmail || prof?.email?.trim().toLowerCase();
    userPhone = userPhone || prof?.phone?.trim();
  }

  if (!userEmail) {
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    userEmail = authUser?.user?.email?.trim().toLowerCase();
    userPhone = userPhone || authUser?.user?.phone?.trim();
  }

  // 0. Check if user_roles ALREADY has any role for this user
  const { data: existingRoles } = await admin
    .from("user_roles")
    .select("role, institute_id")
    .eq("user_id", userId);

  if (existingRoles && existingRoles.length > 0) {
    const instId = existingRoles[0].institute_id;
    await admin.from("profiles").update({
      institute_id: instId,
      status: "active",
      ...(userEmail ? { email: userEmail } : {}),
      ...(userPhone ? { phone: userPhone } : {}),
    }).eq("id", userId);

    if (userEmail) {
      await admin.from("guardians").update({ profile_id: userId }).eq("institute_id", instId).ilike("email", userEmail);
      await admin.from("students").update({ profile_id: userId }).eq("institute_id", instId).ilike("email", userEmail);
      await admin.from("teachers").update({ profile_id: userId }).eq("institute_id", instId).ilike("email", userEmail);
    }

    const [{ data: inst }, { data: settings }] = await Promise.all([
      admin.from("institutes").select("id, name, logo_path").eq("id", instId).maybeSingle(),
      admin.from("institute_settings").select("timezone").eq("institute_id", instId).maybeSingle(),
    ]);

    const activeRoles = ROLE_PRIORITY.filter((r) => existingRoles.some((x) => x.role === r));
    return {
      roles: activeRoles,
      institute: inst ?? null,
      timezone: settings?.timezone ?? "Asia/Kolkata",
      instituteId: instId,
    };
  }

  // 1. Check if user matches a guardian
  const guardianOrFilters: string[] = [`profile_id.eq.${userId}`];
  if (userEmail) guardianOrFilters.push(`email.ilike.${userEmail}`);
  if (userPhone) guardianOrFilters.push(`phone.eq.${userPhone}`);

  const { data: guardian } = await admin
    .from("guardians")
    .select("id, institute_id, profile_id, full_name, email, phone")
    .or(guardianOrFilters.join(","))
    .limit(1)
    .maybeSingle();

  if (guardian) {
    await admin.from("profiles").update({
      institute_id: guardian.institute_id,
      status: "active",
      email: userEmail || guardian.email || null,
      ...(guardian.full_name ? { full_name: guardian.full_name } : {}),
      ...(guardian.phone ? { phone: guardian.phone } : {}),
    }).eq("id", userId);

    await admin.from("guardians").update({ profile_id: userId }).eq("id", guardian.id);
    await admin.from("user_roles").upsert(
      { user_id: userId, institute_id: guardian.institute_id, role: "parent" },
      { onConflict: "user_id,institute_id,role" }
    );

    const [{ data: inst }, { data: settings }] = await Promise.all([
      admin.from("institutes").select("id, name, logo_path").eq("id", guardian.institute_id).maybeSingle(),
      admin.from("institute_settings").select("timezone").eq("institute_id", guardian.institute_id).maybeSingle(),
    ]);

    return {
      roles: ["parent"],
      institute: inst ?? null,
      timezone: settings?.timezone ?? "Asia/Kolkata",
      instituteId: guardian.institute_id,
    };
  }

  // 2. Check if user matches a student
  const studentOrFilters: string[] = [`profile_id.eq.${userId}`];
  if (userEmail) studentOrFilters.push(`email.ilike.${userEmail}`);
  if (userPhone) studentOrFilters.push(`phone.eq.${userPhone}`);

  const { data: student } = await admin
    .from("students")
    .select("id, institute_id, profile_id, full_name, email, phone")
    .or(studentOrFilters.join(","))
    .limit(1)
    .maybeSingle();

  if (student) {
    await admin.from("profiles").update({
      institute_id: student.institute_id,
      status: "active",
      email: userEmail || student.email || null,
      ...(student.full_name ? { full_name: student.full_name } : {}),
      ...(student.phone ? { phone: student.phone } : {}),
    }).eq("id", userId);

    await admin.from("students").update({ profile_id: userId }).eq("id", student.id);
    await admin.from("user_roles").upsert(
      { user_id: userId, institute_id: student.institute_id, role: "student" },
      { onConflict: "user_id,institute_id,role" }
    );

    const [{ data: inst }, { data: settings }] = await Promise.all([
      admin.from("institutes").select("id, name, logo_path").eq("id", student.institute_id).maybeSingle(),
      admin.from("institute_settings").select("timezone").eq("institute_id", student.institute_id).maybeSingle(),
    ]);

    return {
      roles: ["student"],
      institute: inst ?? null,
      timezone: settings?.timezone ?? "Asia/Kolkata",
      instituteId: student.institute_id,
    };
  }

  // 3. Check if user matches a teacher
  const teacherOrFilters: string[] = [`profile_id.eq.${userId}`];
  if (userEmail) teacherOrFilters.push(`email.ilike.${userEmail}`);
  if (userPhone) teacherOrFilters.push(`phone.eq.${userPhone}`);

  const { data: teacher } = await admin
    .from("teachers")
    .select("id, institute_id, profile_id, full_name, email, phone")
    .or(teacherOrFilters.join(","))
    .limit(1)
    .maybeSingle();

  if (teacher) {
    await admin.from("profiles").update({
      institute_id: teacher.institute_id,
      status: "active",
      email: userEmail || teacher.email || null,
      ...(teacher.full_name ? { full_name: teacher.full_name } : {}),
      ...(teacher.phone ? { phone: teacher.phone } : {}),
    }).eq("id", userId);

    await admin.from("teachers").update({ profile_id: userId }).eq("id", teacher.id);
    await admin.from("user_roles").upsert(
      { user_id: userId, institute_id: teacher.institute_id, role: "teacher" },
      { onConflict: "user_id,institute_id,role" }
    );

    const [{ data: inst }, { data: settings }] = await Promise.all([
      admin.from("institutes").select("id, name, logo_path").eq("id", teacher.institute_id).maybeSingle(),
      admin.from("institute_settings").select("timezone").eq("institute_id", teacher.institute_id).maybeSingle(),
    ]);

    return {
      roles: ["teacher"],
      institute: inst ?? null,
      timezone: settings?.timezone ?? "Asia/Kolkata",
      instituteId: teacher.institute_id,
    };
  }

  return { roles: [], institute: null, timezone: "Asia/Kolkata", instituteId: null };
}

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
