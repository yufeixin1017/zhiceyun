import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getQuizAnalytics } from "./analytics";
import { buildTestQuestions, TEST_GENERATION_REQUEST } from "./test-fixtures";
import type { Quiz, Submission } from "./domain";

function fixture() {
  const now = new Date().toISOString();
  const questions = buildTestQuestions(3);
  const quiz: Quiz = {
    id: "quiz-1", title: "课堂测试", courseName: "课程", topic: "主题", sourceContent: "足够长的课堂测试内容",
    difficulty: "medium", durationMinutes: 10, status: "published", questions,
    createdAt: now, updatedAt: now,
  };
  const answers = Object.fromEntries(questions.map((question) => [question.id, question.answer]));
  const first: Submission = { id: "s1", quizId: quiz.id, studentName: "甲", answers, score: 100, correctCount: 3, totalScore: 100, submittedAt: now, isLate: false };
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

  it("keeps the test fixture free of product-only fields", () => {
    assert.equal("mode" in TEST_GENERATION_REQUEST, false);
  });
});