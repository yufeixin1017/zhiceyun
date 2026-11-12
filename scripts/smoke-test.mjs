import assert from "node:assert/strict";

const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
const marker = Date.now().toString().slice(-8);
const credentials = {
  email: process.env.TEACHER_TEST_EMAIL || "smoke-teacher@example.com",
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

const generationPayload = {
  courseName: "机器学习导论",
  topic: "过拟合与模型泛化",
  sourceContent: "本节课介绍过拟合与模型泛化。过拟合是指模型在训练集表现良好但在新数据上表现较差。正则化、数据增强、增加有效训练数据和早停可以缓解过拟合。验证集用于模型选择，测试集用于最终评估。",
  questionCount: 6,
  questionTypes: ["single_choice", "multiple_choice", "true_false", "fill_blank"],
  difficulty: "medium",
  durationMinutes: 10,
  mode: "demo",
};

const unauthorized = await request("/api/quizzes/generate", {
  method: "POST",
  body: JSON.stringify(generationPayload),
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
assert.equal(session.body.teacher.email, credentials.email);

const generation = await request("/api/quizzes/generate", {
  method: "POST",
  body: JSON.stringify(generationPayload),
});
assert.equal(generation.response.status, 201, JSON.stringify(generation.body));
const quiz = generation.body.quiz;
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
  if (question.type === "fill_blank") return [question.id, ["明确的错误答案"]];
  if (question.type === "true_false") return [question.id, [question.answer[0] === "true" ? "false" : "true"]];
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
const dashboard = await request(`/teacher/quizzes/${quiz.id}`);
assert.equal(dashboard.response.status, 200);
assert.equal(dashboard.body.includes("满分演示"), true);
assert.equal(dashboard.body.includes("待巩固演示"), true);
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

console.log("✓ 未登录教师页面与 API 已被拦截");
console.log("✓ 教师初始化、登录、退出和错误密码校验正常");
console.log("✓ 创建演示测验并完成 100 分校验");
console.log("✓ 学生不带 Cookie 仍可作答，且页面不包含答案解析");
console.log("✓ 发布、满分评分、零分评分均正确");
console.log("✓ 重复学号提交已被拦截");
console.log("✓ 成绩页、班级统计和 CSV 导出可访问");
console.log(`\n教师结果页：${baseUrl}/teacher/quizzes/${quiz.id}`);
console.log(`学生作答页：${baseUrl}/quiz/${quiz.id}`);
