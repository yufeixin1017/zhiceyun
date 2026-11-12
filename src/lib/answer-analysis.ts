import type { Question, Submission } from "./domain";
import { isAnswerCorrect, normalizeText } from "./scoring";
import { getStudentAnswerLabel } from "./utils";

export type AnswerStudent = {
  submissionId: string;
  studentName: string;
  studentNo?: string;
  submittedAt: string;
  answer: string[];
  isCorrect: boolean;
};

function canonicalAnswer(question: Question, answer: string[]): string[] {
  if (question.type === "fill_blank") {
    const normalized = normalizeText(answer[0] ?? "");
    return normalized ? [normalized] : [];
  }
  if (question.type === "true_false") return answer;
  return [...new Set(answer.map((item) => item.trim().toUpperCase()))].sort();
}

export function getQuestionAnalysis(question: Question, submissions: Submission[]) {
  const students: AnswerStudent[] = submissions.map((submission) => {
    const answer = submission.answers[question.id] ?? [];
    return {
      submissionId: submission.id,
      studentName: submission.studentName,
      studentNo: submission.studentNo,
      submittedAt: submission.submittedAt,
      answer,
      isCorrect: isAnswerCorrect(question, answer),
    };
  });

  const groupMap = new Map<string, {
    label: string;
    isCorrect: boolean;
    students: AnswerStudent[];
  }>();
  for (const student of students) {
    const canonical = canonicalAnswer(question, student.answer);
    const key = JSON.stringify(canonical);
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        label: getStudentAnswerLabel(question.type, question.type === "fill_blank" ? student.answer : canonical),
        isCorrect: isAnswerCorrect(question, canonical),
        students: [],
      });
    }
    groupMap.get(key)!.students.push(student);
  }
  const answerGroups = [...groupMap.values()]
    .map((group) => ({ ...group, count: group.students.length }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-CN"));

  const options = question.type === "true_false"
    ? [{ id: "true", text: "正确" }, { id: "false", text: "错误" }]
    : question.options;
  const optionStats = (question.type === "fill_blank" ? [] : options).map((option) => {
    const optionStudents = students.filter((student) =>
      canonicalAnswer(question, student.answer).includes(option.id),
    );
    return {
      ...option,
      isAnswer: question.answer.includes(option.id),
      count: optionStudents.length,
      students: optionStudents,
    };
  });

  return {
    total: students.length,
    correctCount: students.filter((student) => student.isCorrect).length,
    incorrectCount: students.filter((student) => !student.isCorrect).length,
    unansweredCount: students.filter((student) => canonicalAnswer(question, student.answer).length === 0).length,
    correctStudents: students.filter((student) => student.isCorrect),
    incorrectStudents: students.filter((student) => !student.isCorrect),
    answerGroups,
    optionStats,
  };
}
