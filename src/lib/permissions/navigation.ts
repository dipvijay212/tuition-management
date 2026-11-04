import {
  LayoutDashboard, Users, UserPlus, GraduationCap, School, Layers, BookOpen, CalendarCheck, Wallet, Receipt,
  ClipboardList, Trophy, NotebookPen, FolderOpen, CalendarDays, Landmark, BarChart3, Bell, UserCog, Settings,
  ScrollText, Megaphone, UserCircle, Baby, type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/lib/auth/session";

export type NavItem = { label: string; href: string; icon: LucideIcon; ready: boolean; exact?: boolean };

/**
 * Sidebar per role (SOP §3). `ready: false` items are hidden until the module
 * is implemented and tested, so no menu item ever leads to a dead screen.
 */
export const NAVIGATION: Record<AppRole, NavItem[]> = {
  admin: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard, ready: true, exact: true },
    { label: "Students", href: "/admin/students", icon: Users, ready: true },
    { label: "Admissions", href: "/admin/admissions", icon: UserPlus, ready: true },
    { label: "Teachers", href: "/admin/teachers", icon: GraduationCap, ready: true },
    { label: "Classes", href: "/admin/classes", icon: School, ready: true },
    { label: "Batches", href: "/admin/batches", icon: Layers, ready: true },
    { label: "Subjects", href: "/admin/subjects", icon: BookOpen, ready: true },
    { label: "Attendance", href: "/admin/attendance", icon: CalendarCheck, ready: false },
    { label: "Fees Management", href: "/admin/fees", icon: Wallet, ready: false },
    { label: "Payments", href: "/admin/payments", icon: Receipt, ready: false },
    { label: "Examinations", href: "/admin/examinations", icon: ClipboardList, ready: false },
    { label: "Results", href: "/admin/results", icon: Trophy, ready: false },
    { label: "Homework", href: "/admin/homework", icon: NotebookPen, ready: false },
    { label: "Study Materials", href: "/admin/materials", icon: FolderOpen, ready: false },
    { label: "Timetable", href: "/admin/timetable", icon: CalendarDays, ready: false },
    { label: "Income & Expenses", href: "/admin/finance", icon: Landmark, ready: false },
    { label: "Reports & Analytics", href: "/admin/reports", icon: BarChart3, ready: false },
    { label: "Notifications", href: "/admin/notifications", icon: Bell, ready: true },
    { label: "User Management", href: "/admin/users", icon: UserCog, ready: true },
    { label: "Settings", href: "/admin/settings", icon: Settings, ready: true },
    { label: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText, ready: true },
  ],
  teacher: [
    { label: "Dashboard", href: "/teacher", icon: LayoutDashboard, ready: true, exact: true },
    { label: "My Batches", href: "/teacher/batches", icon: Layers, ready: true },
    { label: "My Students", href: "/teacher/students", icon: Users, ready: true },
    { label: "Attendance", href: "/teacher/attendance", icon: CalendarCheck, ready: false },
    { label: "Homework", href: "/teacher/homework", icon: NotebookPen, ready: false },
    { label: "Study Materials", href: "/teacher/materials", icon: FolderOpen, ready: false },
    { label: "Examinations", href: "/teacher/examinations", icon: ClipboardList, ready: false },
    { label: "Results", href: "/teacher/results", icon: Trophy, ready: false },
    { label: "Timetable", href: "/teacher/timetable", icon: CalendarDays, ready: false },
    { label: "Announcements", href: "/teacher/announcements", icon: Megaphone, ready: false },
    { label: "Notifications", href: "/teacher/notifications", icon: Bell, ready: true },
    { label: "Profile", href: "/teacher/profile", icon: UserCircle, ready: true },
  ],
  student: [
    { label: "Dashboard", href: "/student", icon: LayoutDashboard, ready: true, exact: true },
    { label: "My Profile", href: "/student/profile", icon: UserCircle, ready: true },
    { label: "My Attendance", href: "/student/attendance", icon: CalendarCheck, ready: false },
    { label: "My Fees", href: "/student/fees", icon: Wallet, ready: false },
    { label: "Payment History", href: "/student/payments", icon: Receipt, ready: false },
    { label: "My Results", href: "/student/results", icon: Trophy, ready: false },
    { label: "Homework", href: "/student/homework", icon: NotebookPen, ready: false },
    { label: "Study Materials", href: "/student/materials", icon: FolderOpen, ready: false },
    { label: "Timetable", href: "/student/timetable", icon: CalendarDays, ready: false },
    { label: "Notifications", href: "/student/notifications", icon: Bell, ready: true },
  ],
  parent: [
    { label: "Dashboard", href: "/parent", icon: LayoutDashboard, ready: true, exact: true },
    { label: "My Children", href: "/parent/children", icon: Baby, ready: true },
    { label: "Attendance", href: "/parent/attendance", icon: CalendarCheck, ready: false },
    { label: "Fees & Payments", href: "/parent/fees", icon: Wallet, ready: false },
    { label: "Results", href: "/parent/results", icon: Trophy, ready: false },
    { label: "Homework", href: "/parent/homework", icon: NotebookPen, ready: false },
    { label: "Study Materials", href: "/parent/materials", icon: FolderOpen, ready: false },
    { label: "Timetable", href: "/parent/timetable", icon: CalendarDays, ready: false },
    { label: "Notifications", href: "/parent/notifications", icon: Bell, ready: true },
    { label: "Profile", href: "/parent/profile", icon: UserCircle, ready: true },
  ],
};

export const ROLE_LABEL: Record<AppRole, string> = { admin: "Admin", teacher: "Teacher", student: "Student", parent: "Parent" };
