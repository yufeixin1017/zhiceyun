import type { GenerateQuizRequest } from "./domain";

// 教师自行填写课程、主题和课堂内容，这里只保留出题参数的便捷默认值。
export const EMPTY_GENERATION_REQUEST: GenerateQuizRequest = {
  courseName: "",
  topic: "",
  sourceContent: "",
  questionCount: 6,
  questionTypes: ["single_choice", "multiple_choice", "true_false", "fill_blank"],
  difficulty: "medium",
  durationMinutes: 10,
};