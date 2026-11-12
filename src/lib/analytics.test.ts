import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getQuizAnalytics } from "./analytics";
import { DEFAULT_GENERATION_REQUEST } from "./demo-data";
import { generateDemoQuestions } from "./demo-generator";
import type { Quiz, Submission } from "./domain";

function fixture() {
  const now = new Date().toISOString();
  const questions = generateDemoQuestions({ ...DEFAULT_GENERATION_REQUEST, questionCount: 3, questionTypes: ["true_false"] });
  const quiz: Quiz = {
    id: "quiz-1", title: "课堂测试", courseName: "课程", topic: "主题", sourceContent: "足够长的课堂测试内容",
    difficulty: "medium", durationMinutes: 10, status: "published", generationMode: "demo", questions,
    createdAt: now, updatedAt: now,
  };
  const answers = Object.fromEntries(questions.map((question) => [question.id, question.answer]));
  const first: Submission = { id: "s1", quizId: quiz.id, studentName: "甲", answers, score: 100, correctCount: 3, totalScore: 100, submittedAt: now };
  const second: Submission = { ...first, id: "s2", studentName: "乙", answers: {}, score: 0, correctCount: 0 };
  return { quiz, submissions: [first, second] };
}

describe("quiz analytics", () => {
  it("calculates class and per-question statistics from real submissions", () => {
    const { quiz, submissions } = fixture();
    const analytics = getQuizAnalytics(quiz, submissions);
    assert.equal(analytics.count, 2);
    assert.equal(analytics.averageScore, 50);
    assert.equal(analytics.passRate, 50);
    assert.equal(analytics.questionStats[0].correctRate, 50);
  });

  it("handles a quiz with no submissions", () => {
    const { quiz } = fixture();
    const analytics = getQuizAnalytics(quiz, []);
    assert.equal(analytics.averageScore, 0);
    assert.equal(analytics.questionStats[0].correctRate, 0);
  });
});
