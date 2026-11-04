import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isSetupComplete } from "@/features/auth/actions";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Set up your institute" };

export default async function SetupPage() {
  await connection(); // must check the database on every request, never at build time
  if (await isSetupComplete()) redirect("/login");
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Set up your institute</h2>
        <p className="text-sm text-muted-foreground">Create the institute and the owner (admin) account. This page is only available once.</p>
      </div>
      <SetupForm />
    </div>
  );
}
