import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "智测云｜AI 随堂测验生成与自动评阅", template: "%s｜智测云" },
  description: "面向高校课堂的 AI 随堂测验生成与自动评阅平台，让每一次课堂反馈都及时、清晰。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
