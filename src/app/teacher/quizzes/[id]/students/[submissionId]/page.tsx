import type { Metadata } from "next";
import { ArrowLeft, CheckCircle2, ChevronRight, ClipboardCheck, Clock3, Target, X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { QUESTION_TYPE_LABELS } from "@/lib/domain";
import { gradeSubmission } from "@/lib/scoring";
import { getTeacherQuiz, getSubmission } from "@/lib/store";
import { requireTeacher } from "@/lib/auth";
import { formatDate, getAnswerLabel, getStudentAnswerLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "学生逐题作答详情" };
export const dynamic = "force-dynamic";

export default async function StudentSubmissionPage({ params }: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const { id, submissionId } = await params;
  const teacher = await requireTeacher(`/teacher/quizzes/${id}/students/${submissionId}`);
  const [quiz, submission] = await Promise.all([getTeacherQuiz(id, teacher.id), getSubmission(id, submissionId)]);
  if (!quiz || !submission) notFound();
  const grade = gradeSubmission(quiz.questions, submission.answers);
  const accuracy = Math.round((submission.correctCount / quiz.questions.length) * 100);

  return (
    <>
      <AppHeader />
      <main className="page-container">
        <div className="breadcrumb"><Link href="/teacher">测验工作台</Link><ChevronRight size={13} /><Link href={`/teacher/quizzes/${quiz.id}`}>测验结果</Link><ChevronRight size={13} /><span>学生作答</span></div>
        <div className="page-heading">
          <div><div style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 9 }}><span className="badge badge-type">{submission.studentName}</span>{submission.studentNo && <span className="badge badge-ai">{submission.studentNo}</span>}</div><h1>学生逐题作答</h1><p>{quiz.title} · {quiz.courseName}</p></div>
          <Link href={`/teacher/quizzes/${quiz.id}`} className="btn btn-secondary"><ArrowLeft size={16} />返回班级统计</Link>
        </div>
        <section className="stats-grid" aria-label="学生成绩概览">
          <div className="card stat-card"><div className="stat-card-icon"><ClipboardCheck size={21} /></div><div><div className="stat-card-label">总得分</div><div className="stat-card-value">{submission.score}<small>/ {submission.totalScore}</small></div></div></div>
          <div className="card stat-card"><div className="stat-card-icon green"><CheckCircle2 size={21} /></div><div><div className="stat-card-label">答对题数</div><div className="stat-card-value">{submission.correctCount}<small>/ {quiz.questions.length}</small></div></div></div>
          <div className="card stat-card"><div className="stat-card-icon orange"><Target size={21} /></div><div><div className="stat-card-label">正确率</div><div className="stat-card-value">{accuracy}<small>%</small></div></div></div>
          <div className="card stat-card"><div className="stat-card-icon green"><Clock3 size={21} /></div><div><div className="stat-card-label">提交时间</div><div style={{ fontSize: 14, fontWeight: 650 }}>{formatDate(submission.submittedAt)}</div></div></div>
        </section>
        <div className="panel-header"><div><h2>逐题答案与解析</h2><p>对照学生答案、标准答案和每题得分</p></div></div>
        {quiz.questions.map((question, index) => {
          const result = grade.results.find((item) => item.questionId === question.id)!;
          return (
            <article className={`card result-question ${result.isCorrect ? "correct" : "incorrect"}`} key={question.id}>
              <div className="student-question-head"><span className="question-number">{index + 1}</span><span className="badge badge-type">{QUESTION_TYPE_LABELS[question.type]}</span><Link className="question-link" href={`/teacher/quizzes/${quiz.id}/questions/${question.id}`}>查看全班作答</Link><span className={`result-status ${result.isCorrect ? "correct" : "incorrect"}`}>{result.isCorrect ? <CheckCircle2 size={14} /> : <X size={14} />}{result.earnedScore} / {question.score} 分</span></div>
              <h3 className="analysis-question-stem">{question.stem}</h3>
              <div className="result-answer-grid"><div className="result-answer"><span>学生答案</span>{getStudentAnswerLabel(question.type, result.studentAnswer)}</div><div className="result-answer"><span>正确答案</span>{getAnswerLabel(question.type, question.answer)}</div></div>
              <div className="explanation"><strong>解析 · {question.knowledgePoint}</strong><br />{question.explanation}</div>
            </article>
          );
        })}
      </main>
    </>
  );
}
