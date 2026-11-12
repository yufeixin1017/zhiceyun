import { randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "./db";
import { teacherSessions, teachers } from "./db/schema";
import { hashSessionToken } from "./password";
import type { Teacher } from "./auth-types";

export const TEACHER_COOKIE = "zhice_teacher_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export async function createTeacherSession(teacherId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await getDb().insert(teacherSessions).values({
    id: randomUUID(),
    teacherId,
    tokenHash: hashSessionToken(token),
    expiresAt,
  });
  const cookieStore = await cookies();
  cookieStore.set(TEACHER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentTeacher(): Promise<Teacher | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TEACHER_COOKIE)?.value;
  if (!token) return null;
  const [row] = await getDb().select({
    id: teachers.id,
    name: teachers.name,
    email: teachers.email,
  }).from(teacherSessions)
    .innerJoin(teachers, eq(teacherSessions.teacherId, teachers.id))
    .where(and(
      eq(teacherSessions.tokenHash, hashSessionToken(token)),
      gt(teacherSessions.expiresAt, new Date()),
    ))
    .limit(1);
  return row ?? null;
}

export async function requireTeacher(nextPath = "/teacher"): Promise<Teacher> {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return teacher;
}

export async function destroyTeacherSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TEACHER_COOKIE)?.value;
  if (token) {
    await getDb().delete(teacherSessions).where(eq(teacherSessions.tokenHash, hashSessionToken(token)));
  }
  cookieStore.delete({ name: TEACHER_COOKIE, path: "/" });
}
