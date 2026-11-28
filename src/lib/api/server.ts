import "server-only";
import { cookies, headers } from "next/headers";

/** httpOnly cookie holding the opaque session token issued by the backend. */
export const SESSION_COOKIE = "tc_session";

export class ApiError extends Error {
  constructor(public status: number, message: string, public fieldErrors?: Record<string, string[]>) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | null | undefined | (string | number)[]>;
type Options = { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown; query?: Query; token?: string | null; form?: FormData };

function apiBase() {
  const raw = process.env.API_URL?.trim().replace(/^["']|["']$/g, "");
  if (!raw) throw new Error("API_URL is not configured.");
  if (!/^https?:\/\//i.test(raw)) {
    throw new Error("API_URL is invalid: it must include http:// or https://.");
  }
  return raw.replace(/\/+$/, "");
}

export function buildApiUrl(path: string, query?: Query) {
  let url: URL;
  try {
    url = new URL(apiBase() + path);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("API_URL")) throw err;
    throw new Error("API_URL is invalid: check the configured backend URL.");
  }
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(k, String(x)));
    else url.searchParams.set(k, String(v));
  }
  return url;
}

/**
 * Call the Express backend from the Next.js server (Server Components, Server Actions, Route Handlers).
 * Forwards the signed-in user's session token. Throws ApiError with a user-friendly message on failure.
 */
export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const token = opts.token !== undefined ? opts.token : (await cookies()).get(SESSION_COOKIE)?.value;
  const h: Record<string, string> = { "x-internal-key": process.env.API_INTERNAL_KEY ?? "" };
  if (token) h.authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    h["content-type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(buildApiUrl(path, opts.query), { method: opts.method ?? (body ? "POST" : "GET"), headers: h, body, cache: "no-store" });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? "Something went wrong. Please try again.", data?.fieldErrors);
  return data as T;
}

export const apiGet = <T>(path: string, query?: Query) => api<T>(path, { query });
export const apiPost = <T>(path: string, body?: unknown) => api<T>(path, { method: "POST", body: body ?? {} });
export const apiPatch = <T>(path: string, body?: unknown) => api<T>(path, { method: "PATCH", body: body ?? {} });
export const apiDelete = <T>(path: string, body?: unknown) => api<T>(path, { method: "DELETE", body });

/** Store a session issued by the backend. Non-persistent sessions become browser-session cookies. */
export async function setSessionCookie(s: { token: string; expiresAt: string; persistent: boolean }) {
  (await cookies()).set(SESSION_COOKIE, s.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(s.persistent ? { expires: new Date(s.expiresAt) } : {}),
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Client info the backend records with a new session. */
export async function clientMeta() {
  const h = await headers();
  return { userAgent: h.get("user-agent") ?? undefined, ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined };
}
