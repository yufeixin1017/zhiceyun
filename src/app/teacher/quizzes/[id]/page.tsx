import type { Metadata } from "next";
import { BarChart3, BookOpenCheck, ChevronRight, ClipboardCheck, Download, FilePenLine, FileText, Medal, UsersRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { SharePanel } from "@/components/share-panel";
import { StatusBadge } from "@/components/status-badge";
import { QuestionDistribution } from "@/components/question-distribution";
import { getQuizAnalytics } from "@/lib/analytics";
import { QUESTION_TYPE_LABELS } from "@/lib/domain";
import { getTeacherQuiz, listSubmissions } from "@/lib/store";
import { requireTeacher } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "测验结果与学情统计" };
export const dynamic = "force-dynamic";

export default async function QuizResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teacher = await requireTeacher(`/teacher/quizzes/${id}`);
  const quiz = await getTeacherQuiz(id, teacher.id);
  if (!quiz) notFound();
  const submissions = await listSubmissions(id);
  const analytics = getQuizAnalytics(quiz, submissions);
  const lateCount = submissions.filter((submission) => submission.isLate).length;

  return (
    <>
      <AppHeader />
      <main className="page-container">
        <div className="breadcrumb"><Link href="/teacher">测验工作台</Link><ChevronRight size={13} /><span>测验结果</span></div>
        <div className="page-heading"><div><div style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 9 }}><StatusBadge status={quiz.status} /><span className="badge badge-type">{quiz.courseName}</span></div><h1>{quiz.title}</h1><p>{quiz.questions.length} 道客观题 · 满分 100 分 · 答题限时 {quiz.durationMinutes} 分钟</p></div>{quiz.status === "draft" ? <Link href={`/teacher/quizzes/${quiz.id}/edit`} className="btn btn-primary"><FilePenLine size={16} />继续编辑并发布</Link> : submissions.length > 0 ? <a href={`/api/quizzes/${quiz.id}/export`} className="btn btn-secondary"><Download size={16} />导出成绩 CSV</a> : null}</div>
        {quiz.status === "published" && <SharePanel quizId={quiz.id} title={quiz.title} />}
        <section className="stats-grid" aria-label="作答统计">
          <div className="card stat-card"><div className="stat-card-icon"><UsersRound size={21} /></div><div><div className="stat-card-label">提交人数</div><div className="stat-card-value">{analytics.count}<small>人</small></div></div></div>
          <div className="card stat-card"><div className="stat-card-icon green"><BarChart3 size={21} /></div><div><div className="stat-card-label">平均得分</div><div className="stat-card-value">{analytics.averageScore}<small>/ 100</small></div></div></div>
          <div className="card stat-card"><div className="stat-card-icon orange"><Medal size={21} /></div><div><div className="stat-card-label">最高得分</div><div className="stat-card-value">{analytics.highestScore}<small>分</small></div></div></div>
          <div className="card stat-card"><div className="stat-card-icon green"><ClipboardCheck size={21} /></div><div><div className="stat-card-label">及格率</div><div className="stat-card-value">{analytics.passRate}<small>%</small></div></div></div>
        </section>
        <div className="results-layout" style={{ marginBottom: 20 }}>
          <section className="card panel">
            <div className="panel-header"><div><h2>逐题正确率</h2><p>快速定位需要再次讲解的题目</p></div><BarChart3 size={19} className="soft" /></div>
            <div className="performance-list">{analytics.questionStats.map(({ question, correctRate }, index) => <div key={question.id}><div className="performance-row-top"><Link href={`/teacher/quizzes/${quiz.id}/questions/${question.id}`} title="查看本题作答分布与学生名单">{index + 1}. {question.stem}</Link><strong>{analytics.count ? `${correctRate}%` : "—"}</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${correctRate}%`, background: analytics.count && correctRate < 60 ? "#e69958" : undefined }} /></div></div>)}</div>
          </section>
          <section className="card panel">
            <div className="panel-header"><div><h2>知识点反馈</h2><p>按题目关联的课堂知识点统计</p></div><BookOpenCheck size={19} className="soft" /></div>
            <div className="performance-list">{analytics.questionStats.map(({ question, correctRate }, index) => <div className="summary-row" key={question.id}><Link href={`/teacher/quizzes/${quiz.id}/questions/${question.id}`}>{index + 1}. {question.knowledgePoint}</Link><strong className={analytics.count && correctRate < 60 ? "text-danger" : ""}>{analytics.count ? `${correctRate}% 掌握` : "暂无作答"}</strong></div>)}</div>
          </section>
        </div>
        <section className="card panel">
          <div className="panel-header"><div><h2>学生成绩</h2><p>共 {submissions.length} 份有效提交{lateCount > 0 ? `，其中 ${lateCount} 份超时提交（仍计入统计）` : "，按提交时间倒序排列"}</p></div><FileText size={19} className="soft" /></div>
          {submissions.length === 0 ? <div className="empty-state" style={{ padding: "30px 20px" }}><div className="empty-icon"><UsersRound size={27} /></div><h3>还没有学生提交</h3><p>复制上方作答链接或展示二维码，学生提交后即可看到统计。</p></div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>学生</th><th>学号</th><th>得分</th><th>答对题数</th><th>正确率</th><th>提交状态</th><th>提交时间</th><th>操作</th></tr></thead><tbody>{submissions.map((submission) => <tr key={submission.id}><td><Link href={`/teacher/quizzes/${quiz.id}/students/${submission.id}`} title="查看该学生逐题作答"><span className="student-avatar">{submission.studentName.slice(0, 1)}</span>{submission.studentName}</Link></td><td>{submission.studentNo || "—"}</td><td><strong>{submission.score}</strong> / {submission.totalScore}</td><td>{submission.correctCount} / {quiz.questions.length}</td><td>{Math.round((submission.correctCount / quiz.questions.length) * 100)}%</td><td>{submission.isLate ? <span className="badge badge-late">超时</span> : <span className="badge badge-published">按时</span>}</td><td>{formatDate(submission.submittedAt)}</td><td><Link className="btn btn-secondary btn-sm" href={`/teacher/quizzes/${quiz.id}/students/${submission.id}`}>查看作答</Link></td></tr>)}</tbody></table></div>}
        </section>
        <section className="card panel" style={{ marginTop: 20 }}>
          <div className="panel-header"><div><h2>题目与标准答案</h2><p>点击任意题目，直接展开作答分布和对应学生名单</p></div></div>
          <div className="question-accordion-list">{quiz.questions.map((question, index) => <details className="question-accordion" key={question.id} open={index === 0}>
            <summary className="question-summary"><span>{index + 1}. [{QUESTION_TYPE_LABELS[question.type]}] {question.stem}</span><strong>{question.type === "true_false" ? (question.answer[0] === "true" ? "正确" : "错误") : question.answer.join("、")} · {question.score} 分</strong></summary>
            <div className="question-accordion-body"><QuestionDistribution quizId={quiz.id} question={question} submissions={submissions} independentHref={`/teacher/quizzes/${quiz.id}/questions/${question.id}`} /></div>
          </details>)}</div>
        </section>
      </main>
    </>
  );
}
