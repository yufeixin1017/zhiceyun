"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Check, Clock3, FileText, Send, UserRound } from "lucide-react";
import { QUESTION_TYPE_LABELS } from "@/lib/domain";
import type { PublicQuiz, Submission } from "@/lib/domain";
import { Countdown } from "@/components/countdown";

export function StudentQuiz({ quiz, deadline }: { quiz: PublicQuiz; deadline: string | null }) {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [studentNo, setStudentNo] = useState("");
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const answeredCount = useMemo(() => quiz.questions.filter((question) => (answers[question.id] ?? []).some((answer) => answer.trim())).length, [answers, quiz.questions]);

  function setAnswer(question: PublicQuiz["questions"][number], optionId: string) {
    setAnswers((current) => {
      if (question.type === "multiple_choice") {
        const previous = current[question.id] ?? [];
        return { ...current, [question.id]: previous.includes(optionId) ? previous.filter((id) => id !== optionId) : [...previous, optionId] };
      }
      return { ...current, [question.id]: [optionId] };
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!studentName.trim()) { setError("请先填写姓名或演示昵称"); return; }
    if (answeredCount !== quiz.questions.length) { setError(`还有 ${quiz.questions.length - answeredCount} 道题未作答，请完成后提交`); return; }
    if (quiz.questions.length >= 3 && !window.confirm("确认提交答案吗？提交后不能修改。")) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/public/quizzes/${quiz.id}/submissions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName, studentNo: studentNo || undefined, answers }),
      });
      const data = (await response.json()) as { submission?: Submission; message?: string };
      if (!response.ok || !data.submission) throw new Error(data.message || "提交失败");
      router.push(`/quiz/${quiz.id}/result/${data.submission.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "提交失败，请稍后重试");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <section className="student-hero">
        <span className="badge"><BookOpen size={13} />{quiz.courseName}</span>
        <h1>{quiz.title}</h1><p>请独立完成作答。提交后系统会立即显示成绩、正确答案与解析。</p>
        <div className="student-meta"><span><FileText size={14} />{quiz.questions.length} 道题 · 100 分</span><span><Clock3 size={14} />限时 {quiz.durationMinutes} 分钟</span>{deadline && <Countdown deadline={deadline} />}</div>
      </section>
      <section className="card student-info" aria-label="作答人信息">
        <div className="field" style={{ margin: 0 }}><label htmlFor="student-name">姓名或演示昵称 <span className="text-danger">*</span></label><input id="student-name" className="input" value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="例如：张同学" maxLength={40} required /></div>
        <div className="field" style={{ margin: 0 }}><label htmlFor="student-no">学号 <small>选填，用于防止重复提交</small></label><input id="student-no" className="input" value={studentNo} onChange={(event) => setStudentNo(event.target.value)} placeholder="演示时可使用虚拟学号" maxLength={40} /></div>
      </section>
      <div className="answer-progress"><span>已完成 {answeredCount} / {quiz.questions.length}</span><div className="progress-track"><div className="progress-fill" style={{ width: `${(answeredCount / quiz.questions.length) * 100}%` }} /></div></div>
      {error && <div className="error-box" role="alert">{error}</div>}
      <section aria-label="测验题目">
        {quiz.questions.map((question, index) => (
          <article className="card student-question" key={question.id}>
            <div className="student-question-head"><span className="question-number">{index + 1}</span><span className="badge badge-type">{QUESTION_TYPE_LABELS[question.type]}</span><span className="score">{question.score} 分</span></div>
            <h3>{question.stem}</h3>
            <QuestionAnswer question={question} value={answers[question.id] ?? []} onOptionChange={(optionId) => setAnswer(question, optionId)} onTextChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value ? [value] : [] }))} />
          </article>
        ))}
      </section>
      <section className="card submit-card"><p><UserRound size={14} style={{ verticalAlign: "middle", marginRight: 5 }} />{studentName ? `${studentName}，请确认答案后提交` : "请填写姓名并完成全部题目"}</p><button className="btn btn-primary btn-lg" type="submit" disabled={submitting}>{submitting ? <span className="loading-spinner" /> : <Send size={17} />}{submitting ? "正在提交并评分…" : "提交答案"}</button></section>
    </form>
  );
}

function QuestionAnswer({ question, value, onOptionChange, onTextChange }: { question: PublicQuiz["questions"][number]; value: string[]; onOptionChange: (id: string) => void; onTextChange: (value: string) => void }) {
  if (question.type === "fill_blank") return <input className="input" value={value[0] ?? ""} onChange={(event) => onTextChange(event.target.value)} placeholder="请输入简短答案" maxLength={1000} aria-label="填空题答案" />;
  const options = question.type === "true_false" ? [{ id: "true", text: "正确" }, { id: "false", text: "错误" }] : question.options;
  return <div>{options.map((option) => {
    const selected = value.includes(option.id);
    return <label className={`answer-option ${selected ? "selected" : ""}`} key={option.id}><input type={question.type === "multiple_choice" ? "checkbox" : "radio"} name={question.id} checked={selected} onChange={() => onOptionChange(option.id)} /><span className="answer-option-id">{question.type === "true_false" ? (option.id === "true" ? "✓" : "×") : option.id}</span><span>{option.text}</span>{selected && <Check size={16} style={{ marginLeft: "auto" }} />}</label>;
  })}</div>;
}
