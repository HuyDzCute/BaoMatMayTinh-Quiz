"use client";
import { Question } from "@/lib/types";
import { CheckCircle, XCircle, Circle } from "lucide-react";
import { useState } from "react";

const LETTERS = ["A", "B", "C", "D"];

interface QuizQuestionProps {
  question: Question;
  index: number;
  total: number;
  selectedAnswer: number | string;
  onSelectAnswer: (index: number) => void;
  showResult?: boolean;
}

export default function QuizQuestion({
  question,
  index,
  total,
  selectedAnswer,
  onSelectAnswer,
  showResult = false,
}: QuizQuestionProps) {
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);

  if (!question) {
    return (
      <div className="animate-fade-slide-up p-6 rounded-2xl text-center" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
        <p className="text-sm font-medium">Câu hỏi không khả dụng.</p>
      </div>
    );
  }

  const handleSelect = (idx: number) => {
    if (showResult) return;
    setAnimatingIndex(idx);
    onSelectAnswer(idx);
    setTimeout(() => setAnimatingIndex(null), 200);
  };

  const selectedIdx = typeof selectedAnswer === "number" ? selectedAnswer : parseInt(selectedAnswer, 10);
  const isSelectedAt = (idx: number) => selectedIdx === idx;
  const getAnswerStyle = (idx: number) => {
    const isSelected = isSelectedAt(idx);
    const isCorrect = question.correct === idx;

    if (showResult) {
      if (isCorrect) return { bg: "rgba(16,185,129,0.15)", border: "#10b981", color: "#10b981" };
      if (isSelected && !isCorrect) return { bg: "rgba(239,68,68,0.15)", border: "#ef4444", color: "#ef4444" };
      return { bg: "#1e293b", border: "#334155", color: "#64748b" };
    }

    if (isSelected) return { bg: "rgba(59,130,246,0.2)", border: "#3b82f6", color: "#60a5fa" };
    return { bg: "#1e293b", border: "#334155", color: "#cbd5e1" };
  };

  return (
    <div className="animate-fade-slide-up">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#60a5fa", fontFamily: "var(--font-jetbrains)" }}>
          Câu {index + 1} / {total}
        </span>
        {showResult && (
          <span className="text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5" style={
            selectedIdx === question.correct
              ? { backgroundColor: "rgba(16,185,129,0.15)", color: "#10b981" }
              : { backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }
          }>
            {selectedIdx === question.correct ? <><CheckCircle size={13} /> Đúng</> : <><XCircle size={13} /> Sai</>}
          </span>
        )}
      </div>

      <div className="mb-8">
        <p className="text-base md:text-lg font-medium leading-relaxed" style={{ color: "#f1f5f9" }}>
          {question.question}
        </p>
      </div>

      <div className="space-y-3">
        {question.answers.map((answer, idx) => {
          const style = getAnswerStyle(idx);
          const isSelected = isSelectedAt(idx);
          const isCorrect = question.correct === idx;
          const isAnimating = animatingIndex === idx;

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={showResult}
              className="w-full text-left px-5 py-4 rounded-xl transition-all duration-200 flex items-start gap-4"
              style={{
                backgroundColor: style.bg,
                border: `2px solid ${style.border}`,
                color: style.color,
                transform: isAnimating ? "scale(1.02)" : "scale(1)",
                cursor: showResult ? "default" : "pointer",
              }}
            >
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5"
                style={{
                  backgroundColor: isSelected ? (showResult && isCorrect ? "rgba(16,185,129,0.2)" : showResult && !isCorrect ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.2)") : "rgba(51,65,85,0.5)",
                  color: isSelected ? (showResult && isCorrect ? "#10b981" : showResult && !isCorrect ? "#ef4444" : "#60a5fa") : "#64748b",
                  fontFamily: "var(--font-jetbrains)",
                }}
              >
                {LETTERS[idx]}
              </span>
              <span className="text-sm leading-relaxed pt-0.5">{answer}</span>
              {showResult && (
                <span className="ml-auto flex-shrink-0 mt-0.5">
                  {isCorrect ? <CheckCircle size={18} /> : isSelected ? <XCircle size={18} /> : <Circle size={18} />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showResult && question.explanation && (
        <div
          className="mt-6 p-4 rounded-xl text-sm leading-relaxed animate-fade-slide-up"
          style={{ backgroundColor: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", color: "#94a3b8" }}
        >
          <p className="font-semibold mb-1" style={{ color: "#06b6d4" }}>Giải thích:</p>
          <p>{question.explanation}</p>
        </div>
      )}
    </div>
  );
}
