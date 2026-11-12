import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateTeacher, hasInitializedTeacher, normalizeEmail } from "@/lib/auth-accounts";
import { createTeacherSession } from "@/lib/auth";
import { clearLoginFailures, isLoginRateLimited, recordLoginFailure } from "@/lib/auth-rate-limit";

const loginSchema = z.object({
  email: z.string().trim().email("请输入有效邮箱").max(190),
  password: z.string().min(1, "请输入密码").max(128),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!(await hasInitializedTeacher())) {
      return NextResponse.json({ message: "尚未创建教师账号，请先完成初始化" }, { status: 409 });
    }
    const input = loginSchema.parse(await request.json());
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
    const rateLimitKey = `${ip}:${normalizeEmail(input.email)}`;
    if (isLoginRateLimited(rateLimitKey)) {
      return NextResponse.json({ message: "登录尝试次数过多，请 15 分钟后再试" }, { status: 429 });
    }
    const teacher = await authenticateTeacher(input.email, input.password);
    if (!teacher) {
      recordLoginFailure(rateLimitKey);
      return NextResponse.json({ message: "邮箱或密码不正确" }, { status: 401 });
    }
    clearLoginFailures(rateLimitKey);
    await createTeacherSession(teacher.id);
    return NextResponse.json({ teacher });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "登录信息不完整" }, { status: 400 });
    }
    return NextResponse.json({ message: "登录失败，请稍后重试" }, { status: 500 });
  }
}
