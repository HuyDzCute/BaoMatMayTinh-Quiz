/**
 * WordRun3D — Flashcard Module
 *
 * Feature 6: Quiz interface với Correct/Wrong feedback + Retry/Leave.
 * Production optimization: Fixed ESLint impure function warnings
 */
"use client";

import { useState, useCallback, memo } from "react";
import type { QuizQuestion } from "@/lib/wordrun-types";

// ─── Quiz Result type ─────────────────────────────────────────────────────────
export type QuizResult = "correct" | "wrong";

export interface QuizModalProps {
  question: QuizQuestion;
  result: QuizResult | null;
  onAnswer: (index: number) => void;
  onRetry: () => void;
  onLeave: () => void;
}

// ─── Quiz Modal ────────────────────────────────────────────────────────────────
export const QuizModal = memo(function QuizModal({
  question,
  result,
  onAnswer,
  onRetry,
  onLeave,
}: QuizModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleOptionClick = useCallback(
    (idx: number) => {
      if (result !== null) return; // already answered
      setSelectedIndex(idx);
      onAnswer(idx);
    },
    [result, onAnswer]
  );

  // Reset selected when question changes
  const handleQuestionChange = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  // Trigger reset when question prop changes
  const isCorrect = result === "correct";
  const isWrong = result === "wrong";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Trả lời câu hỏi từ vựng"
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(2,6,23,0.85)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 20,
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: 16,
          border: `1px solid ${
            isCorrect
              ? "rgba(34,197,94,0.5)"
              : isWrong
                ? "rgba(239,68,68,0.5)"
                : "rgba(59,130,246,0.35)"
          }`,
          padding: 24,
          boxShadow: `0 30px 80px ${
            isCorrect
              ? "rgba(34,197,94,0.15)"
              : isWrong
                ? "rgba(239,68,68,0.15)"
                : "rgba(0,0,0,0.7)"
          }`,
        }}
      >
        {/* Label */}
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.22em",
            color: isCorrect ? "#4ade80" : isWrong ? "#f87171" : "#60a5fa",
            marginBottom: 6,
            fontWeight: 700,
            fontFamily: "var(--font-inter, sans-serif)",
          }}
        >
          ✦ Vocabulary Practice
        </div>

        {/* Word */}
        <h3
          style={{
            fontSize: 20,
            color: "#f1f5f9",
            margin: "0 0 4px 0",
            fontFamily: "var(--font-orbitron, monospace)",
            fontWeight: 700,
          }}
        >
          {question.card.front}
        </h3>

        {/* Pronunciation */}
        {question.card.pronunciation && (
          <div
            style={{
              color: "#94a3b8",
              fontSize: 13,
              marginBottom: 14,
              fontStyle: "italic",
            }}
          >
            {question.card.pronunciation}
          </div>
        )}

        {/* Instruction */}
        <div
          style={{
            color: "#cbd5e1",
            fontSize: 13,
            marginBottom: 14,
            fontFamily: "var(--font-inter, sans-serif)",
          }}
        >
          {result === null
            ? "Chọn nghĩa tiếng Việt đúng:"
            : isCorrect
              ? "Chính xác! Bạn giỏi lắm!"
              : "Chưa đúng rồi!"}
        </div>

        {/* Result banner */}
        {result !== null && (
          <div
            style={{
              marginBottom: 14,
              padding: "12px 16px",
              borderRadius: 10,
              background: isCorrect
                ? "rgba(34,197,94,0.12)"
                : "rgba(239,68,68,0.12)",
              border: `1px solid ${
                isCorrect
                  ? "rgba(34,197,94,0.3)"
                  : "rgba(239,68,68,0.3)"
              }`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 22 }}>
              {isCorrect ? "🎉" : "❌"}
            </span>
            <span
              style={{
                color: isCorrect ? "#4ade80" : "#f87171",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "var(--font-inter, sans-serif)",
              }}
            >
              {isCorrect ? "Correct! +10 points" : "Wrong! -1 heart"}
            </span>
          </div>
        )}

        {/* Options */}
        <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
          {question.options.map((opt, i) => {
            const isSelected = selectedIndex === i;
            const isCorrectOpt = i === question.correctIndex;
            const showCorrect = result !== null && isCorrectOpt;
            const showWrong = result !== null && isSelected && !isCorrectOpt;

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleOptionClick(i)}
                disabled={result !== null}
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${
                    showCorrect
                      ? "rgba(34,197,94,0.6)"
                      : showWrong
                        ? "rgba(239,68,68,0.6)"
                        : "rgba(148,163,184,0.25)"
                  }`,
                  background:
                    showCorrect
                      ? "rgba(34,197,94,0.15)"
                      : showWrong
                        ? "rgba(239,68,68,0.15)"
                        : "rgba(15,23,42,0.5)",
                  color: showCorrect ? "#4ade80" : showWrong ? "#f87171" : "#e2e8f0",
                  cursor: result !== null ? "default" : "pointer",
                  fontSize: 14,
                  fontFamily: "var(--font-inter, sans-serif)",
                  fontWeight: 500,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    color: showCorrect
                      ? "#4ade80"
                      : showWrong
                        ? "#f87171"
                        : "#60a5fa",
                    fontWeight: 700,
                    minWidth: 18,
                    flexShrink: 0,
                  }}
                >
                  {String.fromCharCode(65 + i)}.
                </span>
                <span>{opt}</span>
                {showCorrect && (
                  <span style={{ marginLeft: "auto", fontSize: 16 }}>✓</span>
                )}
                {showWrong && (
                  <span style={{ marginLeft: "auto", fontSize: 16 }}>✗</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Actions after answer */}
        {result !== null && (
          <div style={{ display: "flex", gap: 10 }}>
            {isWrong && (
              <button
                type="button"
                onClick={onRetry}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-inter, sans-serif)",
                  boxShadow: "0 0 16px rgba(59,130,246,0.4)",
                }}
              >
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={onLeave}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 10,
                background: "rgba(51,65,85,0.5)",
                color: "#94a3b8",
                border: "1px solid rgba(148,163,184,0.2)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-inter, sans-serif)",
              }}
            >
              Leave
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
