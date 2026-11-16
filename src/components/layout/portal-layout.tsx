import { AppShell } from "./app-shell";
import { requireRole, type AppRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";

type Shell = { unread: number; avatarUrl: string | null; logoUrl: string | null };

/** Server wrapper used by every portal layout: verifies role, then renders the shell. */
export async function PortalLayout({ role, children }: { role: AppRole; children: React.ReactNode }) {
  const s = await requireRole(role);
  const shell = await api<Shell>("/notifications/shell").catch((): Shell => ({ unread: 0, avatarUrl: null, logoUrl: null }));
  return (
    <AppShell
      role={role}
      roles={s.roles}
      instituteName={s.institute?.name ?? "Institute"}
      logoUrl={shell.logoUrl}
      user={{ name: s.profile.full_name || s.email || "User", email: s.email, avatarUrl: shell.avatarUrl }}
      unread={shell.unread}
    >
      {children}
    </AppShell>
  );
}
