import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { requirePlatform } from "@/lib/auth/session";
import { platformLogoutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { PlatformNav } from "@/features/platform/platform-nav";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const s = await requirePlatform();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/platform" className="flex shrink-0 items-center gap-2 font-semibold">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><ShieldCheck className="size-5" /></span>
            <span className="hidden sm:inline">Platform</span>
          </Link>
          <PlatformNav />
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden truncate text-sm text-muted-foreground md:inline">{s.email}</span>
            <form action={platformLogoutAction}>
              <Button type="submit" variant="ghost" size="sm" aria-label="Sign out"><LogOut /> <span className="hidden sm:inline">Sign out</span></Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
