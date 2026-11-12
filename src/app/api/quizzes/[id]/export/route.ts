import { getQuiz, listSubmissions } from "@/lib/store";

export const runtime = "nodejs";

function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = await getQuiz(id);
  if (!quiz) return new Response("测验不存在", { status: 404 });
  const submissions = await listSubmissions(id);
  const rows = [
    ["姓名", "学号", "得分", "满分", "答对题数", "总题数", "提交时间"],
    ...submissions.map((submission) => [submission.studentName, submission.studentNo ?? "", submission.score, submission.totalScore, submission.correctCount, quiz.questions.length, submission.submittedAt]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quiz-results.csv"; filename*=UTF-8''${encodeURIComponent(`${quiz.title}-成绩.csv`)}`,
    },
  });
}
