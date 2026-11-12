import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { CreateQuizForm } from "./create-quiz-form";

export const metadata: Metadata = { title: "创建随堂测验" };

export default function CreateQuizPage() {
  return (
    <>
      <AppHeader />
      <main className="page-container">
        <div className="breadcrumb"><Link href="/teacher">测验工作台</Link><ChevronRight size={13} /><span>创建测验</span></div>
        <div className="page-heading"><div><h1>创建一份随堂测验</h1><p>告诉 AI 本节课讲了什么，剩下的出题、评分和统计交给智测云。</p></div></div>
        <CreateQuizForm />
      </main>
    </>
  );
}
