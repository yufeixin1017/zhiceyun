import type { Metadata } from "next";
import { Check, CheckCircle2, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { QUESTION_TYPE_LABELS } from "@/lib/domain";
import { gradeSubmission } from "@/lib/scoring";
import { getQuiz, getSubmission } from "@/lib/store";
import { getAnswerLabel, getStudentAnswerLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "测验成绩与解析" };
export const dynamic = "force-dynamic";

export default async function SubmissionResultPage({ params }: { params: Promise<{ id: string; submissionId: string }> }) {
  const { id, submissionId } = await params;
  const [quiz, submission] = await Promise.all([getQuiz(id), getSubmission(id, submissionId)]);
  if (!quiz || !submission) notFound();
  const grade = gradeSubmission(quiz.questions, submission.answers);

  return (
    <main className="student-shell">
      <div className="student-brand"><Logo /><span className="student-brand-note">{quiz.courseName}</span></div>
      <section className="card score-hero"><div className="score-check"><CheckCircle2 size={29} /></div><h1>提交成功，{submission.studentName}</h1><p>{quiz.title}</p><div className="score-number">{submission.score}<small> / {submission.totalScore} 分</small></div><div className="score-summary"><span>答对<strong>{submission.correctCount} / {quiz.questions.length}</strong></span><span>正确率<strong>{Math.round((submission.correctCount / quiz.questions.length) * 100)}%</strong></span></div></section>
      <div className="page-heading" style={{ marginTop: 28 }}><div><h1 style={{ fontSize: 21 }}>逐题回顾</h1><p>对照正确答案与解析，找到还需要巩固的知识点。</p></div><Link href="/" className="btn btn-secondary btn-sm">完成<Check size={14} /></Link></div>
      {quiz.questions.map((question, index) => {
        const result = grade.results.find((item) => item.questionId === question.id)!;
        return <article className={`card result-question ${result.isCorrect ? "correct" : "incorrect"}`} key={question.id}>
          <div className="student-question-head"><span className="question-number">{index + 1}</span><span className="badge badge-type">{QUESTION_TYPE_LABELS[question.type]}</span><span className={`result-status ${result.isCorrect ? "correct" : "incorrect"}`}>{result.isCorrect ? <CheckCircle2 size={14} /> : <X size={14} />}{result.isCorrect ? `+${question.score} 分` : "0 分"}</span></div>
          <h3 style={{ fontSize: 15, lineHeight: 1.8 }}>{question.stem}</h3>
          <div className="result-answer-grid"><div className="result-answer"><span>你的答案</span>{getStudentAnswerLabel(question.type, result.studentAnswer)}</div><div className="result-answer"><span>正确答案</span>{getAnswerLabel(question.type, result.correctAnswer)}</div></div>
          <div className="explanation"><strong>解析 · {question.knowledgePoint}</strong><br />{result.explanation}</div>
        </article>;
      })}
      <div className="breadcrumb" style={{ justifyContent: "center", marginTop: 25 }}><Link href="/">智测云</Link><ChevronRight size={12} /><span>本次作答已完成</span></div>
    </main>
  );
}
