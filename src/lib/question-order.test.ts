import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Question, QuestionType } from "./domain";
import { organizeQuestions } from "./question-order";

function question(id: string, knowledgePoint: string, type: QuestionType): Question {
  const isChoice = type === "single_choice" || type === "multiple_choice";
  return {
    id,
    type,
    stem: `题目 ${id}`,
    knowledgePoint,
    options: isChoice ? [{ id: "A", text: "选项 A" }, { id: "B", text: "选项 B" }] : [],
    answer: type === "multiple_choice" ? ["A", "B"] : type === "true_false" ? ["true"] : ["A"],
    explanation: "解析",
    score: 1,
  };
}

describe("question organization", () => {
  it("groups scattered knowledge points and applies the required type order", () => {
    const input = [
      question("single-1", "过拟合", "single_choice"),
      question("single-2", "正则化", "single_choice"),
      question("fill-1", "过拟合", "fill_blank"),
      question("multiple-1", "过拟合", "multiple_choice"),
      question("judge-1", "过拟合", "true_false"),
      question("multiple-2", "正则化", "multiple_choice"),
    ];
    const originalIds = input.map((item) => item.id);
    const result = organizeQuestions(input);

    assert.deepEqual(result.map((item) => item.id), [
      "single-1", "multiple-1", "judge-1", "fill-1", "single-2", "multiple-2",
    ]);
    assert.deepEqual(result.map((item) => item.score), [17, 17, 17, 17, 16, 16]);
    assert.equal(result.reduce((sum, item) => sum + item.score, 0), 100);
    assert.deepEqual(input.map((item) => item.id), originalIds, "不能修改模型原始返回数组");
  });

  it("keeps first-appearance group order and stable order within the same type", () => {
    const result = organizeQuestions([
      question("b-first", " 正则化 ", "single_choice"),
      question("a-first", "过拟合", "single_choice"),
      question("b-second", "正则化", "single_choice"),
    ]);
    assert.deepEqual(result.map((item) => item.id), ["b-first", "b-second", "a-first"]);
  });
});
