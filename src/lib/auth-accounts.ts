import { randomUUID } from "node:crypto";
import { eq, notLike } from "drizzle-orm";
import { getDb } from "./db";
import { teachers } from "./db/schema";
import { getPasswordError, hashPassword, verifyPassword } from "./password";
import { getPhoneError, normalizePhone } from "./phone";
import type { Teacher } from "./auth-types";

export const LOCAL_TEACHER_ID = "00000000-0000-0000-0000-000000000001";
const LOCAL_TEACHER_EMAIL = "local@zhiceyun.internal";

export async function hasInitializedTeacher(): Promise<boolean> {
  const [teacher] = await getDb().select({ id: teachers.id }).from(teachers)
    .where(notLike(teachers.passwordHash, "DISABLED_%"))
    .limit(1);
  return Boolean(teacher);
}

export async function createFirstTeacher(input: {
  name: string;
  phone: string;
  password: string;
}): Promise<Teacher> {
  if (await hasInitializedTeacher()) throw new Error("教师账号已经初始化，请直接登录");
  const phoneError = getPhoneError(input.phone);
  if (phoneError) throw new Error(phoneError);
  const passwordError = getPasswordError(input.password);
  if (passwordError) throw new Error(passwordError);

  const teacher: Teacher = {
    id: LOCAL_TEACHER_ID,
    name: input.name.trim(),
    phone: normalizePhone(input.phone),
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
          phone: teacher.phone,
          email: null,
          passwordHash,
          updatedAt: now,
        }).where(eq(teachers.id, LOCAL_TEACHER_ID));
      } else {
        await transaction.insert(teachers).values({ ...teacher, passwordHash });
      }
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as Error & { code?: string }).code === "ER_DUP_ENTRY") {
      throw new Error("该手机号已被使用，请更换手机号");
    }
    throw error;
  }
  return teacher;
}

export async function registerTeacher(input: {
  name: string;
  phone: string;
  password: string;
}): Promise<Teacher> {
  if (!(await hasInitializedTeacher())) return createFirstTeacher(input);
  const phoneError = getPhoneError(input.phone);
  if (phoneError) throw new Error(phoneError);
  const passwordError = getPasswordError(input.password);
  if (passwordError) throw new Error(passwordError);

  const teacher: Teacher = {
    id: randomUUID(),
    name: input.name.trim(),
    phone: normalizePhone(input.phone),
  };
  try {
    await getDb().insert(teachers).values({
      ...teacher,
      passwordHash: await hashPassword(input.password),
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as Error & { code?: string }).code === "ER_DUP_ENTRY") {
      throw new Error("该手机号已注册，请直接登录或更换手机号");
    }
    throw error;
  }
  return teacher;
}

export async function authenticateTeacher(phone: string, password: string): Promise<Teacher | null> {
  const normalizedPhone = normalizePhone(phone);
  if (getPhoneError(normalizedPhone)) return null;
  const [teacher] = await getDb().select().from(teachers)
    .where(eq(teachers.phone, normalizedPhone))
    .limit(1);
  if (!teacher || !teacher.phone || teacher.passwordHash.startsWith("DISABLED_")) return null;
  if (!(await verifyPassword(password, teacher.passwordHash))) return null;
  return { id: teacher.id, name: teacher.name, phone: teacher.phone };
}

export async function ensureLocalTeacher(): Promise<void> {
  await getDb().insert(teachers).values({
    id: LOCAL_TEACHER_ID,
    name: "本地教师",
    email: LOCAL_TEACHER_EMAIL,
    passwordHash: "DISABLED_LOCAL_ACCOUNT",
  }).onDuplicateKeyUpdate({ set: { id: LOCAL_TEACHER_ID } });
}
