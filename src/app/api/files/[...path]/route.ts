import type { NextRequest } from "next/server";
import { buildApiUrl } from "@/lib/api/server";

/**
 * Proxies stored files from the backend. Private files carry a short-lived signature
 * (issued by the backend after an access check); branding files are public.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = buildApiUrl(`/files/${path.map(encodeURIComponent).join("/")}`);
  url.search = request.nextUrl.search;
  const res = await fetch(url, { headers: { "x-internal-key": process.env.API_INTERNAL_KEY ?? "" }, cache: "no-store" });
  if (!res.ok) return new Response(res.status === 403 ? "This file link has expired." : "File not found.", { status: res.status });
  const headers = new Headers();
  for (const k of ["content-type", "content-length", "cache-control", "x-content-type-options", "content-security-policy"]) {
    const v = res.headers.get(k);
    if (v) headers.set(k, v);
  }
  return new Response(res.body, { status: 200, headers });
}
