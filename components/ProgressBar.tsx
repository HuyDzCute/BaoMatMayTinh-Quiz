"use client";

interface ProgressBarProps {
  total: number;
  answered: number;
}

export default function ProgressBar({ total, answered }: ProgressBarProps) {
  const progress = total > 0 ? (answered / total) * 100 : 0;
  const color = progress < 50 ? "#ef4444" : progress < 80 ? "#f59e0b" : "#10b981";

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span style={{ color: "#94a3b8", fontFamily: "var(--font-jetbrains)" }}>
          {answered} / {total} đã trả lời
        </span>
        <span style={{ color: "#94a3b8", fontFamily: "var(--font-jetbrains)" }}>
          {Math.round(progress)}%
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#1e293b" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}60`,
          }}
        />
      </div>
    </div>
  );
}
