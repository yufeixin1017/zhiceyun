import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentTeacher } from "@/lib/auth";
import { hasInitializedTeacher } from "@/lib/auth-accounts";

export const metadata: Metadata = { title: "初始化教师账号" };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await hasInitializedTeacher()) redirect("/login");
  if (await getCurrentTeacher()) redirect("/teacher");
  return <AuthForm mode="setup" />;
}
