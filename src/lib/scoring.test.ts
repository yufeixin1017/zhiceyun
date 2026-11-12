import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Question } from "./domain";
import { allocateScores, gradeSubmission, isAnswerCorrect, normalizeText } from "./scoring";

const base: Question = {
  id: "q1",
  type: "single_choice",
  stem: "测试题目",
  options: [
    { id: "A", text: "选项 A" },
    { id: "B", text: "选项 B" },
  ],
  answer: ["A"],
  explanation: "解析",
  knowledgePoint: "测试",
  score: 20,
};

describe("allocateScores", () => {
  it("distributes the total exactly when it is not divisible", () => {
    const scores = allocateScores(6, 100);
    assert.deepEqual(scores, [17, 17, 17, 17, 16, 16]);
    assert.equal(scores.reduce((sum, score) => sum + score, 0), 100);
  });

  it("rejects an invalid question count", () => {
    assert.throws(() => allocateScores(0));
  });
});

describe("answer normalization", () => {
  it("normalizes full-width characters, case and whitespace", () => {
    assert.equal(normalizeText("  ＡＩ   Agent "), "ai agent");
  });

  it("accepts alternative fill-blank answers", () => {
    const question: Question = { ...base, type: "fill_blank", options: [], answer: ["过拟合", "过度拟合"] };
    assert.equal(isAnswerCorrect(question, [" 过度拟合 "]), true);
    assert.equal(isAnswerCorrect(question, ["欠拟合"]), false);
    assert.equal(isAnswerCorrect(question, []), false);
  });

  it("grades multiple choice as all-or-nothing and ignores answer order", () => {
    const question: Question = { ...base, type: "multiple_choice", answer: ["A", "B"] };
    assert.equal(isAnswerCorrect(question, ["b", "a"]), true);
    assert.equal(isAnswerCorrect(question, ["A"]), false);
    assert.equal(isAnswerCorrect(question, ["A", "B", "A"]), true);
  });
});

describe("gradeSubmission", () => {
  it("uses server-side question answers and calculates the total", () => {
    const second: Question = { ...base, id: "q2", type: "true_false", options: [], answer: ["false"], score: 30 };
    const result = gradeSubmission([base, second], { q1: ["A"], q2: ["true"] });
    assert.equal(result.score, 20);
    assert.equal(result.totalScore, 50);
    assert.equal(result.correctCount, 1);
    assert.deepEqual(result.results[1].studentAnswer, ["true"]);
  });

  it("treats missing answers as incorrect", () => {
    const result = gradeSubmission([base], {});
    assert.equal(result.score, 0);
    assert.deepEqual(result.results[0].studentAnswer, []);
  });
});
