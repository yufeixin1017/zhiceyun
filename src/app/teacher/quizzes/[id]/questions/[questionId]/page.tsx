import type { Metadata } from "next";
import { ArrowLeft, BarChart3, CheckCircle2, ChevronRight, ClipboardList, UsersRound, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { StudentList } from "@/components/student-list";
import { getQuestionAnalysis } from "@/lib/answer-analysis";
import { QUESTION_TYPE_LABELS } from "@/lib/domain";
import { getQuiz, listSubmissions } from "@/lib/store";
import { getAnswerLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "题目作答分布与学生名单" };
export const dynamic = "force-dynamic";

export default async function QuestionAnalysisPage({ params }: {
  params: Promise<{ id: string; questionId: string }>;
}) {
  const { id, questionId } = await params;
  const quiz = await getQuiz(id);
  if (!quiz) notFound();
  const questionIndex = quiz.questions.findIndex((item) => item.id === questionId);
  if (questionIndex < 0) notFound();
  const question = quiz.questions[questionIndex];
  const submissions = await listSubmissions(id);
  const analysis = getQuestionAnalysis(question, submissions);
  const correctRate = analysis.total ? Math.round((analysis.correctCount / analysis.total) * 100) : 0;

  return (
    <>
      <AppHeader />
      <main className="page-container">
        <div className="breadcrumb"><Link href="/teacher">测验工作台</Link><ChevronRight size={13} /><Link href={`/teacher/quizzes/${quiz.id}`}>测验结果</Link><ChevronRight size={13} /><span>题目作答分析</span></div>
        <div className="page-heading">
          <div><div style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 9 }}><span className="badge badge-type">第 {questionIndex + 1} 题 · {QUESTION_TYPE_LABELS[question.type]}</span><span className="badge badge-ai">{question.knowledgePoint}</span></div><h1>题目作答分析</h1><p>{quiz.title}</p></div>
          <Link href={`/teacher/quizzes/${quiz.id}`} className="btn btn-secondary"><ArrowLeft size={16} />返回班级统计</Link>
        </div>
        <section className="card panel analysis-question-card">
          <div className="panel-header"><div><h2>题目与标准答案</h2><p>{question.score} 分 · 仅教师端可见</p></div><ClipboardList size={20} className="soft" /></div>
          <h3 className="analysis-question-stem">{question.stem}</h3>
          <div className="result-answer-grid"><div className="result-answer"><span>正确答案</span>{getAnswerLabel(question.type, question.answer)}</div><div className="result-answer"><span>知识点</span>{question.knowledgePoint}</div></div>
          <div className="explanation"><strong>答案解析</strong><br />{question.explanation}</div>
        </section>
        <section className="stats-grid" aria-label="本题作答统计">
          <div className="card stat-card"><div className="stat-card-icon"><UsersRound size={21} /></div><div><div className="stat-card-label">作答人数</div><div className="stat-card-value">{analysis.total}<small>人</small></div></div></div>
          <div className="card stat-card"><div className="stat-card-icon green"><CheckCircle2 size={21} /></div><div><div className="stat-card-label">回答正确</div><div className="stat-card-value">{analysis.correctCount}<small>人</small></div></div></div>
          <div className="card stat-card"><div className="stat-card-icon orange"><XCircle size={21} /></div><div><div className="stat-card-label">回答错误</div><div className="stat-card-value">{analysis.incorrectCount}<small>人</small></div></div></div>
          <div className="card stat-card"><div className="stat-card-icon green"><BarChart3 size={21} /></div><div><div className="stat-card-label">正确率</div><div className="stat-card-value">{correctRate}<small>%</small></div></div></div>
        </section>
        <div className="results-layout" style={{ marginBottom: 20 }}>
          <section className="card panel"><div className="panel-header"><div><h2 className="text-success">回答正确的学生</h2><p>{analysis.correctStudents.length} 人</p></div><CheckCircle2 size={19} style={{ color: "var(--teal)" }} /></div><StudentList quizId={quiz.id} students={analysis.correctStudents} emptyText="暂无回答正确的学生" /></section>
          <section className="card panel"><div className="panel-header"><div><h2 className="text-danger">回答错误的学生</h2><p>{analysis.incorrectStudents.length} 人</p></div><XCircle size={19} style={{ color: "var(--danger)" }} /></div><StudentList quizId={quiz.id} students={analysis.incorrectStudents} emptyText="暂无回答错误的学生" /></section>
        </div>
        {analysis.optionStats.length > 0 && <section className="card panel" style={{ marginBottom: 20 }}>
          <div className="panel-header"><div><h2>{question.type === "true_false" ? "判断选择分布" : "选项选择分布"}</h2><p>{question.type === "multiple_choice" ? "一名学生可能出现在多个选项中" : "查看每个选项对应的学生名单"}</p></div></div>
          <div className="option-analysis-list">{analysis.optionStats.map((option) => <div className="option-analysis" key={option.id}>
            <div className="option-analysis-head"><div><strong>{question.type === "true_false" ? option.text : `${option.id}. ${option.text}`}</strong>{option.isAnswer && <span className="badge badge-published">正确答案</span>}</div><span>{option.count} 人{analysis.total ? ` · ${Math.round((option.count / analysis.total) * 100)}%` : ""}</span></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${analysis.total ? (option.count / analysis.total) * 100 : 0}%` }} /></div>
            <StudentList quizId={quiz.id} students={option.students} emptyText="无人选择" />
          </div>)}</div>
        </section>}
        <section className="card panel">
          <div className="panel-header"><div><h2>按完整作答内容分组</h2><p>多选按答案组合分组，填空按填写内容分组；点击学生可查看逐题作答</p></div></div>
          {analysis.answerGroups.length === 0 ? <div className="empty-state" style={{ padding: 25 }}><p>还没有学生提交这道题。</p></div> : <div className="answer-group-list">{analysis.answerGroups.map((group) => <div className="answer-group" key={`${group.label}-${group.isCorrect}`}>
            <div className="answer-group-head"><div><strong>{group.label}</strong><span className={`result-status ${group.isCorrect ? "correct" : "incorrect"}`}>{group.isCorrect ? <CheckCircle2 size={13} /> : <XCircle size={13} />}{group.isCorrect ? "正确" : "错误"}</span></div><span className="badge badge-type">{group.count} 人</span></div>
            <StudentList quizId={quiz.id} students={group.students} />
          </div>)}</div>}
        </section>
      </main>
    </>
  );
}
