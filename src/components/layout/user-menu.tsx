"use client";
import Link from "next/link";
import { useTheme } from "next-themes";
import { LogOut, Moon, Sun, UserCircle, Repeat } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logoutAction } from "@/features/auth/actions";
import type { AppRole } from "@/lib/auth/session";
import { ROLE_LABEL } from "@/lib/permissions/navigation";

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export function UserMenu({ role, roles, user }: { role: AppRole; roles: AppRole[]; user: { name: string; email: string | null; avatarUrl: string | null } }) {
  const { resolvedTheme, setTheme } = useTheme();
  const profileHref = role === "admin" ? "/admin/settings" : role === "student" ? "/student/profile" : `/${role}/profile`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-0.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="Account menu">
        <Avatar className="size-9">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
          <AvatarFallback className="bg-secondary text-sm font-medium text-secondary-foreground">{initials(user.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="truncate text-sm font-medium text-foreground">{user.name}</div>
            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            <div className="mt-1 text-xs text-primary">{ROLE_LABEL[role]}</div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={profileHref} />}><UserCircle /> {role === "admin" ? "Institute settings" : "My profile"}</DropdownMenuItem>
        {roles.filter((r) => r !== role).map((r) => (
          <DropdownMenuItem key={r} render={<Link href={`/${r}`} />}><Repeat /> Switch to {ROLE_LABEL[r]}</DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          {resolvedTheme === "dark" ? <Sun /> : <Moon />} {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => logoutAction()}><LogOut /> Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
