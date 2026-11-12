"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export function SharePanel({ quizId, title }: { quizId: string; title: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin || ""}/quiz/${quizId}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="card share-panel">
      <div><h3>测验已发布，分享给学生吧</h3><p>{title} · 学生打开链接即可作答，无需安装应用</p><div className="share-link"><input className="input" value={url} readOnly aria-label="学生作答链接" onFocus={(event) => event.target.select()} /><button className="btn btn-primary" type="button" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "已复制" : "复制链接"}</button><a className="btn btn-secondary" href={`/quiz/${quizId}`} target="_blank" rel="noreferrer"><ExternalLink size={16} />打开</a></div></div>
      <div className="qr-box">{origin && <QRCodeSVG value={url} size={100} level="M" marginSize={0} />}<div className="sr-only">学生作答二维码</div></div>
    </section>
  );
}
