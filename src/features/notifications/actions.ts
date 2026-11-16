"use server";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/server";
import { assertRole } from "@/lib/auth/session";
import { friendlyError, type ActionResult } from "@/lib/utilities/errors";
import { OPTIONAL_TYPES } from "./types";

export type BellItem = { id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

export async function recentNotifications(): Promise<{ ok: true; items: BellItem[] } | { ok: false }> {
  try {
    await assertRole("admin", "teacher", "student", "parent");
    const r = await api<{ rows: BellItem[] }>("/notifications", { query: { pageSize: 8 } });
    return { ok: true, items: r.rows };
  } catch {
    return { ok: false };
  }
}

export async function markRead(id: string): Promise<void> {
  await assertRole("admin", "teacher", "student", "parent");
  await api(`/notifications/${encodeURIComponent(id)}/read`, { method: "POST", body: {} });
}

export async function markAllRead(): Promise<ActionResult> {
  try {
    await assertRole("admin", "teacher", "student", "parent");
    const r = await api<{ message: string }>("/notifications/read-all", { method: "POST", body: {} });
    revalidatePath("/", "layout");
    return { ok: true, message: r.message };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}

export async function setPreference(type: string, inApp: boolean): Promise<ActionResult> {
  try {
    await assertRole("admin", "teacher", "student", "parent");
    if (!(OPTIONAL_TYPES as readonly string[]).includes(type)) return { ok: false, error: "This notification type cannot be turned off." };
    const r = await api<{ message: string }>("/notifications/preferences", { method: "PUT", body: { type, in_app: inApp } });
    return { ok: true, message: r.message };
  } catch (e) { return { ok: false, error: friendlyError(e) }; }
}
