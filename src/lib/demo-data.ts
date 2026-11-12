import type { GenerateQuizRequest } from "./domain";

export const DEFAULT_GENERATION_REQUEST: GenerateQuizRequest = {
  courseName: "机器学习导论",
  topic: "过拟合与模型泛化",
  sourceContent:
    "本节课介绍模型泛化与过拟合。过拟合是指模型在训练集上表现良好，但在未见数据上表现较差。常见原因包括模型复杂度过高、训练数据不足以及训练数据中的噪声。可以通过正则化、增加有效训练数据、数据增强和早停等方法缓解。验证集用于模型选择和超参数调整，测试集用于最终评估，不能用测试集反复调参。",
  questionCount: 6,
  questionTypes: ["single_choice", "multiple_choice", "true_false", "fill_blank"],
  difficulty: "medium",
  durationMinutes: 10,
  mode: "demo",
};

export const EMPTY_GENERATION_REQUEST: GenerateQuizRequest = {
  courseName: "",
  topic: "",
  sourceContent: "",
  questionCount: 6,
  questionTypes: ["single_choice", "multiple_choice", "true_false", "fill_blank"],
  difficulty: "medium",
  durationMinutes: 10,
  mode: "demo",
};
