import type { Question, QuestionType } from "./domain";
import { allocateScores } from "./scoring";

const TYPE_ORDER: Record<QuestionType, number> = {
  single_choice: 0,
  multiple_choice: 1,
  true_false: 2,
  fill_blank: 3,
};

function knowledgePointKey(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

/**
 * Keep knowledge-point groups in their first-appearance order, then order
 * questions inside each group by single → multiple → true/false → fill blank.
 * The input array is never mutated. Scores are reassigned after sorting.
 */
export function organizeQuestions(questions: Question[]): Question[] {
  if (questions.length === 0) return [];

  const firstAppearance = new Map<string, number>();
  questions.forEach((question, index) => {
    const key = knowledgePointKey(question.knowledgePoint);
    if (!firstAppearance.has(key)) firstAppearance.set(key, index);
  });

  const sorted = questions
    .map((question, index) => ({ question, index }))
    .sort((left, right) => {
      const leftGroup = firstAppearance.get(knowledgePointKey(left.question.knowledgePoint)) ?? 0;
      const rightGroup = firstAppearance.get(knowledgePointKey(right.question.knowledgePoint)) ?? 0;
      return leftGroup - rightGroup
        || TYPE_ORDER[left.question.type] - TYPE_ORDER[right.question.type]
        || left.index - right.index;
    });

  const scores = allocateScores(sorted.length);
  return sorted.map(({ question }, index) => ({ ...question, score: scores[index] }));
}
