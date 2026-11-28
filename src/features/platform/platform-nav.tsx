"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/platform", label: "Overview", exact: true },
  { href: "/platform/institutes", label: "Institutes" },
  { href: "/platform/plans", label: "Plans" },
];

export function PlatformNav() {
  const path = usePathname();
  return (
    <nav className="flex min-w-0 gap-1 overflow-x-auto" aria-label="Platform">
      {ITEMS.map((i) => {
        const active = i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/");
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn("rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground hover:bg-muted hover:text-foreground", active && "bg-muted text-foreground")}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
