"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckSquare2, CircleDot, FileInput, Info, ListChecks, Sparkles, WandSparkles } from "lucide-react";
import { EMPTY_GENERATION_REQUEST } from "@/lib/demo-data";
import { DIFFICULTY_LABELS, QUESTION_TYPE_LABELS } from "@/lib/domain";
import type { GenerateQuizRequest, QuestionType, Quiz } from "@/lib/domain";

const TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  single_choice: <CircleDot size={20} />,
  multiple_choice: <CheckSquare2 size={20} />,
  true_false: <ListChecks size={20} />,
  fill_blank: <FileInput size={20} />,
};

export function CreateQuizForm() {
  const router = useRouter();
  const [form, setForm] = useState<GenerateQuizRequest>(EMPTY_GENERATION_REQUEST);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/config").then((response) => response.json()).then((config: { aiConfigured: boolean }) => {
      setAiConfigured(config.aiConfigured);
      if (config.aiConfigured) setForm((current) => ({ ...current, mode: "ai" }));
    }).catch(() => setAiConfigured(false));
  }, []);

  const selectedTypes = useMemo(() => form.questionTypes.map((type) => QUESTION_TYPE_LABELS[type]).join("、"), [form.questionTypes]);

  function update<K extends keyof GenerateQuizRequest>(key: K, value: GenerateQuizRequest[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleType(type: QuestionType) {
    const selected = form.questionTypes.includes(type);
    if (selected && form.questionTypes.length === 1) return;
    update("questionTypes", selected ? form.questionTypes.filter((item) => item !== type) : [...form.questionTypes, type]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/quizzes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { quiz?: Quiz; message?: string };
      if (!response.ok || !data.quiz) throw new Error(data.message || "生成失败，请检查输入");
      router.push(`/teacher/quizzes/${data.quiz.id}/edit?created=1`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "生成失败，请稍后重试");
      setLoading(false);
    }
  }

  return (
    <form className="form-layout" onSubmit={submit}>
      <div className="card form-panel">
        {error && <div className="error-box" role="alert">{error}</div>}
        <section className="form-section">
          <h2 className="form-section-title"><span>1</span>这节课讲了什么？</h2>
          <div className="form-grid">
            <div className="field"><label htmlFor="course">课程名称</label><input id="course" className="input" value={form.courseName} onChange={(event) => update("courseName", event.target.value)} placeholder="请输入实际课程名称" required maxLength={100} /></div>
            <div className="field"><label htmlFor="topic">本节课主题</label><input id="topic" className="input" value={form.topic} onChange={(event) => update("topic", event.target.value)} placeholder="请输入本节课主题" required maxLength={200} /></div>
          </div>
          <div className="field">
            <label htmlFor="content">课堂内容或讲义要点<small>{form.sourceContent.length} / 12000</small></label>
            <textarea id="content" className="textarea" style={{ minHeight: 165 }} value={form.sourceContent} onChange={(event) => update("sourceContent", event.target.value)} placeholder="粘贴本节课的知识点、讲义摘要或课堂笔记。AI 将尽量依据这些内容出题。" required minLength={10} maxLength={12000} />
            <p className="help-text">内容越具体，生成的题目越贴近课堂。请勿上传真实学生个人信息。</p>
          </div>
        </section>
        <section className="form-section">
          <h2 className="form-section-title"><span>2</span>希望怎样检测？</h2>
          <div className="field"><div className="field-label">选择题型<small>至少选择一种</small></div><div className="type-options">
            {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((type) => (
              <div className="type-option" key={type}><input id={`type-${type}`} type="checkbox" checked={form.questionTypes.includes(type)} onChange={() => toggleType(type)} /><label htmlFor={`type-${type}`}>{TYPE_ICONS[type]}<span>{QUESTION_TYPE_LABELS[type]}</span></label></div>
            ))}
          </div></div>
          <div className="form-grid">
            <div className="field"><label htmlFor="count">题目数量</label><select id="count" className="input" value={form.questionCount} onChange={(event) => update("questionCount", Number(event.target.value))}>{[3, 4, 5, 6, 7, 8, 9, 10].map((count) => <option key={count} value={count}>{count} 道题</option>)}</select></div>
            <div className="field"><label htmlFor="duration">建议用时</label><select id="duration" className="input" value={form.durationMinutes} onChange={(event) => update("durationMinutes", Number(event.target.value))}>{[5, 10, 15, 20, 30].map((minutes) => <option key={minutes} value={minutes}>{minutes} 分钟</option>)}</select></div>
          </div>
          <div className="field"><div className="field-label">测验难度</div><div className="segmented">{(Object.keys(DIFFICULTY_LABELS) as Array<keyof typeof DIFFICULTY_LABELS>).map((difficulty) => <button type="button" key={difficulty} className={form.difficulty === difficulty ? "active" : ""} onClick={() => update("difficulty", difficulty)}>{DIFFICULTY_LABELS[difficulty]}</button>)}</div></div>
        </section>
      </div>
      <aside className="form-side">
        <div className="card summary-card">
          <h3>本次测验</h3>
          <div className="summary-row"><span>题目数量</span><strong>{form.questionCount} 题 · 100 分</strong></div>
          <div className="summary-row"><span>建议用时</span><strong>{form.durationMinutes} 分钟</strong></div>
          <div className="summary-row"><span>难度</span><strong>{DIFFICULTY_LABELS[form.difficulty]}</strong></div>
          <div className="summary-row"><span>题型</span><strong>{selectedTypes}</strong></div>
          <div style={{ marginTop: 20 }}>
            {aiConfigured && <div className="segmented" style={{ display: "flex", marginBottom: 12 }}><button type="button" className={form.mode === "ai" ? "active" : ""} style={{ flex: 1 }} onClick={() => update("mode", "ai")}>AI 生成</button><button type="button" className={form.mode === "demo" ? "active" : ""} style={{ flex: 1 }} onClick={() => update("mode", "demo")}>演示生成</button></div>}
            <button className="btn btn-primary btn-lg btn-block" disabled={loading || !form.sourceContent.trim()} type="submit">{loading ? <span className="loading-spinner" /> : <WandSparkles size={18} />}{loading ? "正在生成并校验…" : form.mode === "ai" ? "AI 生成测验" : "生成演示测验"}</button>
          </div>
          <p className="help-text" style={{ textAlign: "center" }}>生成后仍可逐题修改，审核确认再发布</p>
        </div>
        <div className={`notice ${form.mode === "demo" ? "warning" : ""}`}><Info size={16} /><div>{form.mode === "ai" ? "已连接大模型。生成结果会经过题量、题型、选项、答案和分值校验，失败时不会静默替换为演示内容。" : "当前使用明确标注的演示生成模式，用于验证产品流程。配置 OpenAI 兼容的大模型 API 后，可依据真实课堂内容智能出题。"}</div></div>
        <div className="notice"><BookOpen size={16} /><div>仅支持选择、判断和简短填空题，不生成简答、证明或需要上传图片的题目。</div></div>
        <div className="notice"><Sparkles size={16} /><div>教师审核是必要环节。请重点核对答案、解析和题目是否超纲。</div></div>
      </aside>
    </form>
  );
}
