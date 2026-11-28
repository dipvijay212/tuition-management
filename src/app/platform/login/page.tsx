import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { PlatformLoginForm } from "./login-form";

export const metadata: Metadata = { title: "Platform sign in" };

export default async function PlatformLoginPage() {
  const s = await getSession();
  if (s?.platform) redirect("/platform");
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-3">
          <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck className="size-6" /></span>
          <h1 className="text-2xl font-semibold tracking-tight">Platform admin</h1>
          <p className="text-sm text-muted-foreground">Manage institutes, plans and subscriptions. Institute staff sign in on the regular sign-in page.</p>
        </div>
        <PlatformLoginForm />
      </div>
    </main>
  );
}
