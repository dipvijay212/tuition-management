import { NextResponse } from "next/server";
import { refreshSessionAction } from "@/features/auth/actions";

export async function POST() {
  const result = await refreshSessionAction();
  return NextResponse.json(result, { status: result.ok ? 200 : 401 });
}
