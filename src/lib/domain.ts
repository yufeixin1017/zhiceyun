import { z } from "zod";

export const questionTypeSchema = z.enum([
  "single_choice",
  "multiple_choice",
  "true_false",
  "fill_blank",
]);

export const questionSchema = z
  .object({
    id: z.string().min(1),
    type: questionTypeSchema,
    stem: z.string().trim().min(2).max(2000),
    options: z
      .array(z.object({ id: z.string().min(1), text: z.string().trim().min(1).max(1000) }))
      .default([]),
    answer: z.array(z.string().trim().min(1)).min(1),
    explanation: z.string().trim().min(1).max(3000),
    knowledgePoint: z.string().trim().min(1).max(200),
    score: z.number().int().positive().max(100),
  })
  .superRefine((question, context) => {
    const optionIds = new Set(question.options.map((option) => option.id));
    if (["single_choice", "multiple_choice"].includes(question.type)) {
      if (question.options.length < 2) {
        context.addIssue({ code: "custom", message: "选择题至少需要两个选项" });
      }
      if (optionIds.size !== question.options.length) {
        context.addIssue({ code: "custom", message: "选项编号不能重复" });
      }
      if (question.answer.some((answer) => !optionIds.has(answer))) {
        context.addIssue({ code: "custom", message: "选择题答案必须对应已有选项" });
      }
    } else if (question.options.length > 0) {
      context.addIssue({ code: "custom", message: "判断题和填空题不需要选项" });
    }
    if (question.type === "single_choice" && question.answer.length !== 1) {
      context.addIssue({ code: "custom", message: "单选题只能有一个答案" });
    }
    if (question.type === "multiple_choice" && question.answer.length < 2) {
      context.addIssue({ code: "custom", message: "多选题至少设置两个正确选项" });
    }
    if (
      question.type === "true_false" &&
      (question.answer.length !== 1 || !["true", "false"].includes(question.answer[0]))
    ) {
      context.addIssue({ code: "custom", message: "判断题答案只能是 true 或 false" });
    }
  });

export const quizStatusSchema = z.enum(["draft", "published", "closed"]);
export const difficultySchema = z.enum(["easy", "medium", "hard"]);

export const quizSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(2).max(120),
  courseName: z.string().trim().min(1).max(100),
  topic: z.string().trim().min(1).max(200),
  sourceContent: z.string().trim().min(10).max(12000),
  difficulty: difficultySchema,
  durationMinutes: z.number().int().min(1).max(120),
  status: quizStatusSchema,
  generationMode: z.enum(["ai", "demo"]),
  questions: z.array(questionSchema).min(1).max(20),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().optional(),
});

export const generateQuizRequestSchema = z
  .object({
    courseName: z.string().trim().min(1, "请填写课程名称").max(100),
    topic: z.string().trim().min(1, "请填写本节课主题").max(200),
    sourceContent: z.string().trim().min(10, "请至少输入 10 个字的课堂内容").max(12000),
    questionCount: z.number().int().min(3).max(10),
    questionTypes: z.array(questionTypeSchema).min(1, "请至少选择一种题型"),
    difficulty: difficultySchema,
    durationMinutes: z.number().int().min(1).max(120),
    mode: z.enum(["ai", "demo"]).optional(),
  })
  .superRefine((request, context) => {
    if (new Set(request.questionTypes).size !== request.questionTypes.length) {
      context.addIssue({ code: "custom", message: "题型不能重复" });
    }
  });

export const submissionSchema = z.object({
  id: z.string().min(1),
  quizId: z.string().min(1),
  studentName: z.string().trim().min(1).max(40),
  studentNo: z.string().trim().max(40).optional(),
  answers: z.record(z.string(), z.array(z.string().max(1000)).max(10)),
  score: z.number().int().nonnegative(),
  correctCount: z.number().int().nonnegative(),
  totalScore: z.number().int().positive(),
  submittedAt: z.string(),
});

export const submitAnswersSchema = z.object({
  studentName: z.string().trim().min(1, "请填写姓名或演示昵称").max(40),
  studentNo: z.string().trim().max(40).optional(),
  answers: z.record(z.string(), z.array(z.string().max(1000)).max(10)),
});

export const quizUpdateSchema = z.object({
  title: z.string().trim().min(2).max(120),
  durationMinutes: z.number().int().min(1).max(120),
  questions: z.array(questionSchema).min(1).max(20),
});

export type QuestionType = z.infer<typeof questionTypeSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Quiz = z.infer<typeof quizSchema>;
export type QuizStatus = z.infer<typeof quizStatusSchema>;
export type GenerateQuizRequest = z.infer<typeof generateQuizRequestSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type SubmitAnswers = z.infer<typeof submitAnswersSchema>;
export type QuizUpdate = z.infer<typeof quizUpdateSchema>;

export type PublicQuiz = Omit<Quiz, "questions"> & {
  questions: Array<Omit<Question, "answer" | "explanation">>;
};

export type QuestionResult = {
  questionId: string;
  earnedScore: number;
  isCorrect: boolean;
  studentAnswer: string[];
  correctAnswer: string[];
  explanation: string;
};

export type GradeResult = {
  score: number;
  correctCount: number;
  totalScore: number;
  results: QuestionResult[];
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "单选题",
  multiple_choice: "多选题",
  true_false: "判断题",
  fill_blank: "填空题",
};

export const DIFFICULTY_LABELS = {
  easy: "基础",
  medium: "适中",
  hard: "进阶",
} as const;
