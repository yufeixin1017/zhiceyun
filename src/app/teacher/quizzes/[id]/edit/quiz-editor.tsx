"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, CirclePlus, Info, Plus, Save, Send, Trash2, X } from "lucide-react";
import { QUESTION_TYPE_LABELS } from "@/lib/domain";
import type { Question, QuestionType, Quiz } from "@/lib/domain";
import { allocateScores } from "@/lib/scoring";

function newQuestion(): Question {
  return {
    id: crypto.randomUUID(),
    type: "single_choice",
    stem: "",
    options: [
      { id: "A", text: "" }, { id: "B", text: "" }, { id: "C", text: "" }, { id: "D", text: "" },
    ],
    answer: ["A"],
    explanation: "暂无解析",
    knowledgePoint: "课堂重点",
    score: 0,
  };
}

export function QuizEditor({ initialQuiz }: { initialQuiz: Quiz }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState(initialQuiz);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const totalScore = useMemo(() => quiz.questions.reduce((sum, question) => sum + question.score, 0), [quiz.questions]);

  function updateQuestion(id: string, update: Partial<Question>) {
    setQuiz((current) => ({ ...current, questions: current.questions.map((question) => question.id === id ? { ...question, ...update } : question) }));
  }

  function changeType(question: Question, type: QuestionType) {
    if (type === "true_false") updateQuestion(question.id, { type, options: [], answer: ["true"] });
    else if (type === "fill_blank") updateQuestion(question.id, { type, options: [], answer: [""] });
    else if (["single_choice", "multiple_choice"].includes(question.type)) updateQuestion(question.id, { type, answer: type === "single_choice" ? [question.answer[0] ?? "A"] : question.answer.length >= 2 ? question.answer : ["A", "B"] });
    else updateQuestion(question.id, { type, options: [{ id: "A", text: "" }, { id: "B", text: "" }, { id: "C", text: "" }, { id: "D", text: "" }], answer: type === "single_choice" ? ["A"] : ["A", "B"] });
  }

  function addQuestion() {
    if (quiz.questions.length >= 10) { setError("随堂测验最多设置 10 道题"); return; }
    const questions = [...quiz.questions, newQuestion()];
    const scores = allocateScores(questions.length);
    setQuiz({ ...quiz, questions: questions.map((question, index) => ({ ...question, score: scores[index] })) });
  }

  function removeQuestion(id: string) {
    if (quiz.questions.length <= 1) { setError("一份测验至少保留一道题"); return; }
    const questions = quiz.questions.filter((question) => question.id !== id);
    const scores = allocateScores(questions.length);
    setQuiz({ ...quiz, questions: questions.map((question, index) => ({ ...question, score: scores[index] })) });
  }

  async function save(): Promise<boolean> {
    setError(""); setMessage(""); setSaving(true);
    try {
      const response = await fetch(`/api/quizzes/${quiz.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: quiz.title, durationMinutes: quiz.durationMinutes, questions: quiz.questions }),
      });
      const data = (await response.json()) as { quiz?: Quiz; message?: string };
      if (!response.ok || !data.quiz) throw new Error(data.message || "保存失败");
      setQuiz(data.quiz); setMessage("修改已保存"); return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败"); return false;
    } finally { setSaving(false); }
  }

  async function publish() {
    setPublishing(true);
    const saved = await save();
    if (!saved) { setPublishing(false); return; }
    try {
      const response = await fetch(`/api/quizzes/${quiz.id}/publish`, { method: "POST" });
      const data = (await response.json()) as { quiz?: Quiz; message?: string };
      if (!response.ok || !data.quiz) throw new Error(data.message || "发布失败");
      router.push(`/teacher/quizzes/${quiz.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "发布失败");
      setPublishing(false);
    }
  }

  return (
    <div>
      {error && <div className="error-box" role="alert">{error}</div>}
      {message && <div className="success-box" role="status">{message}</div>}
      <div className="card editor-toolbar">
        <div className="editor-toolbar-info"><strong>{quiz.questions.length} 道题 · 总分 {totalScore} 分</strong><br /><span>{quiz.generationMode === "demo" ? "演示生成" : "AI 生成"} · 发布后题目不可修改</span></div>
        <div className="editor-toolbar-actions"><button className="btn btn-secondary" onClick={save} disabled={saving || publishing}>{saving ? <span className="loading-spinner" /> : <Save size={16} />}保存草稿</button><button className="btn btn-primary" onClick={publish} disabled={saving || publishing || totalScore !== 100}>{publishing ? <span className="loading-spinner" /> : <Send size={16} />}确认并发布</button></div>
      </div>
      {quiz.generationMode === "demo" && <div className="notice warning" style={{ marginBottom: 16 }}><Info size={16} /><div>本测验由演示生成器创建。它可以用于体验完整流程，但不应把演示题描述为大模型实时生成结果。</div></div>}
      <section className="card editor-meta">
        <div className="editor-meta-grid"><div className="field" style={{ margin: 0 }}><label htmlFor="quiz-title">测验标题</label><input id="quiz-title" className="input" value={quiz.title} onChange={(event) => setQuiz({ ...quiz, title: event.target.value })} maxLength={120} /></div><div className="field" style={{ margin: 0 }}><label htmlFor="quiz-duration">建议用时（分钟）</label><input id="quiz-duration" className="input" type="number" min={1} max={120} value={quiz.durationMinutes} onChange={(event) => setQuiz({ ...quiz, durationMinutes: Number(event.target.value) })} /></div></div>
      </section>
      <section aria-label="题目编辑列表">
        {quiz.questions.map((question, index) => (
          <QuestionEditor key={question.id} question={question} index={index} onChange={(update) => updateQuestion(question.id, update)} onTypeChange={(type) => changeType(question, type)} onRemove={() => removeQuestion(question.id)} />
        ))}
      </section>
      <button className="add-question" type="button" onClick={addQuestion}><CirclePlus size={17} style={{ verticalAlign: "middle", marginRight: 7 }} />添加一道题（自动重新分配分值）</button>
    </div>
  );
}

function QuestionEditor({ question, index, onChange, onTypeChange, onRemove }: { question: Question; index: number; onChange: (update: Partial<Question>) => void; onTypeChange: (type: QuestionType) => void; onRemove: () => void }) {
  const isChoice = question.type === "single_choice" || question.type === "multiple_choice";

  function updateOption(optionId: string, text: string) {
    onChange({ options: question.options.map((option) => option.id === optionId ? { ...option, text } : option) });
  }

  function toggleAnswer(optionId: string) {
    if (question.type === "single_choice") onChange({ answer: [optionId] });
    else {
      const answer = question.answer.includes(optionId) ? question.answer.filter((id) => id !== optionId) : [...question.answer, optionId];
      onChange({ answer });
    }
  }

  function addOption() {
    const id = ["A", "B", "C", "D", "E", "F"].find((letter) => !question.options.some((option) => option.id === letter));
    if (id) onChange({ options: [...question.options, { id, text: "" }] });
  }

  function removeOption(optionId: string) {
    if (question.options.length <= 2) return;
    onChange({ options: question.options.filter((option) => option.id !== optionId), answer: question.answer.filter((id) => id !== optionId) });
  }

  return (
    <article className="card question-editor">
      <div className="question-editor-head"><span className="question-number">{index + 1}</span><span className="badge badge-type">{QUESTION_TYPE_LABELS[question.type]}</span><select className="select" aria-label="修改题型" value={question.type} onChange={(event) => onTypeChange(event.target.value as QuestionType)}>{Object.entries(QUESTION_TYPE_LABELS).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select><ChevronDown size={14} style={{ marginLeft: -27, marginRight: 8, pointerEvents: "none", color: "#929bb0" }} /><input className="input score-input" aria-label="题目分值" type="number" min={1} max={100} value={question.score} onChange={(event) => onChange({ score: Number(event.target.value) })} /><span className="soft" style={{ fontSize: 12 }}>分</span><button className="icon-btn" type="button" aria-label={`删除第 ${index + 1} 题`} onClick={onRemove}><Trash2 size={16} /></button></div>
      <div className="question-editor-body">
        <div className="field"><label htmlFor={`stem-${question.id}`}>题干</label><textarea id={`stem-${question.id}`} className="textarea" style={{ minHeight: 82 }} value={question.stem} onChange={(event) => onChange({ stem: event.target.value })} placeholder="输入题目内容" /></div>
        {isChoice && <div className="field"><div className="field-label">选项与正确答案<small>{question.type === "single_choice" ? "选择一个正确答案" : "选择至少两个正确答案，全对得分"}</small></div>
          {question.options.map((option) => <div className="option-edit-row" key={option.id}><input type={question.type === "single_choice" ? "radio" : "checkbox"} checked={question.answer.includes(option.id)} onChange={() => toggleAnswer(option.id)} aria-label={`将选项 ${option.id} 设为答案`} /><span className="option-id">{option.id}</span><input className="input" value={option.text} onChange={(event) => updateOption(option.id, event.target.value)} placeholder={`选项 ${option.id}`} /><button className="icon-btn" type="button" onClick={() => removeOption(option.id)} disabled={question.options.length <= 2} aria-label={`删除选项 ${option.id}`}><X size={15} /></button></div>)}
          <button className="btn btn-ghost btn-sm" type="button" onClick={addOption} disabled={question.options.length >= 6}><Plus size={14} />添加选项</button>
        </div>}
        {question.type === "true_false" && <div className="field"><div className="field-label">正确答案</div><div className="segmented"><button type="button" className={question.answer[0] === "true" ? "active" : ""} onClick={() => onChange({ answer: ["true"] })}><Check size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />正确</button><button type="button" className={question.answer[0] === "false" ? "active" : ""} onClick={() => onChange({ answer: ["false"] })}><X size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />错误</button></div></div>}
        {question.type === "fill_blank" && <div className="field"><div className="field-label">标准答案与可接受答案<small>忽略大小写、全半角和首尾空格</small></div>{question.answer.map((answer, answerIndex) => <div className="answer-edit" key={answerIndex}><input className="input" value={answer} onChange={(event) => onChange({ answer: question.answer.map((item, currentIndex) => currentIndex === answerIndex ? event.target.value : item) })} placeholder={answerIndex === 0 ? "标准答案" : "可接受的等价答案"} /><button className="icon-btn" type="button" aria-label="删除此答案" disabled={question.answer.length <= 1} onClick={() => onChange({ answer: question.answer.filter((_, currentIndex) => currentIndex !== answerIndex) })}><X size={15} /></button></div>)}<button className="btn btn-ghost btn-sm" type="button" onClick={() => onChange({ answer: [...question.answer, ""] })}><Plus size={14} />添加等价答案</button></div>}
        <div className="question-detail-grid"><div className="field" style={{ margin: 0 }}><label htmlFor={`kp-${question.id}`}>知识点</label><input id={`kp-${question.id}`} className="input" value={question.knowledgePoint} onChange={(event) => onChange({ knowledgePoint: event.target.value })} /></div><div className="field" style={{ margin: 0 }}><label htmlFor={`explanation-${question.id}`}>答案解析</label><textarea id={`explanation-${question.id}`} className="textarea" style={{ minHeight: 43, height: 43 }} value={question.explanation} onChange={(event) => onChange({ explanation: event.target.value })} /></div></div>
      </div>
    </article>
  );
}
