"use client";

import { useEffect, useState } from "react";
import { Clock3, TriangleAlert } from "lucide-react";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function Countdown({ deadline }: { deadline: string }) {
  const target = new Date(deadline).getTime();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setRemaining(Math.max(0, target - Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  const expired = remaining !== null && remaining <= 0;
  return (
    <span className={`countdown ${expired ? "countdown-expired" : ""}`}>
      {expired ? <TriangleAlert size={14} /> : <Clock3 size={14} />}
      {remaining === null ? "限时剩余 --:--" : expired ? "已超过限时，仍可提交（将标记为超时）" : `限时剩余 ${formatRemaining(remaining)}`}
    </span>
  );
}