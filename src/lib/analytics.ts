import type { Quiz, Submission } from "./domain";
import { isAnswerCorrect } from "./scoring";

export function getQuizAnalytics(quiz: Quiz, submissions: Submission[]) {
  const count = submissions.length;
  const averageScore = count ? Math.round((submissions.reduce((sum, item) => sum + item.score, 0) / count) * 10) / 10 : 0;
  const averageRate = count ? Math.round(submissions.reduce((sum, item) => sum + (item.score / item.totalScore) * 100, 0) / count) : 0;
  const highestScore = count ? Math.max(...submissions.map((item) => item.score)) : 0;
  const passRate = count ? Math.round((submissions.filter((item) => item.score >= 60).length / count) * 100) : 0;
  const questionStats = quiz.questions.map((question) => {
    const correctCount = submissions.filter((submission) => isAnswerCorrect(question, submission.answers[question.id] ?? [])).length;
    return { question, correctCount, correctRate: count ? Math.round((correctCount / count) * 100) : 0 };
  });
  return { count, averageScore, averageRate, highestScore, passRate, questionStats };
}
