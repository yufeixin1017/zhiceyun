import { NextResponse } from "next/server";
import { destroyTeacherSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  await destroyTeacherSession();
  return NextResponse.json({ success: true });
}
