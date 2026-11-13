import type { GenerateQuizRequest, Question, QuestionType } from "./domain";
import { allocateScores } from "./scoring";

// 仅供单元测试使用，不参与任何产品运行路径。
export const TEST_GENERATION_REQUEST: GenerateQuizRequest = {
  courseName: "机器学习导论",
  topic: "过拟合与模型泛化",
  sourceContent: "过拟合是指模型在训练集上表现良好，但在未见数据上表现较差。可通过正则化、数据增强和早停缓解。",
  questionCount: 6,
  questionTypes: ["single_choice", "multiple_choice", "true_false", "fill_blank"],
  difficulty: "medium",
  durationMinutes: 10,
};

export function buildTestQuestions(count: number, type: QuestionType = "true_false"): Question[] {
  const scores = allocateScores(count);
  return Array.from({ length: count }, (_, index) => ({
    id: `question-${index + 1}`,
    type,
    stem: `测试题目 ${index + 1}：判断以下说法是否正确。`,
    options: [],
    answer: ["true"],
    explanation: `测试题目 ${index + 1} 的解析。`,
    knowledgePoint: "测试知识点",
    score: scores[index],
  }));
}