import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import type { GenerateQuizRequest, Question, QuestionType } from "./domain";
import { questionSchema } from "./domain";
import { allocateScores } from "./scoring";

const TYPE_GUIDE = `
- single_choice：单选题，options 至少 4 项，answer 只能有 1 个选项 ID。
- multiple_choice：多选题，options 至少 4 项，answer 至少有 2 个选项 ID。
- true_false：判断题，options 必须为 []，answer 只能是 ["true"] 或 ["false"]。
- fill_blank：填空题，options 必须为 []，answer 是标准答案及可接受等价表述，答案必须简短且唯一明确。
`;

const JSON_EXAMPLE = `{
  "questions": [
    {
      "type": "single_choice",
      "stem": "这里填写完整题干",
      "options": [
        {"id": "A", "text": "第一个选项"},
        {"id": "B", "text": "第二个选项"},
        {"id": "C", "text": "第三个选项"},
        {"id": "D", "text": "第四个选项"}
      ],
      "answer": ["A"],
      "explanation": "这里填写答案解析",
      "knowledgePoint": "这里填写对应知识点"
    }
  ]
}`;

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY?.trim());
}

function extractJson(content: string): unknown {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("模型未返回有效的 JSON 对象");
  }
}

function buildPrompt(request: GenerateQuizRequest): string {
  const difficulty = { easy: "基础", medium: "适中", hard: "进阶" }[request.difficulty];
  return `请为高校课堂生成一份随堂知识回顾测验。
课程：${request.courseName}
本节课主题：${request.topic}
难度：${difficulty}
题目总数：${request.questionCount}
允许题型及顺序：${request.questionTypes.join("、")}。请按此顺序循环分配题型，总数必须准确。

教师提供的课堂内容：
"""
${request.sourceContent}
"""

要求：
1. 只生成上述允许的客观题，不生成简答、计算过程、证明或论述题。
2. 题目应检查课堂核心知识，不得照搬示例，不得生成有歧义、超纲或无法由材料验证的内容。
3. 每题必须提供 stem、type、options、answer、explanation、knowledgePoint 六个字段，字段名严格使用英文小写或指定的驼峰格式。
4. 选择题选项 ID 使用 A、B、C、D，answer 只能填写选项 ID，不能填写选项正文。
5. 填空题只能考查简短事实或术语，answer 可包含等价答案，不得要求输入数学推导过程。
6. 不要返回题目 ID 或分值，不要输出 Markdown、注释或 JSON 之外的说明。
${TYPE_GUIDE}
JSON 结构示例（仅示意字段结构，请根据教师内容重新出题）：
${JSON_EXAMPLE}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function pick(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

function normalizeType(value: unknown, fallback: QuestionType): QuestionType {
  const type = String(value ?? "").trim().toLocaleLowerCase();
  if (["single_choice", "single", "单选", "单选题"].includes(type)) return "single_choice";
  if (["multiple_choice", "multiple", "multi", "多选", "多选题"].includes(type)) return "multiple_choice";
  if (["true_false", "true/false", "judgment", "judge", "判断", "判断题"].includes(type)) return "true_false";
  if (["fill_blank", "fill", "blank", "填空", "填空题"].includes(type)) return "fill_blank";
  return fallback;
}

function normalizeOptions(value: unknown): Array<{ id: string; text: string }> {
  if (Array.isArray(value)) {
    return value.map((option, index) => {
      const fallbackId = String.fromCharCode(65 + index);
      if (typeof option === "string" || typeof option === "number") {
        return { id: fallbackId, text: String(option) };
      }
      const record = asRecord(option);
      return {
        id: String(pick(record, ["id", "key", "optionId"]) ?? fallbackId).trim().toUpperCase(),
        text: String(pick(record, ["text", "content", "label", "value"]) ?? "").trim(),
      };
    });
  }
  const record = asRecord(value);
  return Object.entries(record).map(([id, text]) => ({ id: id.trim().toUpperCase(), text: String(text).trim() }));
}

function normalizeAnswer(value: unknown, type: QuestionType): string[] {
  const source = Array.isArray(value) ? value : [value ?? ""];
  let answers = source.map((answer) => {
    if (typeof answer === "object" && answer !== null) {
      return String(pick(asRecord(answer), ["id", "key", "value", "text"]) ?? "").trim();
    }
    return String(answer).trim();
  }).filter(Boolean);

  if (type === "true_false") {
    const answer = (answers[0] ?? "").toLocaleLowerCase();
    if (["true", "t", "yes", "正确", "对", "√"].includes(answer)) return ["true"];
    if (["false", "f", "no", "错误", "错", "×"].includes(answer)) return ["false"];
    return answers;
  }

  if (type === "single_choice" || type === "multiple_choice") {
    if (answers.length === 1) {
      const answer = answers[0].replace(/^答案\s*[:：]\s*/, "").trim();
      if (type === "multiple_choice" && /[,，、;；\s]/.test(answer)) {
        answers = answer.split(/[,，、;；\s]+/).filter(Boolean);
      } else if (type === "multiple_choice" && /^[A-Fa-f]{2,6}$/.test(answer)) {
        answers = answer.split("");
      } else {
        answers = [answer];
      }
    }
    return answers.map((answer) => {
      const match = answer.trim().match(/^[（(]?([A-Fa-f])(?:[）).、\s]|$)/);
      return match ? match[1].toUpperCase() : answer.trim().toUpperCase();
    });
  }
  return answers;
}

export function normalizeAiQuestions(payload: unknown, request: GenerateQuizRequest): Question[] {
  const root = asRecord(payload);
  const questions = Array.isArray(payload)
    ? payload
    : pick(root, ["questions"]) ?? pick(asRecord(root.quiz), ["questions"]) ?? pick(asRecord(root.data), ["questions"]);

  if (!Array.isArray(questions) || questions.length !== request.questionCount) {
    throw new Error(`模型返回题量不正确，应为 ${request.questionCount} 题，请重试`);
  }

  const scores = allocateScores(request.questionCount);
  return questions.map((item, index) => {
    const raw = asRecord(item);
    const expectedType = request.questionTypes[index % request.questionTypes.length];
    const type = normalizeType(pick(raw, ["type", "questionType", "question_type", "题型"]), expectedType);
    const normalized = {
      id: randomUUID(),
      score: scores[index],
      type,
      stem: pick(raw, ["stem", "question", "questionText", "question_text", "title", "题干"]) ?? "",
      options: normalizeOptions(pick(raw, ["options", "choices", "选项"])),
      answer: normalizeAnswer(pick(raw, ["answer", "correctAnswer", "correct_answer", "answers", "答案"]), type),
      explanation: pick(raw, ["explanation", "analysis", "rationale", "解析", "答案解析"]) ?? "",
      knowledgePoint: pick(raw, ["knowledgePoint", "knowledge_point", "knowledge", "知识点"]) ?? request.topic,
    };

    try {
      const question = questionSchema.parse(normalized);
      if (question.type !== expectedType) {
        throw new ZodError([{ code: "custom", path: ["type"], message: `应为 ${expectedType}，实际为 ${question.type}` }]);
      }
      return question;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ZodError(error.issues.map((issue) => ({ ...issue, path: [index, ...issue.path] })));
      }
      throw error;
    }
  });
}

export async function generateAiQuestions(request: GenerateQuizRequest): Promise<Question[]> {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) throw new Error("尚未配置 AI_API_KEY");

  const baseUrl = (process.env.AI_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "deepseek-chat";
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "你是严谨的高校测评设计专家。必须严格使用用户指定的字段名，只输出符合约束的 JSON。" },
        { role: "user", content: buildPrompt(request) },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(75000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`大模型接口请求失败（${response.status}）：${detail}`);
  }

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("大模型接口未返回测验内容");
  return normalizeAiQuestions(extractJson(content), request);
}
