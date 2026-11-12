import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { submissionSchema, submitAnswersSchema } from "@/lib/domain";
import { gradeSubmission } from "@/lib/scoring";
import { createSubmission, getQuiz } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = await getQuiz(id);
  if (!quiz) return NextResponse.json({ message: "测验不存在" }, { status: 404 });
  if (quiz.status !== "published") {
    return NextResponse.json({ message: quiz.status === "closed" ? "本次测验已截止" : "本次测验尚未发布" }, { status: 409 });
  }

  try {
    const input = submitAnswersSchema.parse(await request.json());
    const answers = Object.fromEntries(
      quiz.questions.map((question) => [question.id, (input.answers[question.id] ?? []).slice(0, 10).map((answer) => answer.slice(0, 1000))]),
    );
    const unanswered = quiz.questions.filter((question) => {
      const answer = answers[question.id] ?? [];
      return answer.length === 0 || answer.every((item) => !item.trim());
    });
    if (unanswered.length) {
      return NextResponse.json({ message: `还有 ${unanswered.length} 道题未作答，请完成后提交` }, { status: 422 });
    }

    const grade = gradeSubmission(quiz.questions, answers);
    const submission = submissionSchema.parse({
      id: randomUUID(),
      quizId: quiz.id,
      studentName: input.studentName,
      studentNo: input.studentNo || undefined,
      answers,
      score: grade.score,
      correctCount: grade.correctCount,
      totalScore: grade.totalScore,
      submittedAt: new Date().toISOString(),
    });
    await createSubmission(submission);
    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ message: "作答信息格式不正确，请检查后重试" }, { status: 422 });
    if (error instanceof Error && error.message.includes("已经提交")) return NextResponse.json({ message: error.message }, { status: 409 });
    return NextResponse.json({ message: "提交失败，请稍后重试" }, { status: 500 });
  }
}
