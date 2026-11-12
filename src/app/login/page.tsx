import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentTeacher } from "@/lib/auth";

export const metadata: Metadata = { title: "教师登录" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getCurrentTeacher()) redirect("/teacher");
  const { next } = await searchParams;
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : "/teacher";
  return <AuthForm mode="login" nextPath={nextPath} />;
}
