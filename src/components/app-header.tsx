import { LayoutDashboard, Plus } from "lucide-react";
import Link from "next/link";
import { Logo } from "./logo";

export function AppHeader() {
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
        </nav>
      </div>
    </header>
  );
}
