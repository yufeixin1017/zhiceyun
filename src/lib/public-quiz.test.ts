import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_GENERATION_REQUEST } from "./demo-data";
import { generateDemoQuestions } from "./demo-generator";
import type { Quiz } from "./domain";
import { toPublicQuiz } from "./public-quiz";

describe("public quiz", () => {
  it("never exposes answers or explanations to students before submission", () => {
    const now = new Date().toISOString();
    const quiz: Quiz = {
      ...DEFAULT_GENERATION_REQUEST,
      id: "quiz-1", title: "测试随堂测验", status: "published", generationMode: "demo",
      questions: generateDemoQuestions(DEFAULT_GENERATION_REQUEST), createdAt: now, updatedAt: now,
    };
    const publicQuiz = toPublicQuiz(quiz);
    const serialized = JSON.stringify(publicQuiz);
    assert.equal("answer" in publicQuiz.questions[0], false);
    assert.equal("explanation" in publicQuiz.questions[0], false);
    assert.equal(serialized.includes(quiz.questions[0].explanation), false);
  });
});
