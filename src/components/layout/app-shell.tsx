"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { GraduationCap, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "./notification-bell";
import type { AppRole, Feature } from "@/lib/auth/session";
import type { MyInstitute } from "@/features/auth/actions";
import { ROLE_LABEL } from "@/lib/permissions/navigation";
import { cn } from "@/lib/utils";

type Props = {
  role: AppRole;
  roles: AppRole[];
  features: Feature[];
  instituteName: string;
  logoUrl: string | null;
  user: { name: string; email: string | null; avatarUrl: string | null };
  unread: number;
  institutes: MyInstitute[];
  banner?: React.ReactNode;
  children: React.ReactNode;
};

// Sidebar collapse preference (per device). Storage may be unavailable (private mode) -> default expanded.
const KEY = "sidebar-collapsed";
const listeners = new Set<() => void>();
function subscribeCollapsed(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function readCollapsed() { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } }
function writeCollapsed(v: boolean) { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch {} listeners.forEach((l) => l()); }

function Brand({ instituteName, logoUrl, role, collapsed }: { instituteName: string; logoUrl: string | null; role: AppRole; collapsed?: boolean }) {
  return (
    <Link href={`/${role}`} className={cn("flex min-w-0 items-center gap-3 px-2", collapsed && "justify-center px-0")}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-9 rounded-lg object-cover" />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><GraduationCap className="size-5" /></span>
      )}
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{instituteName}</span>
          <span className="block text-xs text-muted-foreground">{ROLE_LABEL[role]} portal</span>
        </span>
      )}
    </Link>
  );
}

export function AppShell({ role, roles, features, instituteName, logoUrl, user, unread, institutes, banner, children }: Props) {
  const [open, setOpen] = useState(false);
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const toggle = () => writeCollapsed(!collapsed);

  return (
    <div className="flex min-h-dvh">
      <aside className={cn("no-print sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 lg:flex", collapsed ? "w-[72px]" : "w-64")}>
        <div className="flex h-16 items-center border-b px-3"><Brand instituteName={instituteName} logoUrl={logoUrl} role={role} collapsed={collapsed} /></div>
        <div className="flex-1 overflow-y-auto p-3"><SidebarNav role={role} features={features} collapsed={collapsed} /></div>
        <div className="border-t p-3">
          <Button variant="ghost" size="sm" onClick={toggle} className={cn("w-full justify-start gap-3 text-muted-foreground", collapsed && "justify-center")} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <PanelLeftOpen className="size-4" /> : <><PanelLeftClose className="size-4" /> Collapse</>}
          </Button>
        </div>
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-16 items-center border-b px-3"><Brand instituteName={instituteName} logoUrl={logoUrl} role={role} /></div>
          <div className="overflow-y-auto p-3"><SidebarNav role={role} features={features} onNavigate={() => setOpen(false)} /></div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-backdrop-filter:bg-background/70 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu className="size-5" /></Button>
          <div className="min-w-0 flex-1 truncate font-medium lg:hidden">{instituteName}</div>
          <div className="hidden flex-1 lg:block" />
          <NotificationBell role={role} initialUnread={unread} />
          <UserMenu role={role} roles={roles} user={user} institutes={institutes} />
        </header>
        {banner}
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
