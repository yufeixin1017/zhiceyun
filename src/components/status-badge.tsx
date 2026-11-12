import { CircleCheck, CirclePause, FilePenLine } from "lucide-react";
import type { QuizStatus } from "@/lib/domain";

export function StatusBadge({ status }: { status: QuizStatus }) {
  if (status === "published") return <span className="badge badge-published"><CircleCheck size={13} />已发布</span>;
  if (status === "closed") return <span className="badge badge-closed"><CirclePause size={13} />已截止</span>;
  return <span className="badge badge-draft"><FilePenLine size={13} />草稿</span>;
}
