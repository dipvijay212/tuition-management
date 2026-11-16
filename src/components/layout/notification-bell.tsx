"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { markAllRead as markAllReadAction, markRead, recentNotifications } from "@/features/notifications/actions";
import type { AppRole } from "@/lib/auth/session";
import { resolveNotificationLink } from "@/lib/utilities/links";

type N = { id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function NotificationBell({ role, initialUnread }: { role: AppRole; initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<N[] | null>(null);
  const [unread, setUnread] = useState(initialUnread);
  const [error, setError] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    const r = await recentNotifications();
    if (!r.ok) return setError(true);
    setError(false);
    setItems(r.items);
  }, []);

  const onOpenChange = (o: boolean) => { setOpen(o); if (o) void load(); };

  const markAll = async () => {
    await markAllReadAction();
    setUnread(0);
    setItems((xs) => xs?.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })) ?? null);
    router.refresh();
  };
  const openItem = async (n: N) => {
    if (!n.read_at) {
      await markRead(n.id).catch(() => {});
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    router.push(resolveNotificationLink(role, n.link));
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} />}>
        <Bell className="size-5" />
        {unread > 0 && <span className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white">{unread > 99 ? "99+" : unread}</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,380px)] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-medium">Notifications</span>
          <Button variant="ghost" size="sm" onClick={markAll} disabled={unread === 0}><CheckCheck /> Mark all read</Button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {error && <p className="p-6 text-center text-sm text-destructive">Couldn&apos;t load notifications. <button className="underline" onClick={load}>Retry</button></p>}
          {!error && items === null && <div className="space-y-3 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />)}</div>}
          {!error && items?.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>}
          {items?.map((n) => (
            <button key={n.id} onClick={() => openItem(n)} className="flex w-full gap-3 border-b px-4 py-3 text-left last:border-0 hover:bg-muted/60">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-primary"}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{n.title}</span>
                {n.body && <span className="line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>}
                <span className="mt-1 block text-[11px] text-muted-foreground">{ago(n.created_at)}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="border-t p-2 text-center"><Link href={`/${role}/notifications`} onClick={() => setOpen(false)} className="text-sm text-primary hover:underline">View all</Link></div>
      </PopoverContent>
    </Popover>
  );
}
