import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db";
import { isAiConfigured } from "@/lib/ai-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await checkDatabaseConnection();
    return NextResponse.json({ status: "ok", database: "connected", aiConfigured: isAiConfigured() });
  } catch {
    return NextResponse.json({ status: "error", database: "unavailable" }, { status: 503 });
  }
}
