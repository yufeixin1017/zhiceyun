import { NextResponse } from "next/server";
import { z } from "zod";
import { createFirstTeacher, hasInitializedTeacher } from "@/lib/auth-accounts";
import { createTeacherSession } from "@/lib/auth";

const setupSchema = z.object({
  name: z.string().trim().min(1, "请填写教师姓名").max(100),
  phone: z.string().trim().min(1, "请输入手机号").max(30),
  password: z.string().min(1).max(128),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (await hasInitializedTeacher()) {
    return NextResponse.json({ message: "教师账号已经初始化，请直接登录" }, { status: 409 });
  }
  try {
    const input = setupSchema.parse(await request.json());
    const teacher = await createFirstTeacher(input);
    await createTeacherSession(teacher.id);
    return NextResponse.json({ teacher }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "账号信息不完整" }, { status: 400 });
    }
    return NextResponse.json({ message: error instanceof Error ? error.message : "创建账号失败" }, { status: 400 });
  }
}
