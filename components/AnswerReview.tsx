"use client";
import { useState } from "react";
import { Question } from "@/lib/types";
import { ChevronDown, ChevronUp, CheckCircle, XCircle } from "lucide-react";

interface AnswerReviewProps {
  questions: Question[];
  answers: number[];
}

export default function AnswerReview({ questions, answers }: AnswerReviewProps) {
  const [filter, setFilter] = useState<"all" | "correct" | "wrong">("all");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const filteredQuestions = questions
    .map((q, i) => ({ q, i, correct: answers[i] === q.correct }))
    .filter((item) => {
      if (filter === "correct") return item.correct;
      if (filter === "wrong") return !item.correct;
      return true;
    });

  const LETTERS = ["A", "B", "C", "D"];

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {(["all", "correct", "wrong"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200"
            style={{
              backgroundColor: filter === f ? "#3b82f6" : "#1e293b",
              color: filter === f ? "#fff" : "#94a3b8",
              border: filter === f ? "none" : "1px solid #334155",
            }}
          >
            {f === "all" ? `Tất cả (${questions.length})` : f === "correct" ? `Đúng (${questions.filter((q, i) => answers[i] === q.correct).length})` : `Sai (${questions.filter((q, i) => answers[i] !== q.correct).length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredQuestions.map(({ q, i, correct }) => (
          <div
            key={q.id}
            className="rounded-xl overflow-hidden transition-all duration-200"
            style={{ backgroundColor: "#111827", border: "1px solid #334155" }}
          >
            <button
              className="w-full px-5 py-4 flex items-center gap-4 text-left"
              onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                style={{
                  backgroundColor: correct ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                  color: correct ? "#10b981" : "#ef4444",
                  fontFamily: "var(--font-jetbrains)",
                }}
              >
                {i + 1}
              </div>
              <p className="flex-1 text-sm line-clamp-2" style={{ color: "#f1f5f9" }}>
                {q.question}
              </p>
              <div className="flex items-center gap-2 flex-shrink-0">
                {correct ? (
                  <CheckCircle size={16} style={{ color: "#10b981" }} />
                ) : (
                  <XCircle size={16} style={{ color: "#ef4444" }} />
                )}
                {expandedIndex === i ? (
                  <ChevronUp size={16} style={{ color: "#64748b" }} />
                ) : (
                  <ChevronDown size={16} style={{ color: "#64748b" }} />
                )}
              </div>
            </button>

            {expandedIndex === i && (
              <div className="px-5 pb-5 pt-0 space-y-3 animate-fade-slide-up">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  {q.answers.map((ans, idx) => {
                    const isCorrect = idx === q.correct;
                    const isSelected = answers[i] === idx;
                    const isUserChoice = answers[i] === idx && !isCorrect;
                    return (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-lg text-xs flex items-center gap-2"
                        style={{
                          backgroundColor: isCorrect ? "rgba(16,185,129,0.1)" : isUserChoice ? "rgba(239,68,68,0.1)" : "#1e293b",
                          border: `1px solid ${isCorrect ? "#10b981" : isUserChoice ? "#ef4444" : "#334155"}`,
                          color: isCorrect ? "#10b981" : isUserChoice ? "#ef4444" : "#64748b",
                        }}
                      >
                        <span className="font-bold">{LETTERS[idx]}.</span>
                        <span>{ans}</span>
                        {isCorrect && <CheckCircle size={12} className="ml-auto" />}
                        {isUserChoice && <XCircle size={12} className="ml-auto" />}
                      </div>
                    );
                  })}
                </div>
                {q.explanation && (
                  <div className="p-3 rounded-lg text-xs leading-relaxed" style={{ backgroundColor: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", color: "#94a3b8" }}>
                    <span className="font-semibold" style={{ color: "#06b6d4" }}>Giải thích: </span>
                    {q.explanation}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
