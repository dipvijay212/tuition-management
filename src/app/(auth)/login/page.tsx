import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { rememberedInstituteCode, statusMessage } from "@/features/auth/actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const error = await statusMessage(typeof sp.error === "string" ? sp.error : undefined);
  const explicitCode = typeof sp.code === "string" && sp.code ? sp.code.toUpperCase() : undefined;
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground">Sign in to your admin, teacher, student or parent account.</p>
      </div>
      <LoginForm next={typeof sp.next === "string" ? sp.next : undefined} initialError={error} defaultCode={explicitCode} />
      <div className="space-y-2 text-center text-xs text-muted-foreground">
        <p>
          New institute?{" "}
          <Link className="font-medium text-primary hover:underline" href="/register">
            Start a free trial
          </Link>
        </p>
        <p>
          Don&apos;t have an account? Accounts are created by your institute.{" "}
          <Link className="text-primary hover:underline" href="/forgot-password">
            Activate or reset
          </Link>
        </p>
        <p className="pt-2 border-t border-border/50">
          Platform super admin?{" "}
          <Link className="font-medium text-primary hover:underline" href="/platform/login">
            Platform sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
