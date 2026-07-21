"use client";
import { useEffect, useRef, useState } from "react";
import { QuizResult } from "@/lib/types";
import { Clock, TrendingUp } from "lucide-react";

interface ResultCardProps {
  result: QuizResult;
}

// Generate confetti once at module load (not during render)
const CONFETTI_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7"];
const CONFETTI_PARTICLES = Array.from({ length: 40 }, () => ({
  left: `${Math.random() * 100}%`,
  duration: `${2 + Math.random() * 2}s`,
  delay: `${Math.random() * 0.5}s`,
  color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
  size: `${6 + Math.random() * 8}px`,
  shape: Math.random() > 0.5 ? "50%" : "0",
}));

export default function ResultCard({ result }: ResultCardProps) {
  const [displayedScore, setDisplayedScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Score count-up animation
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = result.score / steps;
    let step = 0;

    animationRef.current = setInterval(() => {
      step++;
      const current = Math.min(result.score, Math.round(increment * step));
      setDisplayedScore(current);
      if (step >= steps) {
        clearInterval(animationRef.current!);
        setDisplayedScore(result.score);
        if (result.percentage >= 80) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 4000);
        }
      }
    }, duration / steps);

    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [result.score, result.percentage]);

  const grade = result.percentage >= 90 ? "A+" : result.percentage >= 80 ? "A" : result.percentage >= 70 ? "B" : result.percentage >= 60 ? "C" : result.percentage >= 50 ? "D" : "F";
  const gradeColor = result.percentage >= 80 ? "#10b981" : result.percentage >= 60 ? "#f59e0b" : "#ef4444";

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {CONFETTI_PARTICLES.map((p, i) => (
            <div
              key={i}
              className="absolute top-0"
              style={{
                left: p.left,
                animation: `confetti-fall ${p.duration} linear forwards`,
                animationDelay: p.delay,
                backgroundColor: p.color,
                width: p.size,
                height: p.size,
                borderRadius: p.shape,
              }}
            />
          ))}
        </div>
      )}

      <div className="text-center animate-fade-slide-up">
        <div className="relative inline-block mb-6">
          <div
            className="w-40 h-40 rounded-full flex flex-col items-center justify-center mx-auto animate-count-up"
            style={{
              background: `conic-gradient(${gradeColor}40 ${result.percentage * 3.6}deg, #1e293b 0deg)`,
              border: `3px solid ${gradeColor}40`,
            }}
          >
            <span
              className="text-5xl font-black animate-count-up"
              style={{ color: gradeColor, fontFamily: "var(--font-orbitron)" }}
            >
              {displayedScore}
            </span>
            <span className="text-sm font-bold" style={{ color: "#94a3b8", fontFamily: "var(--font-jetbrains)" }}>
              điểm
            </span>
          </div>
          <span
            className="absolute -top-2 -right-2 w-12 h-12 rounded-full flex items-center justify-center text-lg font-black border-2"
            style={{
              backgroundColor: `${gradeColor}20`,
              borderColor: gradeColor,
              color: gradeColor,
              fontFamily: "var(--font-orbitron)",
            }}
          >
            {grade}
          </span>
        </div>

        <h2 className="text-xl font-bold mb-2" style={{ color: "#f1f5f9", fontFamily: "var(--font-orbitron)" }}>
          {result.percentage >= 80 ? "Xuất sắc!" : result.percentage >= 60 ? "Khá tốt!" : result.percentage >= 50 ? "Cố gắng hơn!" : "Cần ôn lại!"}
        </h2>
        <p className="text-sm mb-8" style={{ color: "#94a3b8" }}>
          Bạn đã hoàn thành bài thi <strong style={{ color: "#f1f5f9" }}>{result.setName}</strong>
        </p>

        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-8">
          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "#111827", border: "1px solid #334155" }}>
            <CheckIcon className="mx-auto mb-1" />
            <p className="text-2xl font-black" style={{ color: "#10b981", fontFamily: "var(--font-jetbrains)" }}>{result.correctCount}</p>
            <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>Đúng</p>
          </div>
          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "#111827", border: "1px solid #334155" }}>
            <XIcon className="mx-auto mb-1" />
            <p className="text-2xl font-black" style={{ color: "#ef4444", fontFamily: "var(--font-jetbrains)" }}>{result.wrongCount}</p>
            <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>Sai</p>
          </div>
          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "#111827", border: "1px solid #334155" }}>
            <TrendingUp className="mx-auto mb-1" size={18} style={{ color: "#06b6d4" }} />
            <p className="text-2xl font-black" style={{ color: "#06b6d4", fontFamily: "var(--font-jetbrains)" }}>{result.percentage}%</p>
            <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>Chính xác</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm" style={{ color: "#64748b" }}>
          <Clock size={14} />
          <span style={{ fontFamily: "var(--font-jetbrains)" }}>Thời gian: {formatTime(result.timeSpent)}</span>
          <span className="mx-2">·</span>
          <span>{result.totalQuestions} câu hỏi</span>
        </div>
      </div>
    </>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" stroke="#10b981" strokeWidth="2" fill="rgba(16,185,129,0.15)" />
      <path d="M6 10l3 3 5-6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" stroke="#ef4444" strokeWidth="2" fill="rgba(239,68,68,0.15)" />
      <path d="M7 7l6 6M13 7l-6 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
