"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole, Phone, UserRound } from "lucide-react";
import { Logo } from "./logo";

export function AuthForm({ mode, nextPath = "/teacher" }: {
  mode: "login" | "register";
  nextPath?: string;
}) {
  const isSetup = mode === "register";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (isSetup && password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isSetup ? { name, phone, password } : { phone, password }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message || "操作失败，请重试");
      window.location.href = nextPath;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "操作失败，请重试");
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-brand"><Logo /></div>
      <section className="card auth-card">
        <div className="auth-heading">
          <span className="eyebrow"><LockKeyhole size={14} />教师专属工作台</span>
          <h1>{isSetup ? "创建教师账号" : "欢迎回来"}</h1>
          <p>{isSetup ? "使用手机号注册。首次初始化会保留已有测验，后续注册将拥有独立工作台。" : "登录后创建测验、查看学生作答与班级学情。"}</p>
        </div>
        {error && <div className="error-box" role="alert">{error}</div>}
        <form onSubmit={submit}>
          {isSetup && <div className="field"><label htmlFor="name">教师姓名</label><div className="auth-input"><UserRound size={16} /><input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：张老师" required maxLength={100} /></div></div>}
          <div className="field"><label htmlFor="phone">登录手机号</label><div className="auth-input"><Phone size={16} /><input id="phone" type="tel" inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="请输入 11 位手机号" autoComplete="tel" required maxLength={30} /></div></div>
          <div className="field"><label htmlFor="password">密码{isSetup && <small>至少 8 位，包含字母和数字</small>}</label><div className="auth-input"><LockKeyhole size={16} /><input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSetup ? "设置教师登录密码" : "输入教师登录密码"} autoComplete={isSetup ? "new-password" : "current-password"} required maxLength={128} /></div></div>
          {isSetup && <div className="field"><label htmlFor="confirm-password">确认密码</label><div className="auth-input"><LockKeyhole size={16} /><input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="再次输入密码" autoComplete="new-password" required maxLength={128} /></div></div>}
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={loading}>{loading ? <span className="loading-spinner" /> : <ArrowRight size={17} />}{loading ? "请稍候…" : isSetup ? "创建账号并进入工作台" : "登录并进入工作台"}</button>
        </form>
        <div className="auth-footer">
          {isSetup ? <span>已有账号？<Link href="/login">直接登录</Link></span> : <span>没有账号？<Link href="/register">立即注册</Link></span>}
        </div>
      </section>
      <p className="auth-note">教师数据与学生成绩仅用于课堂教学演示</p>
    </main>
  );
}
