"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { visibleNav } from "@/lib/permissions/navigation";
import type { AppRole, Feature } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export function SidebarNav({ role, features, collapsed = false, onNavigate }: { role: AppRole; features: Feature[]; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = visibleNav(role, features);
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/") || (item.href === "/admin/students" && pathname.startsWith("/admin/admissions"));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active && "bg-sidebar-accent text-sidebar-accent-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <Icon className={cn("size-[18px] shrink-0", active ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-sidebar-accent-foreground")} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
