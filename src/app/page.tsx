import { redirect } from "next/navigation";
import { getSession, primaryRole, ROLE_HOME } from "@/lib/auth/session";

export default async function Home() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.profile.status !== "active") redirect(`/login?error=${s.profile.status}`);
  const role = primaryRole(s);
  redirect(role ? ROLE_HOME[role] : "/login?error=no_role");
}
