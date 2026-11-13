import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getQuestionAnalysis } from "./answer-analysis";
import type { Question, Submission } from "./domain";

const multipleChoice: Question = {
  id: "q1",
  type: "multiple_choice",
  stem: "选择正确选项",
  options: ["A", "B", "C", "D"].map((id) => ({ id, text: `选项 ${id}` })),
  answer: ["A", "C"],
  explanation: "解析",
  knowledgePoint: "测试",
  score: 20,
};

function submission(id: string, name: string, answer: string[]): Submission {
  return {
    id,
    quizId: "quiz-1",
    studentName: name,
    studentNo: `NO-${id}`,
    answers: { q1: answer },
    score: 0,
    correctCount: 0,
    totalScore: 100,
    submittedAt: "2026-01-01T00:00:00.000Z",
    isLate: false,
  };
}

describe("question answer analysis", () => {
  it("merges multiple-choice answer combinations regardless of selection order", () => {
    const result = getQuestionAnalysis(multipleChoice, [
      submission("s1", "甲", ["C", "A"]),
      submission("s2", "乙", ["A", "C"]),
      submission("s3", "丙", ["A", "B"]),
    ]);
    assert.equal(result.total, 3);
    assert.equal(result.correctCount, 2);
    assert.equal(result.incorrectCount, 1);
    assert.equal(result.answerGroups.length, 2);
    assert.equal(result.answerGroups[0].label, "A、C");
    assert.equal(result.answerGroups[0].students.length, 2);
    assert.equal(result.optionStats.find((option) => option.id === "A")?.count, 3);
    assert.equal(result.optionStats.find((option) => option.id === "C")?.count, 2);
  });

  it("normalizes fill-blank groups without losing correctness", () => {
    const question: Question = { ...multipleChoice, type: "fill_blank", options: [], answer: ["AI"] };
    const result = getQuestionAnalysis(question, [
      submission("s1", "甲", [" AI "]),
      submission("s2", "乙", ["ａｉ"]),
      submission("s3", "丙", ["机器学习"]),
    ]);
    assert.equal(result.answerGroups.length, 2);
    assert.equal(result.answerGroups[0].count, 2);
    assert.equal(result.correctCount, 2);
  });

  it("includes unanswered students in the analysis", () => {
    const result = getQuestionAnalysis(multipleChoice, [submission("s1", "甲", [])]);
    assert.equal(result.unansweredCount, 1);
    assert.equal(result.answerGroups[0].label, "未作答");
  });
});
