import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { generateAiQuestions, isAiConfigured } from "@/lib/ai-generator";
import { generateDemoQuestions } from "@/lib/demo-generator";
import { generateQuizRequestSchema, quizSchema } from "@/lib/domain";
import { createQuiz } from "@/lib/store";
import { organizeQuestions } from "@/lib/question-order";
import { getCurrentTeacher } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ message: "请先登录教师账号" }, { status: 401 });
  try {
    const input = generateQuizRequestSchema.parse(await request.json());
    const mode = input.mode ?? (isAiConfigured() ? "ai" : "demo");
    if (mode === "ai" && !isAiConfigured()) {
      return NextResponse.json({ message: "尚未配置大模型 API，请使用演示模式或先配置 AI_API_KEY" }, { status: 400 });
    }
    const generatedQuestions = mode === "ai" ? await generateAiQuestions(input) : generateDemoQuestions(input);
    const questions = organizeQuestions(generatedQuestions);
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
      generationMode: mode,
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
