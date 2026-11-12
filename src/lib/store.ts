import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Quiz, Submission } from "./domain";
import { quizSchema, submissionSchema } from "./domain";
import { getDb } from "./db";
import { answers, questions, quizzes, submissions, teachers } from "./db/schema";
import { isAnswerCorrect } from "./scoring";

// 在教师登录功能接入前，所有本地演示数据归属于一个不可登录的系统账号。
// password_hash 是明确的禁用标记，不是任何可用密码的哈希。
const LOCAL_TEACHER_ID = "00000000-0000-0000-0000-000000000001";
const LOCAL_TEACHER_EMAIL = "local@zhiceyun.internal";

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
    generationMode: row.generationMode,
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

async function ensureLocalTeacher(): Promise<void> {
  await getDb().insert(teachers).values({
    id: LOCAL_TEACHER_ID,
    name: "本地教师",
    email: LOCAL_TEACHER_EMAIL,
    passwordHash: "DISABLED_LOCAL_ACCOUNT",
  }).onDuplicateKeyUpdate({ set: { id: LOCAL_TEACHER_ID } });
}

function quizInsertValues(quiz: Quiz): typeof quizzes.$inferInsert {
  return {
    id: quiz.id,
    teacherId: LOCAL_TEACHER_ID,
    title: quiz.title,
    courseName: quiz.courseName,
    topic: quiz.topic,
    sourceContent: quiz.sourceContent,
    difficulty: quiz.difficulty,
    durationMinutes: quiz.durationMinutes,
    status: quiz.status,
    generationMode: quiz.generationMode,
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

export async function listQuizzes(): Promise<Quiz[]> {
  const quizRows = await getDb().select().from(quizzes).orderBy(desc(quizzes.updatedAt));
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

export async function createQuiz(quiz: Quiz): Promise<Quiz> {
  await ensureLocalTeacher();
  await getDb().transaction(async (transaction) => {
    await transaction.insert(quizzes).values(quizInsertValues(quiz));
    await transaction.insert(questions).values(questionInsertValues(quiz.id, quiz.questions));
  });
  return quiz;
}

export async function updateQuiz(id: string, update: Partial<Quiz>): Promise<Quiz | null> {
  await ensureLocalTeacher();
  return getDb().transaction(async (transaction) => {
    const [existing] = await transaction.select().from(quizzes).where(eq(quizzes.id, id)).limit(1);
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
      generationMode: updated.generationMode,
      updatedAt: new Date(updated.updatedAt),
      publishedAt: updated.publishedAt ? new Date(updated.publishedAt) : null,
    }).where(eq(quizzes.id, id));

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
