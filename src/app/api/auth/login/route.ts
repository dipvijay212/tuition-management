import { NextResponse, type NextRequest } from "next/server";
import { api, ApiError, clientMeta, setSessionCookie } from "@/lib/api/server";
import { ROLE_HOME, type AppRole } from "@/lib/auth/session";
import { cookies } from "next/headers";

const INSTITUTE_COOKIE = "tc_institute";
async function rememberInstituteCode(code: string) {
  (await cookies()).set(INSTITUTE_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { institute_code, identifier, password, remember, next } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Enter your mobile number or email and password." },
        { status: 400 }
      );
    }

    const res = await api<any>("/auth/login", {
      method: "POST",
      token: null,
      body: {
        institute_code: institute_code ? String(institute_code).trim().toUpperCase() : undefined,
        identifier: String(identifier).trim(),
        password: String(password),
        remember: Boolean(remember),
        ...(await clientMeta()),
      },
    });

    if (res?.requires_institute_selection) {
      return NextResponse.json({
        requiresInstituteSelection: true,
        institutes: res.institutes,
      });
    }

    await setSessionCookie(res);
    await rememberInstituteCode(res.institute.code);

    const safeNext =
      next &&
      next.startsWith("/") &&
      !next.startsWith("//") &&
      Object.entries(ROLE_HOME).some(([r, p]) => res.roles.includes(r as AppRole) && next.startsWith(p))
        ? next
        : res.home;

    return NextResponse.json({ ok: true, redirect: safeNext });
  } catch (e: any) {
    if (e instanceof ApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[/api/auth/login] unexpected error:", e);
    return NextResponse.json(
      { error: e?.message || "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
