import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
const marker = Date.now().toString().slice(-8);
const credentials = {
  phone: process.env.TEACHER_TEST_PHONE || "13800000000",
  password: process.env.TEACHER_TEST_PASSWORD || "Classroom2026",
};

let cookie = "";

async function request(path, options = {}) {
  const { auth = true, ...fetchOptions } = options;
  const response = await fetch(`${baseUrl}${path}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(auth && cookie ? { Cookie: cookie } : {}),
      ...fetchOptions.headers,
    },
  });
  const setCookie = response.headers.get("set-cookie");
  if (auth && setCookie) cookie = setCookie.split(";")[0];
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("json") ? await response.json() : await response.text();
  return { response, body };
}

async function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.resolve(".env.local");
  try {
    const content = await readFile(envPath, "utf8");
    const line = content.split(/\r?\n/).find((item) => item.trim().startsWith("DATABASE_URL="));
    if (line) return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  } catch {
    // Fall through to the default below.
  }
  return "mysql://root@127.0.0.1:3306/zhiceyun";
}

// 直接写入固定测试数据，避免冒烟测试依赖真实大模型与网络调用。
async function seedDraftQuiz(teacherId) {
  const connection = await mysql.createConnection(await resolveDatabaseUrl());
  try {
    const quizId = randomUUID();
    const now = new Date();
    const questions = Array.from({ length: 6 }, (_, index) => ({
      id: randomUUID(),
      quizId,
      sortOrder: index,
      type: "single_choice",
      stem: `冒烟测试第 ${index + 1} 题：以下哪个选项是本题的正确答案？`,
      options: [
        { id: "A", text: "正确选项" },
        { id: "B", text: "错误选项一" },
        { id: "C", text: "错误选项二" },
        { id: "D", text: "错误选项三" },
      ],
      answer: ["A"],
      explanation: "固定测试数据，用于验证评分与统计链路。",
      knowledgePoint: "冒烟测试知识点",
      score: index < 4 ? 17 : 16,
    }));
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO quizzes
        (id, teacher_id, title, course_name, topic, source_content, difficulty, duration_minutes, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
      [
        quizId,
        teacherId,
        `冒烟测试测验 ${marker}`,
        "冒烟测试课程",
        "冒烟测试主题",
        "这是用于验证完整业务流程的固定测试内容，不包含真实学生信息。",
        "medium",
        10,
        now,
        now,
      ],
    );
    for (const question of questions) {
      await connection.query(
        `INSERT INTO questions
          (id, quiz_id, sort_order, type, stem, options, answer, explanation, knowledge_point, score)
         VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, ?, ?)`,
        [
          question.id,
          quizId,
          question.sortOrder,
          question.type,
          question.stem,
          JSON.stringify(question.options),
          JSON.stringify(question.answer),
          question.explanation,
          question.knowledgePoint,
          question.score,
        ],
      );
    }
    await connection.commit();
    return quizId;
  } finally {
    await connection.end();
  }
}

const unauthorized = await request("/api/quizzes/generate", {
  method: "POST",
  body: JSON.stringify({}),
});
assert.equal(unauthorized.response.status, 401, "未登录时教师 API 必须返回 401");
const teacherPage = await request("/teacher", { redirect: "manual" });
assert.ok([302, 307].includes(teacherPage.response.status), "未登录教师页面必须重定向");

let session = await request("/api/auth/session");
if (session.response.status === 401) {
  if (process.env.SMOKE_ALLOW_SETUP === "1") {
    const setup = await request("/api/auth/setup", {
      method: "POST",
      body: JSON.stringify({ name: "冒烟测试教师", ...credentials }),
    });
    if (![201, 409].includes(setup.response.status)) {
      throw new Error(`教师初始化失败：${JSON.stringify(setup.body)}`);
    }
  }
  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  assert.equal(login.response.status, 200, `教师登录失败：${JSON.stringify(login.body)}`);
}
session = await request("/api/auth/session");
assert.equal(session.response.status, 200);
assert.equal(session.body.teacher.phone, credentials.phone);

const quizId = await seedDraftQuiz(session.body.teacher.id);
const quizResponse = await request(`/api/quizzes/${quizId}`);
assert.equal(quizResponse.response.status, 200, JSON.stringify(quizResponse.body));
const quiz = quizResponse.body.quiz;
assert.equal(quiz.questions.length, 6);
assert.equal(quiz.questions.reduce((sum, question) => sum + question.score, 0), 100);

const publicPage = await request(`/quiz/${quiz.id}`, { auth: false });
assert.equal(publicPage.response.status, 200);
assert.equal(publicPage.body.includes(quiz.questions[0].explanation), false, "学生作答页泄露了答案解析");

const publish = await request(`/api/quizzes/${quiz.id}/publish`, { method: "POST" });
assert.equal(publish.response.status, 200);
assert.equal(publish.body.quiz.status, "published");

const correctAnswers = Object.fromEntries(quiz.questions.map((question) => [question.id, question.answer]));
const studentNo = `SMOKE-${marker}`;
const perfect = await request(`/api/public/quizzes/${quiz.id}/submissions`, {
  method: "POST",
  auth: false,
  body: JSON.stringify({ studentName: "满分演示", studentNo, answers: correctAnswers }),
});
assert.equal(perfect.response.status, 201, JSON.stringify(perfect.body));
assert.equal(perfect.body.submission.score, 100);

const duplicate = await request(`/api/public/quizzes/${quiz.id}/submissions`, {
  method: "POST",
  auth: false,
  body: JSON.stringify({ studentName: "重复提交", studentNo, answers: correctAnswers }),
});
assert.equal(duplicate.response.status, 409);

const wrongAnswers = Object.fromEntries(quiz.questions.map((question) => {
  const wrong = question.options.find((option) => !question.answer.includes(option.id));
  return [question.id, [wrong.id]];
}));
const zero = await request(`/api/public/quizzes/${quiz.id}/submissions`, {
  method: "POST",
  auth: false,
  body: JSON.stringify({ studentName: "待巩固演示", studentNo: `${studentNo}-2`, answers: wrongAnswers }),
});
assert.equal(zero.response.status, 201, JSON.stringify(zero.body));
assert.equal(zero.body.submission.score, 0);

const resultPage = await request(`/quiz/${quiz.id}/result/${perfect.body.submission.id}`, { auth: false });
assert.equal(resultPage.response.status, 200);
assert.equal(resultPage.body.includes("100"), true);
assert.equal(resultPage.body.includes("本次作答已完成，你可以关闭此页面"), true);
const dashboard = await request(`/teacher/quizzes/${quiz.id}`);
assert.equal(dashboard.response.status, 200);
assert.equal(dashboard.body.includes("满分演示"), true);
assert.equal(dashboard.body.includes("待巩固演示"), true);
const questionPage = await request(`/teacher/quizzes/${quiz.id}/questions/${quiz.questions[0].id}`);
assert.equal(questionPage.response.status, 200);
const exported = await request(`/api/quizzes/${quiz.id}/export`);
assert.equal(exported.response.status, 200);
assert.equal(exported.body.split("\r\n").length, 3);

await request("/api/auth/logout", { method: "POST" });
const loggedOut = await request("/api/auth/session");
assert.equal(loggedOut.response.status, 401);
const wrongLogin = await request("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ ...credentials, password: "WrongPassword2026" }),
});
assert.equal(wrongLogin.response.status, 401);
const correctLogin = await request("/api/auth/login", {
  method: "POST",
  body: JSON.stringify(credentials),
});
assert.equal(correctLogin.response.status, 200);

const registrationPhone = `137${marker}`;
const registered = await request("/api/auth/register", {
  method: "POST",
  body: JSON.stringify({ name: "新注册教师", phone: registrationPhone, password: credentials.password }),
});
assert.equal(registered.response.status, 201, JSON.stringify(registered.body));
assert.equal(registered.body.teacher.phone, registrationPhone);
const newTeacherDashboard = await request("/teacher");
assert.equal(newTeacherDashboard.response.status, 200);
assert.equal(newTeacherDashboard.body.includes(quiz.id), false, "新注册教师不应看到其他教师的测验");

console.log("✓ 未登录教师页面与 API 已被拦截");
console.log("✓ 教师初始化、登录、退出和错误密码校验正常");
console.log("✓ 新教师可注册并拥有独立工作台");
console.log("✓ 固定测试测验创建成功，满分 100 分");
console.log("✓ 学生不带 Cookie 仍可作答，且页面不包含答案解析");
console.log("✓ 发布、满分评分、零分评分均正确");
console.log("✓ 重复学号提交已被拦截");
console.log("✓ 成绩页、班级统计、题目分析页和 CSV 导出可访问");
console.log(`\n教师结果页：${baseUrl}/teacher/quizzes/${quiz.id}`);
console.log(`学生作答页：${baseUrl}/quiz/${quiz.id}`);