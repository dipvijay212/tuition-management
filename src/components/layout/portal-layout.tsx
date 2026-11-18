import { AppShell } from "./app-shell";
import { SubscriptionBanner } from "./subscription-banner";
import { requireRole, type AppRole } from "@/lib/auth/session";
import { api } from "@/lib/api/server";
import type { MyInstitute } from "@/features/auth/actions";

type Shell = { unread: number; avatarUrl: string | null; logoUrl: string | null };

/** Server wrapper used by every portal layout: verifies role, then renders the shell. */
export async function PortalLayout({ role, children }: { role: AppRole; children: React.ReactNode }) {
  const s = await requireRole(role);
  // Independent calls run in parallel.
  const [shell, institutes] = await Promise.all([
    api<Shell>("/notifications/shell").catch((): Shell => ({ unread: 0, avatarUrl: null, logoUrl: null })),
    api<MyInstitute[]>("/auth/institutes").catch((): MyInstitute[] => []),
  ]);
  return (
    <AppShell
      role={role}
      roles={s.roles}
      features={s.subscription?.features ?? []}
      instituteName={s.institute?.name ?? "Institute"}
      logoUrl={shell.logoUrl}
      user={{ name: s.profile.full_name || s.email || "User", email: s.email, avatarUrl: shell.avatarUrl }}
      unread={shell.unread}
      institutes={institutes}
      banner={<SubscriptionBanner subscription={s.subscription} isAdmin={s.roles.includes("admin")} />}
    >
      {children}
    </AppShell>
  );
}
