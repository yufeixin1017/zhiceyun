import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getQuiz } from "@/lib/store";
import { QuizEditor } from "./quiz-editor";

export const metadata: Metadata = { title: "审核与编辑测验" };
export const dynamic = "force-dynamic";

export default async function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = await getQuiz(id);
  if (!quiz) notFound();
  if (quiz.status !== "draft") redirect(`/teacher/quizzes/${id}`);
  return (
    <>
      <AppHeader />
      <main className="page-container">
        <div className="breadcrumb"><Link href="/teacher">测验工作台</Link><ChevronRight size={13} /><span>审核与编辑</span></div>
        <div className="page-heading"><div><h1>审核并发布测验</h1><p>AI 负责生成初稿，教师做最终判断。请核对题干、答案和解析。</p></div></div>
        <QuizEditor initialQuiz={quiz} />
      </main>
    </>
  );
}
