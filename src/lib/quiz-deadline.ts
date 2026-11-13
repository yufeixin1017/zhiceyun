import type { Quiz } from "./domain";

// 限时从教师发布时刻统一计算。
export function getDeadline(quiz: Pick<Quiz, "publishedAt" | "durationMinutes">): Date | null {
  if (!quiz.publishedAt) return null;
  const publishedAt = new Date(quiz.publishedAt).getTime();
  if (Number.isNaN(publishedAt)) return null;
  return new Date(publishedAt + quiz.durationMinutes * 60_000);
}

export function isLateSubmission(
  quiz: Pick<Quiz, "publishedAt" | "durationMinutes">,
  submittedAt: Date = new Date(),
): boolean {
  const deadline = getDeadline(quiz);
  return deadline ? submittedAt.getTime() > deadline.getTime() : false;
}

export function getRemainingSeconds(deadline: Date | null, now: Date = new Date()): number {
  if (!deadline) return 0;
  return Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));
}