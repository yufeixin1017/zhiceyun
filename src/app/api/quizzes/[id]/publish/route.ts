import { NextResponse } from "next/server";
import { getTeacherQuiz, updateQuiz } from "@/lib/store";
import { getCurrentTeacher } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ message: "请先登录教师账号" }, { status: 401 });
  const { id } = await params;
  const quiz = await getTeacherQuiz(id, teacher.id);
  if (!quiz) return NextResponse.json({ message: "测验不存在" }, { status: 404 });
  if (quiz.status !== "draft") return NextResponse.json({ quiz });
  const updated = await updateQuiz(id, { status: "published", publishedAt: new Date().toISOString() }, teacher.id);
  return NextResponse.json({ quiz: updated });
}
