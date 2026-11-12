import { randomUUID } from "node:crypto";
import type { GenerateQuizRequest, Question, QuestionType } from "./domain";
import { questionSchema } from "./domain";
import { allocateScores } from "./scoring";

type QuestionDraft = Omit<Question, "id" | "score">;

const overfittingBank: QuestionDraft[] = [
  {
    type: "single_choice",
    stem: "模型在训练集上表现很好，但在未见过的数据上误差明显增大，这种现象称为？",
    options: [
      { id: "A", text: "欠拟合" },
      { id: "B", text: "过拟合" },
      { id: "C", text: "数据增强" },
      { id: "D", text: "特征标准化" },
    ],
    answer: ["B"],
    explanation: "过拟合表现为模型过度记忆训练数据细节，导致泛化能力下降。",
    knowledgePoint: "过拟合的概念",
  },
  {
    type: "single_choice",
    stem: "下列哪种做法通常最有助于缓解过拟合？",
    options: [
      { id: "A", text: "无限增加模型复杂度" },
      { id: "B", text: "只关注训练集准确率" },
      { id: "C", text: "使用正则化或增加有效训练数据" },
      { id: "D", text: "删除验证集" },
    ],
    answer: ["C"],
    explanation: "正则化约束模型复杂度，更多有效数据有助于模型学习可泛化的规律。",
    knowledgePoint: "过拟合的缓解方法",
  },
  {
    type: "multiple_choice",
    stem: "下列哪些现象可能提示模型发生了过拟合？",
    options: [
      { id: "A", text: "训练误差很低" },
      { id: "B", text: "验证误差明显高于训练误差" },
      { id: "C", text: "模型过度拟合训练数据中的噪声" },
      { id: "D", text: "训练误差和验证误差始终都很高" },
    ],
    answer: ["A", "B", "C"],
    explanation: "训练误差低而验证误差高是典型信号；两者都高更可能指向欠拟合。",
    knowledgePoint: "过拟合的识别",
  },
  {
    type: "true_false",
    stem: "只要不断提高训练集准确率，就一定能提升模型在新数据上的表现。",
    options: [],
    answer: ["false"],
    explanation: "过度优化训练集可能记忆噪声，反而降低模型的泛化能力。",
    knowledgePoint: "模型泛化",
  },
  {
    type: "true_false",
    stem: "验证集可以用于比较不同模型的泛化表现，辅助选择超参数。",
    options: [],
    answer: ["true"],
    explanation: "验证集用于模型选择和超参数调整，测试集则用于最终评估。",
    knowledgePoint: "验证集的作用",
  },
  {
    type: "fill_blank",
    stem: "模型在训练数据上表现良好，但在新数据上表现较差的现象称为____。",
    options: [],
    answer: ["过拟合", "过度拟合"],
    explanation: "该现象称为过拟合，核心是模型泛化能力不足。",
    knowledgePoint: "过拟合的概念",
  },
  {
    type: "fill_blank",
    stem: "在损失函数中加入对模型参数的惩罚项，这种常用方法称为____。",
    options: [],
    answer: ["正则化", "正则化方法"],
    explanation: "正则化通过惩罚过大的参数或过高的复杂度来约束模型。",
    knowledgePoint: "正则化",
  },
];

function optionText(type: QuestionType): { id: string; text: string }[] {
  return type === "multiple_choice"
    ? [
        { id: "A", text: "本节课主题" },
        { id: "B", text: "教师提供的课堂材料" },
        { id: "C", text: "与本节课无关的广告" },
        { id: "D", text: "未经核实的网络传言" },
      ]
    : [
        { id: "A", text: "教师给定的课堂内容" },
        { id: "B", text: "与本节课无关的娱乐资讯" },
        { id: "C", text: "随机生成的词语" },
        { id: "D", text: "未经验证的猜测" },
      ];
}

function genericQuestion(request: GenerateQuizRequest, type: QuestionType, index: number): QuestionDraft {
  const shortTopic = request.topic.slice(0, 80);
  if (type === "true_false") {
    return {
      type,
      stem: `根据教师设置，本次随堂测验围绕“${shortTopic}”展开。`,
      options: [],
      answer: ["true"],
      explanation: `本次测验主题由教师设置为“${shortTopic}”。`,
      knowledgePoint: shortTopic,
    };
  }
  if (type === "fill_blank") {
    return {
      type,
      stem: `本次测验所围绕的课堂主题是“____”。`,
      options: [],
      answer: [request.topic],
      explanation: `教师设置的课堂主题为“${request.topic}”。`,
      knowledgePoint: shortTopic,
    };
  }
  return {
    type,
    stem:
      type === "multiple_choice"
        ? "根据本次演示设置，哪些内容可以作为核对演示答案的依据？"
        : `本次演示测验围绕以下哪一项课堂主题展开？（演示题 ${index + 1}）`,
    options:
      type === "single_choice"
        ? [
            { id: "A", text: request.topic },
            { id: "B", text: "与本课程无关的随机主题" },
            { id: "C", text: "无法确定的网络传闻" },
            { id: "D", text: "与课堂材料无关的内容" },
          ]
        : optionText(type),
    answer: type === "multiple_choice" ? ["A", "B"] : ["A"],
    explanation: "这是内置演示生成器创建的流程验证题；真实学科题目请配置大模型 API 后生成。",
    knowledgePoint: shortTopic,
  };
}

export function generateDemoQuestions(request: GenerateQuizRequest): Question[] {
  const source = `${request.topic} ${request.sourceContent}`.toLocaleLowerCase();
  const useOverfitting = source.includes("过拟合") || source.includes("overfitting");
  const bank = useOverfitting ? overfittingBank : [];
  const used = new Set<number>();
  const scores = allocateScores(request.questionCount);

  return Array.from({ length: request.questionCount }, (_, index) => {
    const type = request.questionTypes[index % request.questionTypes.length];
    let draft: QuestionDraft | undefined;
    if (bank.length) {
      const bankIndex = bank.findIndex(
        (item, candidateIndex) => item.type === type && !used.has(candidateIndex),
      );
      if (bankIndex >= 0) {
        draft = bank[bankIndex];
        used.add(bankIndex);
      }
    }
    draft ??= genericQuestion(request, type, index);
    return questionSchema.parse({ ...draft, id: randomUUID(), score: scores[index] });
  });
}
