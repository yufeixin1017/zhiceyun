import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { quizUpdateSchema } from "@/lib/domain";
import { getTeacherQuiz, updateQuiz } from "@/lib/store";
import { getCurrentTeacher } from "@/lib/auth";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ message: "请先登录教师账号" }, { status: 401 });
  const { id } = await params;
  const quiz = await getTeacherQuiz(id, teacher.id);
  if (!quiz) return NextResponse.json({ message: "测验不存在" }, { status: 404 });
  return NextResponse.json({ quiz });
}

export async function PATCH(request: Request, { params }: Context) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ message: "请先登录教师账号" }, { status: 401 });
  const { id } = await params;
  const quiz = await getTeacherQuiz(id, teacher.id);
  if (!quiz) return NextResponse.json({ message: "测验不存在" }, { status: 404 });
  if (quiz.status !== "draft") {
    return NextResponse.json({ message: "已发布的测验不能再修改，以保护已有作答记录" }, { status: 409 });
  }
  try {
    const input = quizUpdateSchema.parse(await request.json());
    if (input.questions.reduce((sum, question) => sum + question.score, 0) !== 100) {
      return NextResponse.json({ message: "所有题目的分值之和必须等于 100" }, { status: 422 });
    }
    const updated = await updateQuiz(id, input, teacher.id);
    return NextResponse.json({ quiz: updated });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: "题目内容不完整，请检查题干、答案和选项", issues: error.issues }, { status: 422 });
    }
    return NextResponse.json({ message: "保存失败，请稍后重试" }, { status: 500 });
  }
}
