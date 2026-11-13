"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Smartphone, TriangleAlert } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export function SharePanel({ quizId, title, shareBaseUrl, lanAddresses, needsPublicUrl }: {
  quizId: string;
  title: string;
  shareBaseUrl: string;
  lanAddresses: string[];
  needsPublicUrl: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const url = `${shareBaseUrl}/quiz/${quizId}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="card share-panel">
      <div>
        <h3>测验已发布，分享给学生吧</h3>
        <p>{title} · 学生打开链接即可作答，无需安装应用</p>
        <div className="share-link">
          <input className="input" value={url} readOnly aria-label="学生作答链接" onFocus={(event) => event.target.select()} />
          <button className="btn btn-primary" type="button" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "已复制" : "复制链接"}</button>
          <a className="btn btn-secondary" href={`/quiz/${quizId}`} target="_blank" rel="noreferrer"><ExternalLink size={16} />打开</a>
        </div>
        {needsPublicUrl ? (
          <p className="share-hint share-hint-warning"><TriangleAlert size={14} />手机无法访问 127.0.0.1。请让手机与电脑连接同一 Wi-Fi，或配置 PUBLIC_BASE_URL / 公网隧道后重启。</p>
        ) : lanAddresses.length > 0 ? (
          <p className="share-hint"><Smartphone size={14} />手机与电脑连接同一 Wi-Fi 后扫码；若打不开，请允许 macOS 防火墙接收 Node.js 连接。</p>
        ) : null}
      </div>
      <div className="qr-box">
        <QRCodeSVG value={url} size={104} level="M" marginSize={0} />
        <div className="sr-only">学生作答二维码</div>
      </div>
    </section>
  );
}