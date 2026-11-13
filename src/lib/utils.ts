import type { QuestionType } from "./domain";

const APP_TIME_ZONE = "Asia/Shanghai";

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(date));
}

export function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(date));
}

export function getAnswerLabel(type: QuestionType, answer: string[]): string {
  if (type === "true_false") return answer[0] === "true" ? "正确" : "错误";
  if (type === "fill_blank") return answer.join(" / ");
  return answer.join("、");
}

export function getStudentAnswerLabel(type: QuestionType, answer: string[]): string {
  if (!answer.length) return "未作答";
  return getAnswerLabel(type, answer);
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
