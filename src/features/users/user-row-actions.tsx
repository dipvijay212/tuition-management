"use client";
import { useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { sendPasswordReset, setAccountStatus, setRole } from "./actions";
import type { AppRole } from "@/lib/auth/session";

export function UserRowActions({ userId, status, roles, isSelf }: { userId: string; status: string; roles: AppRole[]; isSelf: boolean }) {
  const [pending, start] = useTransition();
  const run = (p: Promise<{ ok: boolean; message?: string; error?: string }>) => start(async () => { const r = await p; if (r.ok) toast.success(r.message); else toast.error(r.error); });
  return (
    <div className="flex items-center justify-end gap-1">
      {!isSelf && status !== "active" && <ConfirmDialog trigger={<Button variant="outline" size="sm">Activate</Button>} title="Activate this account?" requireReason onConfirm={(r) => setAccountStatus(userId, "active", r)} />}
      {!isSelf && status === "active" && <ConfirmDialog trigger={<Button variant="outline" size="sm" className="text-destructive">Suspend</Button>} title="Suspend this account?" description="The user is signed out everywhere and can't log in until reactivated. Their records are kept." destructive requireReason confirmLabel="Suspend" onConfirm={(r) => setAccountStatus(userId, "suspended", r)} />}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" disabled={pending} aria-label="More actions" />}><MoreHorizontal /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => run(sendPasswordReset(userId))}>Send password reset email</DropdownMenuItem>
          <DropdownMenuSeparator />
          {roles.includes("admin")
            ? !isSelf && <DropdownMenuItem variant="destructive" onClick={() => run(setRole(userId, "admin", false))}>Remove admin access</DropdownMenuItem>
            : <DropdownMenuItem onClick={() => run(setRole(userId, "admin", true))}>Grant admin access</DropdownMenuItem>}
          {!isSelf && status === "active" && <DropdownMenuItem onClick={() => run(setAccountStatus(userId, "inactive", "Marked inactive by admin"))}>Mark inactive</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
