-- 智测云 MySQL 8.x 初始表结构
-- 仅创建缺失的数据库和数据表，不删除或覆盖已有数据。

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS zhiceyun
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE zhiceyun;

-- 教师账号。学生无需注册，不在此表中。
CREATE TABLE IF NOT EXISTS teachers (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_teachers_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 教师登录会话，只保存会话令牌的 SHA-256 哈希。
CREATE TABLE IF NOT EXISTS teacher_sessions (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  teacher_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_teacher_sessions_token_hash (token_hash),
  KEY idx_teacher_sessions_teacher (teacher_id),
  KEY idx_teacher_sessions_expires (expires_at),
  CONSTRAINT fk_teacher_sessions_teacher
    FOREIGN KEY (teacher_id) REFERENCES teachers (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 一份测验属于一名教师，发布后不可随意修改题目。
CREATE TABLE IF NOT EXISTS quizzes (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  teacher_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  title VARCHAR(120) NOT NULL,
  course_name VARCHAR(100) NOT NULL,
  topic VARCHAR(200) NOT NULL,
  source_content TEXT NOT NULL,
  difficulty VARCHAR(20) NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  published_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_quizzes_teacher_updated (teacher_id, updated_at),
  KEY idx_quizzes_status (status),
  CONSTRAINT fk_quizzes_teacher
    FOREIGN KEY (teacher_id) REFERENCES teachers (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- options 保存选项数组；answer 保存标准答案及可接受答案数组。
CREATE TABLE IF NOT EXISTS questions (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  quiz_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  type VARCHAR(30) NOT NULL,
  stem TEXT NOT NULL,
  options JSON NULL,
  answer JSON NOT NULL,
  explanation TEXT NOT NULL,
  knowledge_point VARCHAR(200) NOT NULL,
  score SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_questions_quiz_order (quiz_id, sort_order),
  CONSTRAINT fk_questions_quiz
    FOREIGN KEY (quiz_id) REFERENCES quizzes (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 学生提交。student_no 为 NULL 时允许多条；相同学号在同一测验中只能提交一次。
CREATE TABLE IF NOT EXISTS submissions (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  quiz_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  student_name VARCHAR(40) NOT NULL,
  student_no VARCHAR(40) NULL,
  score SMALLINT UNSIGNED NOT NULL,
  correct_count SMALLINT UNSIGNED NOT NULL,
  total_score SMALLINT UNSIGNED NOT NULL,
  submitted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_submissions_quiz_student_no (quiz_id, student_no),
  KEY idx_submissions_quiz_submitted (quiz_id, submitted_at),
  CONSTRAINT fk_submissions_quiz
    FOREIGN KEY (quiz_id) REFERENCES quizzes (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 每个学生答案对应一道题，评分结果由服务端计算。
CREATE TABLE IF NOT EXISTS answers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  submission_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  question_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  answer JSON NOT NULL,
  earned_score SMALLINT UNSIGNED NOT NULL,
  is_correct BOOLEAN NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_answers_submission_question (submission_id, question_id),
  KEY idx_answers_question (question_id),
  CONSTRAINT fk_answers_submission
    FOREIGN KEY (submission_id) REFERENCES submissions (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_answers_question
    FOREIGN KEY (question_id) REFERENCES questions (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 记录已经执行的迁移，便于服务器核对初始化版本。
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(100) NOT NULL,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (version)
VALUES ('001_initial_schema');
