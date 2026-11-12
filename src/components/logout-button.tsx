"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  }
  return <button className="nav-logout" type="button" onClick={logout} disabled={loading}><LogOut size={15} /><span>{loading ? "退出中" : "退出"}</span></button>;
}
