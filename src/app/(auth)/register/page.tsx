import type { Metadata } from "next";
import Link from "next/link";
import { SetupForm } from "../setup/setup-form";

export const metadata: Metadata = { title: "Register your institute" };

export default function RegisterPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Register your institute</h2>
        <p className="text-sm text-muted-foreground">
          Create an institute and an admin account to start managing classes, batches, students, and fees.
        </p>
      </div>
      <SetupForm />
      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link className="font-medium text-primary hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
