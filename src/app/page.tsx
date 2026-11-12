import { ArrowRight, BarChart3, Check, CheckCircle2, ClipboardCheck, Clock3, FileCheck2, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <header className="site-header">
          <div className="container">
            <Logo />
            <nav className="site-nav">
              <a href="#workflow">工作流程</a>
              <a href="#features">产品能力</a>
              <Link href="/teacher" className="nav-cta">进入工作台</Link>
            </nav>
          </div>
        </header>
        <div className="container hero-main">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={14} />AI 驱动的高校课堂形成性评价</div>
            <h1>一节课结束，<br /><span>立即看见理解。</span></h1>
            <p className="hero-description">描述课堂内容，AI 快速生成客观题。教师审核后一键发布，学生在线作答，成绩与知识点反馈即刻呈现。</p>
            <div className="hero-actions">
              <Link href="/teacher/create" className="btn btn-primary btn-lg">创建随堂测验<ArrowRight size={18} /></Link>
              <Link href="/teacher" className="btn btn-secondary btn-lg">进入教师工作台</Link>
            </div>
            <div className="hero-note"><ShieldCheck size={14} />标准答案仅用于服务端评分，学生作答前不可见</div>
          </div>
          <div className="hero-visual" aria-label="测验预览示意图">
            <div className="preview-card">
              <div className="preview-top">
                <div><h3>《机器学习导论》随堂测</h3><p>过拟合与模型泛化 · 6 道题</p></div>
                <span className="badge badge-ai"><WandSparkles size={12} />AI 已生成</span>
              </div>
              <div className="preview-question">
                <span className="badge badge-type">单选题 · 17 分</span>
                <h4>模型在训练集上表现很好，但在新数据上误差明显增大，这种现象称为？</h4>
                <div className="preview-option"><span>A</span>欠拟合</div>
                <div className="preview-option active"><span>B</span>过拟合<Check size={16} style={{ marginLeft: "auto" }} /></div>
                <div className="preview-option"><span>C</span>数据增强</div>
              </div>
            </div>
            <div className="floating-stat">
              <div className="stat-icon"><BarChart3 size={21} /></div>
              <div><strong>82.6%</strong><small>班级平均正确率</small></div>
            </div>
          </div>
        </div>
        <div className="hero-foot" id="features">
          <div className="container">
            <div className="hero-proof"><Clock3 size={17} />从课堂内容到测验，快速完成</div>
            <div className="hero-proof"><ClipboardCheck size={17} />选择、填空、判断自动评分</div>
            <div className="hero-proof"><BarChart3 size={17} />从分数到知识点掌握情况</div>
          </div>
        </div>
      </section>

      <section className="home-section" id="workflow">
        <div className="container">
          <div className="section-heading">
            <div className="mini-title">Simple workflow</div>
            <h2>三步，完成一次课堂反馈</h2>
            <p>不替代教师的专业判断，只把重复的出题、收卷和统计工作交给系统。</p>
          </div>
          <div className="steps-grid">
            <article className="step-card"><div className="step-number">01</div><WandSparkles className="step-icon" size={24} /><h3>描述课堂，生成测验</h3><p>输入课程主题和讲义要点，选择题量、题型与难度。AI 生成结构化试题，自动检查答案与分值。</p></article>
            <article className="step-card"><div className="step-number">02</div><FileCheck2 className="step-icon" size={24} /><h3>教师审核，一键发布</h3><p>题干、选项、答案与解析都可以修改。确认后生成作答链接和二维码，学生无需安装应用。</p></article>
            <article className="step-card"><div className="step-number">03</div><BarChart3 className="step-icon" size={24} /><h3>自动评阅，看见理解</h3><p>客观题即时评分，自动汇总个人成绩、班级正确率与错题分布，让下一次讲解更有针对性。</p></article>
          </div>
        </div>
      </section>

      <section className="home-cta">
        <div className="container home-cta-inner">
          <div><h2>让课堂的最后一次提问，不再等到下周。</h2><p>从一份真实教学内容开始，创建你的第一份智测云随堂测验。</p></div>
          <Link href="/teacher/create" className="btn btn-primary btn-lg">现在开始<CheckCircle2 size={18} /></Link>
        </div>
      </section>
      <footer className="home-footer">智测云 · 面向高校课堂的 AI 随堂测验生成与自动评阅平台</footer>
    </main>
  );
}
