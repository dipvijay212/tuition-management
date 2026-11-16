import { AppShell } from "./app-shell";
import { requireRole, type AppRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { publicBrandingUrl, signedUrl } from "@/lib/supabase/storage";

async function unreadCount() {
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return count ?? 0;
}

/** Server wrapper used by every portal layout: verifies role, then renders the shell. */
export async function PortalLayout({ role, children }: { role: AppRole; children: React.ReactNode }) {
  // The unread count is RLS-scoped to the caller, so it can start alongside the role check
  // instead of waiting for it (each sequential round trip to the hosted DB adds latency).
  const unreadP = unreadCount();
  unreadP.catch(() => {}); // avoid an unhandled rejection if requireRole redirects first
  const s = await requireRole(role);
  const [unread, avatarUrl] = await Promise.all([unreadP.catch(() => 0), signedUrl(s.profile.avatar_path)]);
  return (
    <AppShell
      role={role}
      roles={s.roles}
      instituteName={s.institute?.name ?? "Institute"}
      logoUrl={publicBrandingUrl(s.institute?.logo_path ?? null)}
      user={{ name: s.profile.full_name || s.email || "User", email: s.email, avatarUrl }}
      unread={unread}
    >
      {children}
    </AppShell>
  );
}
