import { NextResponse } from "next/server";
import { isAiConfigured } from "@/lib/ai-generator";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ aiConfigured: isAiConfigured() });
}
