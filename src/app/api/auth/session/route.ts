import { NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ teacher: null }, { status: 401 });
  return NextResponse.json({ teacher });
}
