import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Quiz, Submission } from "./domain";
import { quizSchema, submissionSchema } from "./domain";

const DATA_DIRECTORY = process.env.ZHICE_DATA_DIR || path.join(process.cwd(), "data");
const DATABASE_PATH = path.join(DATA_DIRECTORY, "database.json");

type Database = {
  version: 1;
  quizzes: Quiz[];
  submissions: Submission[];
};

const EMPTY_DATABASE: Database = { version: 1, quizzes: [], submissions: [] };
let writeQueue: Promise<unknown> = Promise.resolve();

async function readDatabase(): Promise<Database> {
  try {
    const raw = await readFile(DATABASE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Database;
    return {
      version: 1,
      quizzes: parsed.quizzes.map((quiz) => quizSchema.parse(quiz)),
      submissions: parsed.submissions.map((submission) => submissionSchema.parse(submission)),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(EMPTY_DATABASE);
    throw error;
  }
}

async function writeDatabase(database: Database): Promise<void> {
  await mkdir(DATA_DIRECTORY, { recursive: true });
  const temporaryPath = `${DATABASE_PATH}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(database, null, 2), "utf8");
  await rename(temporaryPath, DATABASE_PATH);
}

function mutateDatabase<T>(operation: (database: Database) => T | Promise<T>): Promise<T> {
  const result = writeQueue.then(async () => {
    const database = await readDatabase();
    const value = await operation(database);
    await writeDatabase(database);
    return value;
  });
  writeQueue = result.catch(() => undefined);
  return result;
}

export async function listQuizzes(): Promise<Quiz[]> {
  const database = await readDatabase();
  return database.quizzes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getQuiz(id: string): Promise<Quiz | null> {
  const database = await readDatabase();
  return database.quizzes.find((quiz) => quiz.id === id) ?? null;
}

export async function createQuiz(quiz: Quiz): Promise<Quiz> {
  return mutateDatabase((database) => {
    database.quizzes.push(quiz);
    return quiz;
  });
}

export async function updateQuiz(id: string, update: Partial<Quiz>): Promise<Quiz | null> {
  return mutateDatabase((database) => {
    const index = database.quizzes.findIndex((quiz) => quiz.id === id);
    if (index < 0) return null;
    const updated = quizSchema.parse({
      ...database.quizzes[index],
      ...update,
      id,
      updatedAt: new Date().toISOString(),
    });
    database.quizzes[index] = updated;
    return updated;
  });
}

export async function listSubmissions(quizId: string): Promise<Submission[]> {
  const database = await readDatabase();
  return database.submissions
    .filter((submission) => submission.quizId === quizId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function getSubmission(quizId: string, submissionId: string): Promise<Submission | null> {
  const database = await readDatabase();
  return (
    database.submissions.find(
      (submission) => submission.quizId === quizId && submission.id === submissionId,
    ) ?? null
  );
}

export async function createSubmission(
  submission: Submission,
  preventDuplicateStudentNo = true,
): Promise<Submission> {
  return mutateDatabase((database) => {
    if (
      preventDuplicateStudentNo &&
      submission.studentNo &&
      database.submissions.some(
        (item) => item.quizId === submission.quizId && item.studentNo === submission.studentNo,
      )
    ) {
      throw new Error("该学号已经提交过本次测验");
    }
    database.submissions.push(submission);
    return submission;
  });
}
