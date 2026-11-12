import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import Link from "next/link";
import { getQuestionAnalysis } from "@/lib/answer-analysis";
import type { Question, Submission } from "@/lib/domain";
import { StudentList } from "./student-list";

export function QuestionDistribution({ quizId, question, submissions, independentHref }: {
  quizId: string;
  question: Question;
  submissions: Submission[];
  independentHref?: string;
}) {
  const analysis = getQuestionAnalysis(question, submissions);
  return (
    <div className="question-distribution">
      {independentHref && <div className="distribution-actions"><Link href={independentHref}>在独立页面查看完整分析<ExternalLink size={13} /></Link></div>}
      {analysis.optionStats.length > 0 && <section className="distribution-section">
        <h3>{question.type === "true_false" ? "判断选择分布" : "选项选择分布"}<small>{question.type === "multiple_choice" ? "一名学生可能出现在多个选项中" : "每个选项对应的学生"}</small></h3>
        <div className="option-analysis-list">{analysis.optionStats.map((option) => <div className="option-analysis" key={option.id}>
          <div className="option-analysis-head"><div><strong>{question.type === "true_false" ? option.text : `${option.id}. ${option.text}`}</strong>{option.isAnswer && <span className="badge badge-published">正确答案</span>}</div><span>{option.count} 人{analysis.total ? ` · ${Math.round((option.count / analysis.total) * 100)}%` : ""}</span></div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${analysis.total ? (option.count / analysis.total) * 100 : 0}%` }} /></div>
          <StudentList quizId={quizId} students={option.students} emptyText="无人选择" />
        </div>)}</div>
      </section>}
      <section className="distribution-section">
        <h3>按完整作答内容分组<small>点击学生姓名可继续查看个人逐题作答</small></h3>
        {analysis.answerGroups.length === 0 ? <p className="muted">还没有学生提交这道题。</p> : <div className="answer-group-list">{analysis.answerGroups.map((group) => <div className="answer-group" key={`${group.label}-${group.isCorrect}`}>
          <div className="answer-group-head"><div><strong>{group.label}</strong><span className={`result-status ${group.isCorrect ? "correct" : "incorrect"}`}>{group.isCorrect ? <CheckCircle2 size={13} /> : <XCircle size={13} />}{group.isCorrect ? "正确" : "错误"}</span></div><span className="badge badge-type">{group.count} 人</span></div>
          <StudentList quizId={quizId} students={group.students} />
        </div>)}</div>}
      </section>
    </div>
  );
}
