import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ZodError } from "zod";
import { normalizeAiQuestions } from "./ai-generator";
import { TEST_GENERATION_REQUEST } from "./test-fixtures";

const request = {
  ...TEST_GENERATION_REQUEST,
  questionCount: 3,
  questionTypes: ["single_choice", "true_false", "fill_blank"] as const,
};
const normalizedRequest = { ...request, questionTypes: [...request.questionTypes] };

describe("AI output normalization", () => {
  it("accepts common model field aliases without weakening validation", () => {
    const questions = normalizeAiQuestions({
      questions: [
        {
          type: "single",
          question: "模型在训练集表现好而新数据表现差，称为什么？",
          choices: { A: "欠拟合", B: "过拟合", C: "数据增强", D: "标准化" },
          correctAnswer: "B",
          analysis: "这是过拟合的典型表现。",
          knowledge_point: "过拟合",
        },
        {
          questionType: "判断题",
          stem: "验证集可用于模型选择。",
          answer: "正确",
          explanation: "验证集用于模型选择与超参数调整。",
          knowledgePoint: "验证集",
        },
        {
          type: "fill_blank",
          stem: "在损失函数中加入参数惩罚项的方法称为____。",
          correctAnswer: ["正则化", "正则化方法"],
          analysis: "正则化可以约束模型复杂度。",
          knowledgePoint: "正则化",
        },
      ],
    }, normalizedRequest);

    assert.equal(questions.length, 3);
    assert.equal(questions[0].stem, "模型在训练集表现好而新数据表现差，称为什么？");
    assert.deepEqual(questions[0].answer, ["B"]);
    assert.equal(questions[0].options.length, 4);
    assert.deepEqual(questions[1].answer, ["true"]);
    assert.deepEqual(questions[2].answer, ["正则化", "正则化方法"]);
    assert.equal(questions.reduce((sum, question) => sum + question.score, 0), 100);
  });

  it("reports the question index and missing stem field", () => {
    let caught: unknown;
    try {
      normalizeAiQuestions({ questions: [{ type: "single_choice", answer: ["A"] }] }, {
        ...normalizedRequest,
        questionCount: 1,
        questionTypes: ["single_choice"],
      });
    } catch (error) {
      caught = error;
    }
    assert.equal(caught instanceof ZodError, true);
    assert.deepEqual((caught as ZodError).issues[0].path.slice(0, 2), [0, "stem"]);
  });

  it("rejects a type that differs from the requested sequence", () => {
    assert.throws(() => normalizeAiQuestions({
      questions: [{
        type: "true_false",
        stem: "验证集可用于模型选择。",
        answer: ["true"],
        explanation: "验证集用于模型选择。",
        knowledgePoint: "验证集",
      }],
    }, { ...normalizedRequest, questionCount: 1, questionTypes: ["single_choice"] }), /single_choice/);
  });
});
