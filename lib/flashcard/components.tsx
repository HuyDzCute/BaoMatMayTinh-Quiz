/**
 * Flashcard System - UI Components
 * 
 * Feature 12: Flashcard Integration
 * 
 * Presentation Layer: React components for quiz interface
 * Built with accessibility and performance in mind
 */

"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { QuizQuestion, QuizResult, Difficulty } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

const KEYBOARD_KEYS = ["A", "B", "C", "D"] as const;

function getOptionKey(index: number): string {
  return KEYBOARD_KEYS[index] ?? String(index + 1);
}

function getOptionColor(
  index: number,
  selectedIndex: number | null,
  correctIndex: number,
  isRevealed: boolean
): { bg: string; border: string; text: string } {
  const isSelected = selectedIndex === index;
  const isCorrect = index === correctIndex;

  if (!isRevealed) {
    // Answering state
    return {
      bg: isSelected ? "rgba(59, 130, 246, 0.15)" : "rgba(15, 23, 42, 0.5)",
      border: isSelected ? "rgba(59, 130, 246, 0.6)" : "rgba(148, 163, 184, 0.25)",
      text: isSelected ? "#60a5fa" : "#e2e8f0",
    };
  }

  // Result shown state
  if (isCorrect) {
    return {
      bg: "rgba(34, 197, 94, 0.15)",
      border: "rgba(34, 197, 94, 0.6)",
      text: "#4ade80",
    };
  }

  if (isSelected && !isCorrect) {
    return {
      bg: "rgba(239, 68, 68, 0.15)",
      border: "rgba(239, 68, 68, 0.6)",
      text: "#f87171",
    };
  }

  return {
    bg: "rgba(15, 23, 42, 0.3)",
    border: "rgba(148, 163, 184, 0.15)",
    text: "#94a3b8",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTION BUTTON
// ─────────────────────────────────────────────────────────────────────────────

export interface OptionButtonProps {
  index: number;
  text: string;
  isSelected: boolean;
  isCorrect: boolean;
  isRevealed: boolean;
  disabled: boolean;
  onClick: () => void;
}

export const OptionButton = memo(function OptionButton({
  index,
  text,
  isSelected,
  isCorrect,
  isRevealed,
  disabled,
  onClick,
}: OptionButtonProps) {
  const colors = getOptionColor(
    index,
    isSelected ? index : null,
    isCorrect ? index : -1,
    isRevealed
  );

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Option ${getOptionKey(index)}: ${text}`}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "14px 16px",
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        color: colors.text,
        cursor: disabled ? "default" : "pointer",
        fontSize: 14,
        fontFamily: "var(--font-inter, sans-serif)",
        fontWeight: 500,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        transition: "all 0.15s ease",
        opacity: disabled && !isSelected && !isCorrect ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = "translateX(4px)";
          e.currentTarget.style.borderColor = isRevealed && isCorrect
            ? "rgba(34, 197, 94, 0.8)"
            : "rgba(59, 130, 246, 0.6)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateX(0)";
        e.currentTarget.style.borderColor = colors.border;
      }}
    >
      <span
        style={{
          color: colors.text,
          fontWeight: 700,
          minWidth: 22,
          flexShrink: 0,
        }}
      >
        {getOptionKey(index)}.
      </span>
      <span style={{ flex: 1 }}>{text}</span>
      {isRevealed && isCorrect && (
        <span style={{ color: "#4ade80", fontSize: 18, marginLeft: 8 }}>✓</span>
      )}
      {isRevealed && isSelected && !isCorrect && (
        <span style={{ color: "#f87171", fontSize: 18, marginLeft: 8 }}>✗</span>
      )}
    </button>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ CARD
// ─────────────────────────────────────────────────────────────────────────────

export interface QuizCardProps {
  question: QuizQuestion;
  selectedIndex: number | null;
  result: QuizResult | null;
  onAnswer: (index: number) => void;
  showFeedback?: boolean;
}

export const QuizCard = memo(function QuizCard({
  question,
  selectedIndex,
  result,
  onAnswer,
  showFeedback = true,
}: QuizCardProps) {
  const isRevealed = result !== null;
  const isCorrect = selectedIndex === question.correctIndex;

  const getResultBanner = () => {
    if (!result) return null;

    const isAnswerCorrect = selectedIndex === question.correctIndex;

    return (
      <div
        style={{
          marginBottom: 16,
          padding: "12px 16px",
          borderRadius: 10,
          background: isAnswerCorrect
            ? "rgba(34, 197, 94, 0.12)"
            : "rgba(239, 68, 68, 0.12)",
          border: `1px solid ${
            isAnswerCorrect
              ? "rgba(34, 197, 94, 0.3)"
              : "rgba(239, 68, 68, 0.3)"
          }`,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 24 }}>
          {isAnswerCorrect ? "🎉" : "❌"}
        </span>
        <div>
          <div
            style={{
              color: isAnswerCorrect ? "#4ade80" : "#f87171",
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "var(--font-inter, sans-serif)",
            }}
          >
            {isAnswerCorrect ? "Correct!" : "Incorrect"}
          </div>
          <div
            style={{
              color: "#94a3b8",
              fontSize: 12,
              fontFamily: "var(--font-inter, sans-serif)",
              marginTop: 2,
            }}
          >
            {isAnswerCorrect
              ? `+1 point`
              : `The correct answer is: ${question.options[question.correctIndex]}`}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
        borderRadius: 16,
        border: `1px solid ${
          result
            ? isCorrect
              ? "rgba(34, 197, 94, 0.5)"
              : "rgba(239, 68, 68, 0.5)"
            : "rgba(59, 130, 246, 0.35)"
        }`,
        padding: 24,
        boxShadow: result
          ? isCorrect
            ? "0 30px 80px rgba(34, 197, 94, 0.15)"
            : "0 30px 80px rgba(239, 68, 68, 0.15)"
          : "0 30px 80px rgba(0, 0, 0, 0.7)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: "#60a5fa",
            fontWeight: 700,
            fontFamily: "var(--font-inter, sans-serif)",
          }}
        >
          ✦ Vocabulary Practice
        </div>
        {question.difficulty && (
          <DifficultyBadge difficulty={question.difficulty} />
        )}
      </div>

      {/* Word */}
      <h2
        style={{
          fontSize: 24,
          color: "#f1f5f9",
          margin: "0 0 8px 0",
          fontFamily: "var(--font-orbitron, monospace)",
          fontWeight: 700,
        }}
      >
        {question.card.front}
      </h2>

      {/* Pronunciation */}
      {question.card.pronunciation && (
        <div
          style={{
            color: "#94a3b8",
            fontSize: 14,
            marginBottom: 12,
            fontStyle: "italic",
            fontFamily: "var(--font-inter, sans-serif)",
          }}
        >
          {question.card.pronunciation}
        </div>
      )}

      {/* Instruction */}
      <div
        style={{
          color: "#cbd5e1",
          fontSize: 14,
          marginBottom: 16,
          fontFamily: "var(--font-inter, sans-serif)",
        }}
      >
        {!result
          ? "Select the correct Vietnamese meaning:"
          : isCorrect
            ? "Well done!"
            : "Keep practicing!"}
      </div>

      {/* Result Banner */}
      {showFeedback && getResultBanner()}

      {/* Options */}
      <div style={{ display: "grid", gap: 10 }}>
        {question.options.map((option, index) => (
          <OptionButton
            key={index}
            index={index}
            text={option}
            isSelected={selectedIndex === index}
            isCorrect={index === question.correctIndex}
            isRevealed={isRevealed}
            disabled={result !== null}
            onClick={() => !result && onAnswer(index)}
          />
        ))}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// DIFFICULTY BADGE
// ─────────────────────────────────────────────────────────────────────────────

export interface DifficultyBadgeProps {
  difficulty: Difficulty;
  size?: "small" | "medium";
}

export const DifficultyBadge = memo(function DifficultyBadge({
  difficulty,
  size = "small",
}: DifficultyBadgeProps) {
  const colors: Record<Difficulty, { bg: string; text: string }> = {
    easy: { bg: "rgba(34, 197, 94, 0.15)", text: "#22c55e" },
    medium: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b" },
    hard: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444" },
  };

  const color = colors[difficulty];
  const fontSize = size === "small" ? 10 : 12;
  const padding = size === "small" ? "4px 8px" : "6px 12px";

  return (
    <span
      style={{
        background: color.bg,
        color: color.text,
        fontSize,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        padding,
        borderRadius: 6,
        fontFamily: "var(--font-inter, sans-serif)",
      }}
    >
      {difficulty}
    </span>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

export interface QuizProgressProps {
  current: number;
  total: number;
  score: number;
}

export const QuizProgress = memo(function QuizProgress({
  current,
  total,
  score,
}: QuizProgressProps) {
  const progress = total > 0 ? ((current + 1) / total) * 100 : 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
        gap: 16,
      }}
    >
      {/* Progress bar */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span
            style={{
              color: "#94a3b8",
              fontSize: 12,
              fontFamily: "var(--font-inter, sans-serif)",
            }}
          >
            Question {current + 1} of {total}
          </span>
          <span
            style={{
              color: "#60a5fa",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "var(--font-inter, sans-serif)",
            }}
          >
            Score: {score}
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: "rgba(30, 41, 59, 0.8)",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
              borderRadius: 3,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ RESULTS
// ─────────────────────────────────────────────────────────────────────────────

export interface QuizResultsProps {
  result: QuizResult;
  onRetry: () => void;
  onClose: () => void;
}

export const QuizResults = memo(function QuizResults({
  result,
  onRetry,
  onClose,
}: QuizResultsProps) {
  const accuracyColor =
    result.accuracy >= 80
      ? "#22c55e"
      : result.accuracy >= 50
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
        borderRadius: 16,
        border: "1px solid rgba(59, 130, 246, 0.35)",
        padding: 28,
        textAlign: "center",
        boxShadow: "0 30px 80px rgba(0, 0, 0, 0.7)",
      }}
    >
      {/* Trophy/Emoji */}
      <div style={{ fontSize: 64, marginBottom: 16 }}>
        {result.accuracy >= 80
          ? "🏆"
          : result.accuracy >= 50
            ? "👍"
            : "💪"}
      </div>

      {/* Title */}
      <h2
        style={{
          color: "#f1f5f9",
          fontSize: 24,
          fontWeight: 700,
          margin: "0 0 8px 0",
          fontFamily: "var(--font-orbitron, monospace)",
        }}
      >
        Quiz Complete!
      </h2>

      {/* Accuracy */}
      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: accuracyColor,
          marginBottom: 8,
          fontFamily: "var(--font-orbitron, monospace)",
        }}
      >
        {result.accuracy}%
      </div>
      <div
        style={{
          color: "#94a3b8",
          fontSize: 14,
          marginBottom: 24,
          fontFamily: "var(--font-inter, sans-serif)",
        }}
      >
        {result.correctAnswers} out of {result.totalQuestions} correct
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <StatBox label="Score" value={result.score.toString()} />
        <StatBox
          label="Time"
          value={formatTime(result.timeSpent)}
        />
        <StatBox
          label="Correct"
          value={result.correctAnswers.toString()}
        />
        <StatBox
          label="Incorrect"
          value={(result.totalQuestions - result.correctAnswers).toString()}
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="button"
          onClick={onRetry}
          style={{
            flex: 1,
            padding: "14px 20px",
            borderRadius: 12,
            background: "#3b82f6",
            color: "#ffffff",
            border: "none",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "var(--font-inter, sans-serif)",
            boxShadow: "0 0 20px rgba(59, 130, 246, 0.4)",
          }}
        >
          Try Again
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            padding: "14px 20px",
            borderRadius: 12,
            background: "rgba(51, 65, 85, 0.5)",
            color: "#94a3b8",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-inter, sans-serif)",
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

interface StatBoxProps {
  label: string;
  value: string;
}

const StatBox = memo(function StatBox({ label, value }: StatBoxProps) {
  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.6)",
        borderRadius: 10,
        padding: "12px 16px",
        border: "1px solid rgba(148, 163, 184, 0.15)",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 4,
          fontFamily: "var(--font-inter, sans-serif)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "#f1f5f9",
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "var(--font-orbitron, monospace)",
        }}
      >
        {value}
      </div>
    </div>
  );
});

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ MODAL WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

export interface QuizModalWrapperProps {
  isOpen: boolean;
  question: QuizQuestion | null;
  currentIndex: number;
  totalQuestions: number;
  score: number;
  selectedIndex: number | null;
  result: QuizResult | null;
  onAnswer: (index: number) => void;
  onNext: () => void;
  onRetry: () => void;
  onClose: () => void;
}

export const QuizModalWrapper = memo(function QuizModalWrapper({
  isOpen,
  question,
  currentIndex,
  totalQuestions,
  score,
  selectedIndex,
  result,
  onAnswer,
  onNext,
  onRetry,
  onClose,
}: QuizModalWrapperProps) {
  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || !question || result) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, number> = {
        Digit1: 0,
        Digit2: 1,
        Digit3: 2,
        Digit4: 3,
        KeyA: 0,
        KeyB: 1,
        KeyC: 2,
        KeyD: 3,
      };

      const index = keyMap[e.code];
      if (index !== undefined && index < question.options.length) {
        onAnswer(index);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, question, result, onAnswer]);

  if (!isOpen || !question) return null;

  // Show results if quiz is complete
  if (currentIndex >= totalQuestions) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(2, 6, 23, 0.9)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          zIndex: 30,
        }}
      >
        <QuizResults
          result={{
            sessionId: "session",
            totalQuestions,
            correctAnswers: score,
            accuracy: Math.round((score / totalQuestions) * 100),
            score,
            timeSpent: 0,
            answers: [],
            completedAt: Date.now(),
          }}
          onRetry={onRetry}
          onClose={onClose}
        />
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vocabulary Quiz"
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(2, 6, 23, 0.9)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 30,
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div style={{ width: "100%", maxWidth: 560 }}>
        <QuizProgress
          current={currentIndex}
          total={totalQuestions}
          score={score}
        />
        <QuizCard
          question={question}
          selectedIndex={selectedIndex}
          result={result}
          onAnswer={onAnswer}
        />
        {result && (
          <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
            {selectedIndex !== question.correctIndex && (
              <button
                type="button"
                onClick={onRetry}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "#3b82f6",
                  color: "#ffffff",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-inter, sans-serif)",
                }}
              >
                Try Again
              </button>
            )}
            <button
              type="button"
              onClick={onNext}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 10,
                background: "rgba(51, 65, 85, 0.5)",
                color: "#94a3b8",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-inter, sans-serif)",
              }}
            >
              {currentIndex < totalQuestions - 1 ? "Continue" : "See Results"}
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
});
