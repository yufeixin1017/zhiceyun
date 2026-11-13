import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Quiz } from "./domain";
import { toPublicQuiz } from "./public-quiz";
import { buildTestQuestions } from "./test-fixtures";

describe("public quiz", () => {
  it("never exposes answers or explanations to students before submission", () => {
    const now = new Date().toISOString();
    const quiz: Quiz = {
      id: "quiz-1",
      title: "测试随堂测验",
      courseName: "测试课程",
      topic: "测试主题",
      sourceContent: "足够长的测试课堂内容。",
      difficulty: "medium",
      durationMinutes: 10,
      status: "published",
      questions: buildTestQuestions(6),
      createdAt: now,
      updatedAt: now,
    };
    const publicQuiz = toPublicQuiz(quiz);
    const serialized = JSON.stringify(publicQuiz);
    assert.equal("answer" in publicQuiz.questions[0], false);
    assert.equal("explanation" in publicQuiz.questions[0], false);
    assert.equal(serialized.includes(quiz.questions[0].explanation), false);
  });
});