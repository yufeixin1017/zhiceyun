const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

export function isLoginRateLimited(key: string): boolean {
  const current = attempts.get(key);
  if (!current || current.resetAt <= Date.now()) {
    attempts.delete(key);
    return false;
  }
  return current.count >= MAX_FAILURES;
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    current.count += 1;
  }
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}
