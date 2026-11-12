import { LayoutDashboard, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { getCurrentTeacher } from "@/lib/auth";
import { Logo } from "./logo";
import { LogoutButton } from "./logout-button";

export async function AppHeader() {
  const teacher = await getCurrentTeacher();
  return (
    <header className="app-header">
      <div className="container app-header-inner">
        <div style={{ display: "flex", alignItems: "center" }}>
          <Logo href="/teacher" />
          <span className="header-product-tag">高校课堂 · AI 随堂测验</span>
        </div>
        <nav aria-label="教师端导航">
          <Link href="/teacher" className="active"><LayoutDashboard size={16} /><span>测验工作台</span></Link>
          <Link href="/teacher/create"><Plus size={16} /><span>创建测验</span></Link>
          {teacher && <span className="nav-user" title={teacher.email}><UserRound size={15} /><span>{teacher.name}</span></span>}
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
