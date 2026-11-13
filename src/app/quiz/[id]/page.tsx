import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { getQuiz } from "@/lib/store";
import { toPublicQuiz } from "@/lib/public-quiz";
import { getDeadline } from "@/lib/quiz-deadline";
import { StudentQuiz } from "./student-quiz";

export const metadata: Metadata = { title: "学生在线作答" };
export const dynamic = "force-dynamic";

export default async function PublicQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = await getQuiz(id);
  if (!quiz) notFound();
  return (
    <main className="student-shell">
      <div className="student-brand"><Logo /><span className="student-brand-note">高校课堂 · 在线随堂测验</span></div>
      {quiz.status !== "published" ? (
        <div className="card unavailable"><div className="empty-icon"><ClipboardList size={29} /></div><h1>{quiz.status === "closed" ? "本次测验已截止" : "测验尚未发布"}</h1><p>{quiz.status === "closed" ? "如需补交，请联系任课教师。" : "教师仍在审核题目，请稍后再打开此链接。"}</p></div>
      ) : <StudentQuiz quiz={toPublicQuiz(quiz)} deadline={getDeadline(quiz)?.toISOString() ?? null} />}
    </main>
  );
}
