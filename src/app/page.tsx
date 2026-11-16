import { redirect } from "next/navigation";
import { getSession, primaryRole, ROLE_HOME } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.profile.status !== "active") {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect(`/login?error=${s.profile.status}`);
  }
  const role = primaryRole(s);
  if (!role) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?error=no_role");
  }
  redirect(ROLE_HOME[role]);
}
