import {
  LayoutDashboard, Users, GraduationCap, School, Layers, BookOpen, CalendarCheck, Wallet, Receipt,
  ClipboardList, Trophy, NotebookPen, FolderOpen, Landmark, BarChart3, Bell, UserCog, Settings,
  ScrollText, Megaphone, UserCircle, Baby, CreditCard, type LucideIcon,
} from "lucide-react";
import type { AppRole, Feature } from "@/lib/auth/session";

/** `feature`: shown only when the institute's plan includes it (the API enforces the same rule). */
export type NavItem = { label: string; href: string; icon: LucideIcon; ready: boolean; exact?: boolean; feature?: Feature };

/**
 * Sidebar per role (SOP §3). `ready: false` items are hidden until the module
 * is implemented and tested, so no menu item ever leads to a dead screen.
 */
export const NAVIGATION: Record<AppRole, NavItem[]> = {
  admin: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard, ready: true, exact: true },
    { label: "Students", href: "/admin/students", icon: Users, ready: true },
    { label: "Teachers", href: "/admin/teachers", icon: GraduationCap, ready: true },
    { label: "Classes", href: "/admin/classes", icon: School, ready: true },
    { label: "Batches", href: "/admin/batches", icon: Layers, ready: true },
    { label: "Subjects", href: "/admin/subjects", icon: BookOpen, ready: true },
    { label: "Attendance", href: "/admin/attendance", icon: CalendarCheck, ready: true },
    { label: "Fees Management", href: "/admin/fees", icon: Wallet, ready: true },
    { label: "Payments", href: "/admin/payments", icon: Receipt, ready: true },
    { label: "Examinations", href: "/admin/examinations", icon: ClipboardList, ready: true, feature: "exams" },
    { label: "Results", href: "/admin/results", icon: Trophy, ready: true, feature: "exams" },
    { label: "Homework", href: "/admin/homework", icon: NotebookPen, ready: true, feature: "homework" },
    { label: "Study Materials", href: "/admin/materials", icon: FolderOpen, ready: true, feature: "materials" },
    { label: "Income & Expenses", href: "/admin/finance", icon: Landmark, ready: false },
    { label: "Reports & Analytics", href: "/admin/reports", icon: BarChart3, ready: false },
    { label: "Notifications", href: "/admin/notifications", icon: Bell, ready: true },
    { label: "User Management", href: "/admin/users", icon: UserCog, ready: true },
    { label: "Subscription", href: "/admin/subscription", icon: CreditCard, ready: true },
    { label: "Settings", href: "/admin/settings", icon: Settings, ready: true },
    { label: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText, ready: true },
  ],
  teacher: [
    { label: "Dashboard", href: "/teacher", icon: LayoutDashboard, ready: true, exact: true },
    { label: "My Batches", href: "/teacher/batches", icon: Layers, ready: true },
    { label: "My Students", href: "/teacher/students", icon: Users, ready: true },
    { label: "Attendance", href: "/teacher/attendance", icon: CalendarCheck, ready: true },
    { label: "Homework", href: "/teacher/homework", icon: NotebookPen, ready: true, feature: "homework" },
    { label: "Study Materials", href: "/teacher/materials", icon: FolderOpen, ready: true, feature: "materials" },
    { label: "Examinations", href: "/teacher/examinations", icon: ClipboardList, ready: true, feature: "exams" },
    { label: "Results", href: "/teacher/results", icon: Trophy, ready: true, feature: "exams" },
    { label: "Announcements", href: "/teacher/announcements", icon: Megaphone, ready: false },
    { label: "Notifications", href: "/teacher/notifications", icon: Bell, ready: true },
    { label: "Profile", href: "/teacher/profile", icon: UserCircle, ready: true },
  ],
  student: [
    { label: "Dashboard", href: "/student", icon: LayoutDashboard, ready: true, exact: true },
    { label: "My Profile", href: "/student/profile", icon: UserCircle, ready: true },
    { label: "My Attendance", href: "/student/attendance", icon: CalendarCheck, ready: true },
    { label: "My Fees", href: "/student/fees", icon: Wallet, ready: true },
    { label: "Payment History", href: "/student/payments", icon: Receipt, ready: true },
    { label: "My Results", href: "/student/results", icon: Trophy, ready: true, feature: "exams" },
    { label: "Homework", href: "/student/homework", icon: NotebookPen, ready: true, feature: "homework" },
    { label: "Study Materials", href: "/student/materials", icon: FolderOpen, ready: true, feature: "materials" },
    { label: "Notifications", href: "/student/notifications", icon: Bell, ready: true },
  ],
  parent: [
    { label: "Dashboard", href: "/parent", icon: LayoutDashboard, ready: true, exact: true },
    { label: "My Children", href: "/parent/children", icon: Baby, ready: true },
    { label: "Attendance", href: "/parent/attendance", icon: CalendarCheck, ready: true },
    { label: "Fees & Payments", href: "/parent/fees", icon: Wallet, ready: true },
    { label: "Results", href: "/parent/results", icon: Trophy, ready: true, feature: "exams" },
    { label: "Homework", href: "/parent/homework", icon: NotebookPen, ready: true, feature: "homework" },
    { label: "Study Materials", href: "/parent/materials", icon: FolderOpen, ready: true, feature: "materials" },
    { label: "Notifications", href: "/parent/notifications", icon: Bell, ready: true },
    { label: "Profile", href: "/parent/profile", icon: UserCircle, ready: true },
  ],
};

export const ROLE_LABEL: Record<AppRole, string> = { admin: "Admin", teacher: "Teacher", student: "Student", parent: "Parent" };

export const visibleNav = (role: AppRole, features: Feature[]) =>
  NAVIGATION[role].filter((i) => i.ready && (!i.feature || features.includes(i.feature)));
