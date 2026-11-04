import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { isSetupComplete, statusMessage } from "@/features/auth/actions";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  if (!(await isSetupComplete())) redirect("/setup");
  const error = await statusMessage(typeof sp.error === "string" ? sp.error : undefined);
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground">Sign in to your admin, teacher, student or parent account.</p>
      </div>
      <LoginForm next={typeof sp.next === "string" ? sp.next : undefined} initialError={error} />
      <p className="text-center text-xs text-muted-foreground">
        Don&apos;t have an account? Accounts are created by your institute. <Link className="text-primary hover:underline" href="/forgot-password">Activate or reset</Link>
      </p>
    </div>
  );
}
