import type { Metadata } from "next";
import { ArrowRight, BarChart3, BookOpenCheck, Clock3, FilePlus2, FileText, Plus, UsersRound } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { StatusBadge } from "@/components/status-badge";
import { listQuizzes, listSubmissions } from "@/lib/store";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "教师工作台" };
export const dynamic = "force-dynamic";

export default async function TeacherDashboard() {
  const quizzes = await listQuizzes();
  const quizRows = await Promise.all(
    quizzes.map(async (quiz) => ({ quiz, submissions: await listSubmissions(quiz.id) })),
  );
  const published = quizzes.filter((quiz) => quiz.status === "published").length;
  const responseCount = quizRows.reduce((sum, row) => sum + row.submissions.length, 0);
  const allScores = quizRows.flatMap((row) => row.submissions.map((submission) => (submission.score / submission.totalScore) * 100));
  const average = allScores.length ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length) : 0;

  return (
    <>
      <AppHeader />
      <main className="page-container">
        <div className="page-heading">
          <div><h1>上午好，老师</h1><p>从一节课堂内容开始，快速获得真实的学习反馈。</p></div>
          <Link href="/teacher/create" className="btn btn-primary"><Plus size={17} />创建随堂测验</Link>
        </div>
        <section className="stats-grid" aria-label="测验概览">
          <div className="card stat-card"><div className="stat-card-icon"><FileText size={21} /></div><div><div className="stat-card-label">全部测验</div><div className="stat-card-value">{quizzes.length}<small>份</small></div></div></div>
          <div className="card stat-card"><div className="stat-card-icon green"><BookOpenCheck size={21} /></div><div><div className="stat-card-label">已发布</div><div className="stat-card-value">{published}<small>份</small></div></div></div>
          <div className="card stat-card"><div className="stat-card-icon orange"><UsersRound size={21} /></div><div><div className="stat-card-label">累计作答</div><div className="stat-card-value">{responseCount}<small>人次</small></div></div></div>
          <div className="card stat-card"><div className="stat-card-icon green"><BarChart3 size={21} /></div><div><div className="stat-card-label">平均得分率</div><div className="stat-card-value">{average}<small>%</small></div></div></div>
        </section>
        <section className="card panel">
          <div className="panel-header"><div><h2>我的测验</h2><p>管理草稿、发布内容并查看学生作答</p></div>{quizzes.length > 0 && <Link href="/teacher/create" className="btn btn-secondary btn-sm"><Plus size={14} />新建</Link>}</div>
          {quizRows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><FilePlus2 size={30} /></div>
              <h3>还没有随堂测验</h3>
              <p>我们已准备好示例课堂内容，点击即可体验完整生成流程。</p>
              <Link href="/teacher/create" className="btn btn-primary">创建第一份测验<ArrowRight size={16} /></Link>
            </div>
          ) : (
            <div className="quiz-list">
              {quizRows.map(({ quiz, submissions }) => (
                <article className="card quiz-row" key={quiz.id}>
                  <div className="quiz-row-icon"><FileText size={21} /></div>
                  <div className="quiz-row-main">
                    <div className="quiz-row-title"><h3>{quiz.title}</h3><StatusBadge status={quiz.status} />{quiz.generationMode === "demo" && <span className="badge badge-ai">演示生成</span>}</div>
                    <div className="quiz-row-meta"><span><BookOpenCheck size={13} />{quiz.courseName}</span><span><FileText size={13} />{quiz.questions.length} 题</span><span><UsersRound size={13} />{submissions.length} 份作答</span><span><Clock3 size={13} />{formatDate(quiz.updatedAt)}</span></div>
                  </div>
                  <div className="quiz-row-actions">
                    {quiz.status === "draft" ? <Link href={`/teacher/quizzes/${quiz.id}/edit`} className="btn btn-secondary btn-sm">继续编辑<ArrowRight size={14} /></Link> : <Link href={`/teacher/quizzes/${quiz.id}`} className="btn btn-secondary btn-sm">查看结果<ArrowRight size={14} /></Link>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
