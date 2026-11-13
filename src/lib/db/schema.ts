import {
  bigint,
  boolean,
  char,
  datetime,
  index,
  json,
  mysqlTable,
  smallint,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import type { Question, QuestionType, Quiz } from "../domain";

export const teachers = mysqlTable("teachers", {
  id: char("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }).unique(),
  email: varchar("email", { length: 190 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: datetime("created_at", { mode: "date", fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime("updated_at", { mode: "date", fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
});

export const teacherSessions = mysqlTable("teacher_sessions", {
  id: char("id", { length: 36 }).primaryKey(),
  teacherId: char("teacher_id", { length: 36 }).notNull().references(() => teachers.id, {
    onDelete: "cascade", onUpdate: "cascade",
  }),
  tokenHash: char("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: datetime("expires_at", { mode: "date", fsp: 3 }).notNull(),
  createdAt: datetime("created_at", { mode: "date", fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  index("idx_teacher_sessions_teacher").on(table.teacherId),
  index("idx_teacher_sessions_expires").on(table.expiresAt),
]);

export const quizzes = mysqlTable("quizzes", {
  id: char("id", { length: 36 }).primaryKey(),
  teacherId: char("teacher_id", { length: 36 }).notNull().references(() => teachers.id, {
    onDelete: "restrict", onUpdate: "cascade",
  }),
  title: varchar("title", { length: 120 }).notNull(),
  courseName: varchar("course_name", { length: 100 }).notNull(),
  topic: varchar("topic", { length: 200 }).notNull(),
  sourceContent: text("source_content").notNull(),
  difficulty: varchar("difficulty", { length: 20 }).$type<Quiz["difficulty"]>().notNull(),
  durationMinutes: smallint("duration_minutes", { unsigned: true }).notNull(),
  status: varchar("status", { length: 20 }).$type<Quiz["status"]>().notNull().default("draft"),
  createdAt: datetime("created_at", { mode: "date", fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime("updated_at", { mode: "date", fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  publishedAt: datetime("published_at", { mode: "date", fsp: 3 }),
}, (table) => [
  index("idx_quizzes_teacher_updated").on(table.teacherId, table.updatedAt),
  index("idx_quizzes_status").on(table.status),
]);

export const questions = mysqlTable("questions", {
  id: char("id", { length: 36 }).primaryKey(),
  quizId: char("quiz_id", { length: 36 }).notNull().references(() => quizzes.id, {
    onDelete: "cascade", onUpdate: "cascade",
  }),
  sortOrder: smallint("sort_order", { unsigned: true }).notNull(),
  type: varchar("type", { length: 30 }).$type<QuestionType>().notNull(),
  stem: text("stem").notNull(),
  options: json("options").$type<Question["options"]>(),
  answer: json("answer").$type<string[]>().notNull(),
  explanation: text("explanation").notNull(),
  knowledgePoint: varchar("knowledge_point", { length: 200 }).notNull(),
  score: smallint("score", { unsigned: true }).notNull(),
}, (table) => [
  uniqueIndex("uk_questions_quiz_order").on(table.quizId, table.sortOrder),
]);

export const submissions = mysqlTable("submissions", {
  id: char("id", { length: 36 }).primaryKey(),
  quizId: char("quiz_id", { length: 36 }).notNull().references(() => quizzes.id, {
    onDelete: "cascade", onUpdate: "cascade",
  }),
  studentName: varchar("student_name", { length: 40 }).notNull(),
  studentNo: varchar("student_no", { length: 40 }),
  score: smallint("score", { unsigned: true }).notNull(),
  correctCount: smallint("correct_count", { unsigned: true }).notNull(),
  totalScore: smallint("total_score", { unsigned: true }).notNull(),
  submittedAt: datetime("submitted_at", { mode: "date", fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  isLate: boolean("is_late").notNull().default(false),
}, (table) => [
  uniqueIndex("uk_submissions_quiz_student_no").on(table.quizId, table.studentNo),
  index("idx_submissions_quiz_submitted").on(table.quizId, table.submittedAt),
]);

export const answers = mysqlTable("answers", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  submissionId: char("submission_id", { length: 36 }).notNull().references(() => submissions.id, {
    onDelete: "cascade", onUpdate: "cascade",
  }),
  questionId: char("question_id", { length: 36 }).notNull().references(() => questions.id, {
    onDelete: "cascade", onUpdate: "cascade",
  }),
  answer: json("answer").$type<string[]>().notNull(),
  earnedScore: smallint("earned_score", { unsigned: true }).notNull(),
  isCorrect: boolean("is_correct").notNull(),
}, (table) => [
  uniqueIndex("uk_answers_submission_question").on(table.submissionId, table.questionId),
  index("idx_answers_question").on(table.questionId),
]);

export const schemaMigrations = mysqlTable("schema_migrations", {
  version: varchar("version", { length: 100 }).primaryKey(),
  appliedAt: datetime("applied_at", { mode: "date", fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
});
