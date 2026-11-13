import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { generateAiQuestions, isAiConfigured } from "@/lib/ai-generator";
import { generateQuizRequestSchema, quizSchema } from "@/lib/domain";
import { createQuiz } from "@/lib/store";
import { getCurrentTeacher } from "@/lib/auth";
import { organizeQuestions } from "@/lib/question-order";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ message: "请先登录教师账号" }, { status: 401 });
  if (!isAiConfigured()) {
    return NextResponse.json({ message: "尚未配置大模型 API，请先配置 AI_API_KEY、AI_BASE_URL 和 AI_MODEL" }, { status: 400 });
  }
  try {
    const input = generateQuizRequestSchema.parse(await request.json());
    const questions = organizeQuestions(await generateAiQuestions(input));
    const now = new Date().toISOString();
    const quiz = quizSchema.parse({
      id: randomUUID(),
      title: `${input.topic}随堂测验`,
      courseName: input.courseName,
      topic: input.topic,
      sourceContent: input.sourceContent,
      difficulty: input.difficulty,
      durationMinutes: input.durationMinutes,
      status: "draft",
      questions,
      createdAt: now,
      updatedAt: now,
    });
    await createQuiz(quiz, teacher.id);
    return NextResponse.json({ quiz }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      const location = firstIssue?.path.length ? `（位置：${firstIssue.path.join(".")}）` : "";
      return NextResponse.json({
        message: `模型返回内容未通过校验${location}：${firstIssue?.message ?? "字段格式不正确"}。请重试或调整题型。`,
        issues: error.issues,
      }, { status: 422 });
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "生成失败，请稍后重试" },
      { status: 500 },
    );
  }
}