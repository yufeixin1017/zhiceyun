import { NextResponse } from "next/server";
import { getQuiz, updateQuiz } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = await getQuiz(id);
  if (!quiz) return NextResponse.json({ message: "测验不存在" }, { status: 404 });
  if (quiz.status !== "draft") return NextResponse.json({ quiz });
  const updated = await updateQuiz(id, { status: "published", publishedAt: new Date().toISOString() });
  return NextResponse.json({ quiz: updated });
}
