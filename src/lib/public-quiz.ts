import type { PublicQuiz, Quiz } from "./domain";

export function toPublicQuiz(quiz: Quiz): PublicQuiz {
  return {
    ...quiz,
    questions: quiz.questions.map(({ answer: _answer, explanation: _explanation, ...question }) => question),
  };
}
