/**
 * Dialogue UI Components
 * 
 * Feature 11: NPC Dialogue System
 * React components for dialogue rendering
 */

"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { Choice } from "@/lib/dialogue/types";

// ─── Dialogue Bubble ─────────────────────────────────────────────────────────────

export interface DialogueBubbleProps {
  speaker?: string | null;
  text: string | null;
  onAdvance?: () => void;
  showContinueIndicator?: boolean;
}

export const DialogueBubble = memo(function DialogueBubble({
  speaker,
  text,
  onAdvance,
  showContinueIndicator = true,
}: DialogueBubbleProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(true);
  const [displayedText, setDisplayedText] = useState("");
  const [canAdvance, setCanAdvance] = useState(false);

  // Typing animation
  useEffect(() => {
    if (!text) {
      setDisplayedText("");
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    setDisplayedText("");
    setCanAdvance(false);

    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        setCanAdvance(true);
        clearInterval(interval);
      }
    }, 20); // ~50 chars per second

    return () => clearInterval(interval);
  }, [text]);

  // Click to skip typing
  const handleClick = useCallback(() => {
    if (isTyping && text) {
      setDisplayedText(text);
      setIsTyping(false);
      setCanAdvance(true);
    } else if (canAdvance && onAdvance) {
      onAdvance();
    }
  }, [isTyping, text, canAdvance, onAdvance]);

  if (!text) return null;

  return (
    <div
      onClick={handleClick}
      style={{
        background: "rgba(15, 23, 42, 0.95)",
        border: "1px solid rgba(59, 130, 246, 0.4)",
        borderRadius: 16,
        padding: "16px 20px",
        minWidth: 280,
        maxWidth: 400,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {speaker && (
        <div
          style={{
            color: "#60a5fa",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 8,
          }}
        >
          {speaker}
        </div>
      )}
      <div
        ref={textRef}
        style={{
          color: "#f1f5f9",
          fontSize: 14,
          lineHeight: 1.6,
          fontFamily: "var(--font-inter, sans-serif)",
          minHeight: 40,
        }}
      >
        {displayedText}
        {isTyping && (
          <span
            style={{
              display: "inline-block",
              width: 2,
              height: "1em",
              backgroundColor: "#60a5fa",
              marginLeft: 2,
              animation: "blink 0.8s infinite",
              verticalAlign: "text-bottom",
            }}
          />
        )}
      </div>
      {showContinueIndicator && canAdvance && !isTyping && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              color: "#64748b",
              fontSize: 11,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Click to continue
            <span style={{ animation: "bounce 1s infinite" }}>▼</span>
          </div>
        </div>
      )}
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }
      `}</style>
    </div>
  );
});

// ─── Choice Button ───────────────────────────────────────────────────────────────

export interface ChoiceButtonProps {
  choice: Choice;
  index: number;
  locale?: string;
  onSelect: (choiceId: string) => void;
  disabled?: boolean;
}

export const ChoiceButton = memo(function ChoiceButton({
  choice,
  index,
  locale = "en",
  onSelect,
  disabled = false,
}: ChoiceButtonProps) {
  const getText = () => {
    if (typeof choice.text === "string") return choice.text;
    return choice.text[locale as keyof typeof choice.text] ?? choice.text.en;
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(choice.id)}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "12px 16px",
        borderRadius: 12,
        background: disabled
          ? "rgba(51, 65, 85, 0.3)"
          : "rgba(30, 41, 59, 0.9)",
        border: disabled
          ? "1px solid rgba(71, 85, 105, 0.3)"
          : "1px solid rgba(59, 130, 246, 0.3)",
        color: disabled ? "#64748b" : "#e2e8f0",
        fontSize: 14,
        fontWeight: 500,
        fontFamily: "var(--font-inter, sans-serif)",
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left" as const,
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)";
          e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.6)";
          e.currentTarget.style.transform = "translateX(4px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "rgba(30, 41, 59, 0.9)";
          e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.3)";
          e.currentTarget.style.transform = "translateX(0)";
        }
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: disabled ? "rgba(71, 85, 105, 0.3)" : "rgba(59, 130, 246, 0.3)",
          color: disabled ? "#64748b" : "#60a5fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {String.fromCharCode(65 + index)}
      </span>
      <span>{getText()}</span>
    </button>
  );
});

// ─── Choice List ────────────────────────────────────────────────────────────────

export interface ChoiceListProps {
  choices: Choice[];
  locale?: string;
  onSelect: (choiceId: string) => void;
  disabled?: boolean;
}

export const ChoiceList = memo(function ChoiceList({
  choices,
  locale = "en",
  onSelect,
  disabled = false,
}: ChoiceListProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%",
        minWidth: 280,
        maxWidth: 400,
      }}
    >
      {choices.map((choice, index) => (
        <ChoiceButton
          key={choice.id}
          choice={choice}
          index={index}
          locale={locale}
          onSelect={onSelect}
          disabled={disabled}
        />
      ))}
    </div>
  );
});

// ─── Dialogue UI Container ─────────────────────────────────────────────────────

export interface DialogueUIProps {
  isActive: boolean;
  speaker?: string | null;
  text: string | null;
  choices?: Choice[];
  locale?: string;
  onChoice?: (choiceId: string) => void;
  onAdvance?: () => void;
  onClose?: () => void;
  position?: "bottom" | "center";
}

export const DialogueUI = memo(function DialogueUI({
  isActive,
  speaker,
  text,
  choices = [],
  locale = "en",
  onChoice,
  onAdvance,
  onClose,
  position = "bottom",
}: DialogueUIProps) {
  if (!isActive) return null;

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: position === "bottom" ? "flex-end" : "center",
    alignItems: "center",
    padding: 24,
    pointerEvents: "auto",
    zIndex: 100,
    background: position === "center" ? "rgba(0, 0, 0, 0.5)" : undefined,
  };

  const contentStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    alignItems: "center",
    animation: "fadeInUp 0.3s ease",
  };

  const isChoice = choices.length > 0;

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        {text && !isChoice && (
          <DialogueBubble
            speaker={speaker}
            text={text}
            onAdvance={onAdvance}
            showContinueIndicator={true}
          />
        )}
        {isChoice && (
          <ChoiceList
            choices={choices}
            locale={locale}
            onSelect={onChoice ?? (() => {})}
            disabled={false}
          />
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              marginTop: 8,
              padding: "8px 16px",
              borderRadius: 8,
              background: "transparent",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              color: "#94a3b8",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "var(--font-inter, sans-serif)",
            }}
          >
            Press ESC to close
          </button>
        )}
      </div>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
});

// ─── Quiz Prompt ────────────────────────────────────────────────────────────────

export interface QuizPromptProps {
  topic: string;
  difficulty?: string;
  onStart: () => void;
  onClose: () => void;
}

export const QuizPrompt = memo(function QuizPrompt({
  topic,
  difficulty,
  onStart,
  onClose,
}: QuizPromptProps) {
  const difficultyColors: Record<string, string> = {
    easy: "#22c55e",
    medium: "#f59e0b",
    hard: "#ef4444",
  };

  const color = difficulty ? difficultyColors[difficulty] ?? "#60a5fa" : "#60a5fa";

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.95)",
        border: `1px solid ${color}40`,
        borderRadius: 16,
        padding: "20px 24px",
        minWidth: 300,
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px ${color}20`,
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          marginBottom: 8,
        }}
      >
        Vocabulary Quiz
      </div>
      <div
        style={{
          color: "#f1f5f9",
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        {topic}
      </div>
      {difficulty && (
        <div
          style={{
            color: color,
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          {difficulty}
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={onStart}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 10,
            background: color,
            color: "#ffffff",
            border: "none",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "var(--font-inter, sans-serif)",
            boxShadow: `0 0 16px ${color}40`,
          }}
        >
          Start Quiz
        </button>
        <button
          type="button"
          onClick={onClose}
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
          Cancel
        </button>
      </div>
    </div>
  );
});
