import type { AppRole } from "@/lib/auth/session";

/** Notification links are stored role-neutral (e.g. "/fees"); map them into the viewer's portal. */
export function resolveNotificationLink(role: AppRole, link: string | null) {
  if (!link) return `/${role}/notifications`;
  if (/^\/(admin|teacher|student|parent)(\/|$)/.test(link)) return link;
  const map: Record<string, Partial<Record<AppRole, string>>> = {
    "/fees": { student: "/student/fees", parent: "/parent/fees", admin: "/admin/fees" },
    "/attendance": { student: "/student/attendance", parent: "/parent/attendance", teacher: "/teacher/attendance", admin: "/admin/attendance" },
    "/results": { student: "/student/results", parent: "/parent/results", teacher: "/teacher/results", admin: "/admin/results" },
    "/homework": { student: "/student/homework", parent: "/parent/homework", teacher: "/teacher/homework", admin: "/admin/homework" },
    "/timetable": { student: "/student/timetable", parent: "/parent/timetable", teacher: "/teacher/timetable", admin: "/admin/timetable" },
    "/notifications": {},
  };
  if (link.startsWith("/receipts/")) return `/${role === "admin" ? "admin/payments" : role + "/payments"}/${link.split("/")[2]}`;
  return map[link]?.[role] ?? `/${role}/notifications`;
}
