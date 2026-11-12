import type { GradeResult, Question, QuestionResult } from "./domain";

export function normalizeText(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function normalizeChoiceAnswer(answer: string[]): string[] {
  return [...new Set(answer.map((item) => item.trim().toUpperCase()))].sort();
}

export function isAnswerCorrect(question: Question, studentAnswer: string[] = []): boolean {
  if (studentAnswer.length === 0) return false;

  if (question.type === "fill_blank") {
    const answer = normalizeText(studentAnswer[0] ?? "");
    return answer.length > 0 && question.answer.some((accepted) => normalizeText(accepted) === answer);
  }

  const expected = normalizeChoiceAnswer(question.answer);
  const actual = normalizeChoiceAnswer(studentAnswer);
  return expected.length === actual.length && expected.every((item, index) => item === actual[index]);
}

export function gradeSubmission(
  questions: Question[],
  answers: Record<string, string[]>,
): GradeResult {
  const results: QuestionResult[] = questions.map((question) => {
    const studentAnswer = answers[question.id] ?? [];
    const isCorrect = isAnswerCorrect(question, studentAnswer);
    return {
      questionId: question.id,
      earnedScore: isCorrect ? question.score : 0,
      isCorrect,
      studentAnswer,
      correctAnswer: question.answer,
      explanation: question.explanation,
    };
  });

  return {
    score: results.reduce((sum, result) => sum + result.earnedScore, 0),
    correctCount: results.filter((result) => result.isCorrect).length,
    totalScore: questions.reduce((sum, question) => sum + question.score, 0),
    results,
  };
}

export function allocateScores(count: number, totalScore = 100): number[] {
  if (!Number.isInteger(count) || count < 1 || totalScore < count) {
    throw new Error("题量与总分设置无效");
  }
  const base = Math.floor(totalScore / count);
  const remainder = totalScore % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}
