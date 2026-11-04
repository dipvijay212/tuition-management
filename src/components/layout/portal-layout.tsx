import { AppShell } from "./app-shell";
import { requireRole, type AppRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { publicBrandingUrl, signedUrl } from "@/lib/supabase/storage";

/** Server wrapper used by every portal layout: verifies role, then renders the shell. */
export async function PortalLayout({ role, children }: { role: AppRole; children: React.ReactNode }) {
  const s = await requireRole(role);
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return (
    <AppShell
      role={role}
      roles={s.roles}
      instituteName={s.institute?.name ?? "Institute"}
      logoUrl={publicBrandingUrl(s.institute?.logo_path ?? null)}
      user={{ name: s.profile.full_name || s.email || "User", email: s.email, avatarUrl: await signedUrl(s.profile.avatar_path) }}
      unread={count ?? 0}
    >
      {children}
    </AppShell>
  );
}
