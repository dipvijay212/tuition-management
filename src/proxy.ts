import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "tc_session";
const PORTALS = ["/admin", "/teacher", "/student", "/parent"];
const PLATFORM = "/platform";

/**
 * Optimistic check only (no network call): bounces visitors without a session
 * cookie to /login. Real authorization happens in each portal layout
 * (requireRole) and in the backend API on every request.
 */
export function proxy(request: NextRequest) {
  const signedIn = !!request.cookies.get(SESSION_COOKIE)?.value;
  const path = request.nextUrl.pathname;

  if (!signedIn && (path === PLATFORM || path.startsWith(PLATFORM + "/")) && path !== PLATFORM + "/login") {
    const url = request.nextUrl.clone();
    url.pathname = PLATFORM + "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (!signedIn && PORTALS.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
