import { NextResponse } from "next/server";
import { z } from "zod";
import { registerTeacher } from "@/lib/auth-accounts";
import { createTeacherSession } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().trim().min(1, "请填写教师姓名").max(100),
  phone: z.string().trim().min(1, "请输入手机号").max(30),
  password: z.string().min(1).max(128),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const teacher = await registerTeacher(input);
    await createTeacherSession(teacher.id);
    return NextResponse.json({ teacher }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "注册信息不完整" }, { status: 400 });
    }
    return NextResponse.json({ message: error instanceof Error ? error.message : "注册失败，请稍后重试" }, { status: 400 });
  }
}
