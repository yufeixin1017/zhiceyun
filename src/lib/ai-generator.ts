import { randomUUID } from "node:crypto";
import type { GenerateQuizRequest, Question } from "./domain";
import { questionSchema } from "./domain";
import { allocateScores } from "./scoring";

const TYPE_GUIDE = `
- single_choice：单选题，options 至少 4 项，answer 只能有 1 个选项 ID。
- multiple_choice：多选题，options 至少 4 项，answer 至少有 2 个选项 ID。
- true_false：判断题，options 必须为 []，answer 只能是 ["true"] 或 ["false"]。
- fill_blank：填空题，options 必须为 []，answer 是标准答案及可接受等价表述，答案必须简短且唯一明确。
`;

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
3. 每题提供 knowledgePoint 和 explanation；选择题选项 ID 使用 A、B、C、D。
4. 填空题只能考查简短事实或术语，answer 可包含等价答案，不得要求输入数学推导过程。
5. 只返回 JSON 对象，格式为 {"questions": [...]}。不要返回题目 ID 或分值，不要输出 Markdown。
${TYPE_GUIDE}`;
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
        { role: "system", content: "你是严谨的高校测评设计专家，只输出符合约束的 JSON。" },
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

  const generated = extractJson(content) as { questions?: unknown };
  if (!Array.isArray(generated.questions) || generated.questions.length !== request.questionCount) {
    throw new Error(`模型返回题量不正确，应为 ${request.questionCount} 题，请重试`);
  }

  const scores = allocateScores(request.questionCount);
  return generated.questions.map((item, index) =>
    questionSchema.parse({ ...(item as object), id: randomUUID(), score: scores[index] }),
  );
}
