import { NextResponse, type NextRequest } from "next/server";

/** Legacy email-link URL: forward to /auth/callback, which handles all link types. */
export function GET(request: NextRequest) {
  const dest = request.nextUrl.clone();
  dest.pathname = "/auth/callback";
  return NextResponse.redirect(dest);
}
