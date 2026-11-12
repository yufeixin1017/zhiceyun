import { eq, notLike } from "drizzle-orm";
import { getDb } from "./db";
import { teachers } from "./db/schema";
import { getPasswordError, hashPassword, verifyPassword } from "./password";
import type { Teacher } from "./auth-types";

export const LOCAL_TEACHER_ID = "00000000-0000-0000-0000-000000000001";
const LOCAL_TEACHER_EMAIL = "local@zhiceyun.internal";

export function normalizeEmail(email: string): string {
  return email.trim().toLocaleLowerCase();
}

export async function hasInitializedTeacher(): Promise<boolean> {
  const [teacher] = await getDb().select({ id: teachers.id }).from(teachers)
    .where(notLike(teachers.passwordHash, "DISABLED_%"))
    .limit(1);
  return Boolean(teacher);
}

export async function createFirstTeacher(input: {
  name: string;
  email: string;
  password: string;
}): Promise<Teacher> {
  if (await hasInitializedTeacher()) throw new Error("教师账号已经初始化，请直接登录");
  const passwordError = getPasswordError(input.password);
  if (passwordError) throw new Error(passwordError);

  const teacher: Teacher = {
    id: LOCAL_TEACHER_ID,
    name: input.name.trim(),
    email: normalizeEmail(input.email),
  };
  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  try {
    await getDb().transaction(async (transaction) => {
      const [existing] = await transaction.select().from(teachers)
        .where(eq(teachers.id, LOCAL_TEACHER_ID))
        .limit(1);
      if (existing) {
        await transaction.update(teachers).set({
          name: teacher.name,
          email: teacher.email,
          passwordHash,
          updatedAt: now,
        }).where(eq(teachers.id, LOCAL_TEACHER_ID));
      } else {
        await transaction.insert(teachers).values({ ...teacher, passwordHash });
      }
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as Error & { code?: string }).code === "ER_DUP_ENTRY") {
      throw new Error("该邮箱已被使用，请更换邮箱");
    }
    throw error;
  }
  return teacher;
}

export async function authenticateTeacher(email: string, password: string): Promise<Teacher | null> {
  const [teacher] = await getDb().select().from(teachers)
    .where(eq(teachers.email, normalizeEmail(email)))
    .limit(1);
  if (!teacher || teacher.passwordHash.startsWith("DISABLED_")) return null;
  if (!(await verifyPassword(password, teacher.passwordHash))) return null;
  return { id: teacher.id, name: teacher.name, email: teacher.email };
}

export async function ensureLocalTeacher(): Promise<void> {
  await getDb().insert(teachers).values({
    id: LOCAL_TEACHER_ID,
    name: "本地教师",
    email: LOCAL_TEACHER_EMAIL,
    passwordHash: "DISABLED_LOCAL_ACCOUNT",
  }).onDuplicateKeyUpdate({ set: { id: LOCAL_TEACHER_ID } });
}
