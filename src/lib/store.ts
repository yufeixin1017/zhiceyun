import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Quiz, Submission } from "./domain";
import { quizSchema, submissionSchema } from "./domain";
import { getDb } from "./db";
import { answers, questions, quizzes, submissions } from "./db/schema";
import { isAnswerCorrect } from "./scoring";
import { ensureLocalTeacher, LOCAL_TEACHER_ID } from "./auth-accounts";

type QuizRow = typeof quizzes.$inferSelect;
type QuestionRow = typeof questions.$inferSelect;
type SubmissionRow = typeof submissions.$inferSelect;

function mapQuiz(row: QuizRow, questionRows: QuestionRow[]): Quiz {
  return quizSchema.parse({
    id: row.id,
    title: row.title,
    courseName: row.courseName,
    topic: row.topic,
    sourceContent: row.sourceContent,
    difficulty: row.difficulty,
    durationMinutes: row.durationMinutes,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString(),
    questions: questionRows.map((question) => ({
      id: question.id,
      type: question.type,
      stem: question.stem,
      options: question.options ?? [],
      answer: question.answer,
      explanation: question.explanation,
      knowledgePoint: question.knowledgePoint,
      score: question.score,
    })),
  });
}

function quizInsertValues(quiz: Quiz, teacherId: string): typeof quizzes.$inferInsert {
  return {
    id: quiz.id,
    teacherId,
    title: quiz.title,
    courseName: quiz.courseName,
    topic: quiz.topic,
    sourceContent: quiz.sourceContent,
    difficulty: quiz.difficulty,
    durationMinutes: quiz.durationMinutes,
    status: quiz.status,
    createdAt: new Date(quiz.createdAt),
    updatedAt: new Date(quiz.updatedAt),
    publishedAt: quiz.publishedAt ? new Date(quiz.publishedAt) : null,
  };
}

function questionInsertValues(quizId: string, quizQuestions: Quiz["questions"]): Array<typeof questions.$inferInsert> {
  return quizQuestions.map((question, index) => ({
    id: question.id,
    quizId,
    sortOrder: index,
    type: question.type,
    stem: question.stem,
    options: question.options,
    answer: question.answer,
    explanation: question.explanation,
    knowledgePoint: question.knowledgePoint,
    score: question.score,
  }));
}

async function getQuestions(quizIds: string[]): Promise<QuestionRow[]> {
  if (quizIds.length === 0) return [];
  return getDb().select().from(questions)
    .where(inArray(questions.quizId, quizIds))
    .orderBy(asc(questions.sortOrder));
}

export async function listQuizzes(teacherId = LOCAL_TEACHER_ID): Promise<Quiz[]> {
  const quizRows = await getDb().select().from(quizzes)
    .where(eq(quizzes.teacherId, teacherId))
    .orderBy(desc(quizzes.updatedAt));
  const questionRows = await getQuestions(quizRows.map((quiz) => quiz.id));
  return quizRows.map((quiz) => mapQuiz(
    quiz,
    questionRows.filter((question) => question.quizId === quiz.id),
  ));
}

export async function getQuiz(id: string): Promise<Quiz | null> {
  const [quiz] = await getDb().select().from(quizzes).where(eq(quizzes.id, id)).limit(1);
  if (!quiz) return null;
  const questionRows = await getQuestions([id]);
  return mapQuiz(quiz, questionRows);
}

export async function getTeacherQuiz(id: string, teacherId: string): Promise<Quiz | null> {
  const [quiz] = await getDb().select().from(quizzes)
    .where(and(eq(quizzes.id, id), eq(quizzes.teacherId, teacherId)))
    .limit(1);
  if (!quiz) return null;
  const questionRows = await getQuestions([id]);
  return mapQuiz(quiz, questionRows);
}

export async function createQuiz(quiz: Quiz, teacherId = LOCAL_TEACHER_ID): Promise<Quiz> {
  if (teacherId === LOCAL_TEACHER_ID) await ensureLocalTeacher();
  await getDb().transaction(async (transaction) => {
    await transaction.insert(quizzes).values(quizInsertValues(quiz, teacherId));
    await transaction.insert(questions).values(questionInsertValues(quiz.id, quiz.questions));
  });
  return quiz;
}

export async function updateQuiz(id: string, update: Partial<Quiz>, teacherId = LOCAL_TEACHER_ID): Promise<Quiz | null> {
  if (teacherId === LOCAL_TEACHER_ID) await ensureLocalTeacher();
  return getDb().transaction(async (transaction) => {
    const [existing] = await transaction.select().from(quizzes)
      .where(and(eq(quizzes.id, id), eq(quizzes.teacherId, teacherId)))
      .limit(1);
    if (!existing) return null;
    const existingQuestions = await transaction.select().from(questions)
      .where(eq(questions.quizId, id))
      .orderBy(asc(questions.sortOrder));
    const current = mapQuiz(existing, existingQuestions);
    const updated = quizSchema.parse({
      ...current,
      ...update,
      id,
      updatedAt: new Date().toISOString(),
    });

    await transaction.update(quizzes).set({
      title: updated.title,
      courseName: updated.courseName,
      topic: updated.topic,
      sourceContent: updated.sourceContent,
      difficulty: updated.difficulty,
      durationMinutes: updated.durationMinutes,
      status: updated.status,
      updatedAt: new Date(updated.updatedAt),
      publishedAt: updated.publishedAt ? new Date(updated.publishedAt) : null,
    }).where(and(eq(quizzes.id, id), eq(quizzes.teacherId, teacherId)));

    if (update.questions) {
      await transaction.delete(questions).where(eq(questions.quizId, id));
      await transaction.insert(questions).values(questionInsertValues(id, updated.questions));
    }
    return updated;
  });
}

async function attachAnswers(rows: SubmissionRow[]): Promise<Submission[]> {
  if (rows.length === 0) return [];
  const answerRows = await getDb().select().from(answers)
    .where(inArray(answers.submissionId, rows.map((submission) => submission.id)));
  return rows.map((submission) => {
    const answerMap = Object.fromEntries(
      answerRows
        .filter((answer) => answer.submissionId === submission.id)
        .map((answer) => [answer.questionId, answer.answer]),
    );
    return submissionSchema.parse({
      id: submission.id,
      quizId: submission.quizId,
      studentName: submission.studentName,
      studentNo: submission.studentNo ?? undefined,
      answers: answerMap,
      score: submission.score,
      correctCount: submission.correctCount,
      totalScore: submission.totalScore,
      submittedAt: submission.submittedAt.toISOString(),
    });
  });
}

export async function listSubmissions(quizId: string): Promise<Submission[]> {
  const rows = await getDb().select().from(submissions)
    .where(eq(submissions.quizId, quizId))
    .orderBy(desc(submissions.submittedAt));
  return attachAnswers(rows);
}

export async function getSubmission(quizId: string, submissionId: string): Promise<Submission | null> {
  const rows = await getDb().select().from(submissions)
    .where(and(eq(submissions.quizId, quizId), eq(submissions.id, submissionId)))
    .limit(1);
  if (rows.length === 0) return null;
  const [submission] = await attachAnswers(rows);
  return submission;
}

export async function createSubmission(
  submission: Submission,
  preventDuplicateStudentNo = true,
): Promise<Submission> {
  const quiz = await getQuiz(submission.quizId);
  if (!quiz) throw new Error("测验不存在");

  try {
    await getDb().transaction(async (transaction) => {
      if (preventDuplicateStudentNo && submission.studentNo) {
        const [duplicate] = await transaction.select({ id: submissions.id }).from(submissions)
          .where(and(
            eq(submissions.quizId, submission.quizId),
            eq(submissions.studentNo, submission.studentNo),
          ))
          .limit(1);
        if (duplicate) throw new Error("该学号已经提交过本次测验");
      }

      await transaction.insert(submissions).values({
        id: submission.id,
        quizId: submission.quizId,
        studentName: submission.studentName,
        studentNo: submission.studentNo ?? null,
        score: submission.score,
        correctCount: submission.correctCount,
        totalScore: submission.totalScore,
        submittedAt: new Date(submission.submittedAt),
      });

      await transaction.insert(answers).values(quiz.questions.map((question) => {
        const answer = submission.answers[question.id] ?? [];
        const isCorrect = isAnswerCorrect(question, answer);
        return {
          submissionId: submission.id,
          questionId: question.id,
          answer,
          earnedScore: isCorrect ? question.score : 0,
          isCorrect,
        };
      }));
    });
  } catch (error) {
    if (
      error instanceof Error
      && "code" in error
      && (error as Error & { code?: string }).code === "ER_DUP_ENTRY"
    ) {
      throw new Error("该学号已经提交过本次测验");
    }
    throw error;
  }
  return submission;
}
