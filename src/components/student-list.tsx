import Link from "next/link";
import { UserRound } from "lucide-react";
import type { AnswerStudent } from "@/lib/answer-analysis";

export function StudentList({ quizId, students, emptyText = "暂无学生" }: {
  quizId: string;
  students: AnswerStudent[];
  emptyText?: string;
}) {
  if (students.length === 0) return <span className="soft" style={{ fontSize: 12 }}>{emptyText}</span>;
  return (
    <div className="student-list">
      {students.map((student) => (
        <Link
          href={`/teacher/quizzes/${quizId}/students/${student.submissionId}`}
          className="student-chip"
          key={student.submissionId}
          title="查看该学生的逐题作答"
        >
          <UserRound size={13} />
          <span>{student.studentName}</span>
          {student.studentNo && <small>{student.studentNo}</small>}
        </Link>
      ))}
    </div>
  );
}
