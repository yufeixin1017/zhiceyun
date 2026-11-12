import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_GENERATION_REQUEST } from "./demo-data";
import { generateDemoQuestions } from "./demo-generator";

describe("demo generator", () => {
  it("creates the requested number of validated questions and a 100-point quiz", () => {
    const questions = generateDemoQuestions(DEFAULT_GENERATION_REQUEST);
    assert.equal(questions.length, 6);
    assert.equal(questions.reduce((sum, question) => sum + question.score, 0), 100);
    assert.equal(new Set(questions.map((question) => question.type)).size, 4);
  });

  it("respects a reduced set of question types", () => {
    const questions = generateDemoQuestions({
      ...DEFAULT_GENERATION_REQUEST,
      questionCount: 3,
      questionTypes: ["true_false"],
    });
    assert.equal(questions.every((question) => question.type === "true_false"), true);
  });
});
