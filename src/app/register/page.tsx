import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentTeacher } from "@/lib/auth";

export const metadata: Metadata = { title: "注册教师账号" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getCurrentTeacher()) redirect("/teacher");
  return <AuthForm mode="register" />;
}
