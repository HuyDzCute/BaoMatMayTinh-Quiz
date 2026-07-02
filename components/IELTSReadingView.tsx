"use client";

import { Question } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Send,
  CheckCircle2,
  BookOpen,
} from "lucide-react";

const LETTERS = ["A", "B", "C", "D"];

interface IELTSReadingViewProps {
  questions: Question[];
  currentIndex: number;
  answers: string[];
  onSelectAnswer: (itemIdx: number, optIdx: number) => void;
  onJump: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
  totalSecs: number;
  setName: string;
  passageLabel?: string;
  passage?: string;
}

const fmt = (secs: number) => {
  // Defensive: clamp to non-negative and cap at 99:59 to avoid layout overflow
  const safe = Math.max(0, Math.min(secs, 60 * 100 - 1));
  return `${Math.floor(safe / 60)}:${(safe % 60).toString().padStart(2, "0")}`;
};

function isAnsweredForQuestion(q: Question | undefined, answerVal: string): boolean {
  if (!q || answerVal === "-1") return false;
  if (q.type === "matching" || q.type === "summary") {
    try {
      const obj: Record<string, number> = JSON.parse(answerVal);
      const itemCount = q.matchItems?.length ?? 0;
      return Object.keys(obj).length === itemCount;
    } catch {
      return false;
    }
  }
  return answerVal !== "-1";
}

// ─── Question type helpers ───────────────────────────────────────────────────

function isMatching(q: Question) {
  return q.type === "matching";
}

function isSummary(q: Question) {
  return q.type === "summary";
}

// ─── MCQ renderer ────────────────────────────────────────────────────────────

function McqQuestion({
  q,
  selectedIdx,
  onSelect,
}: {
  q: Question;
  selectedIdx: number;
  onSelect: (itemIdx: number, optIdx: number) => void;
}) {
  // MCQ has a single "item" — use 0 as the canonical itemIdx for the whole question
  const SINGLE_ITEM_IDX = 0;
  return (
    <div className="ielts-question-body">
      <p className="ielts-question-prompt">{q.question}</p>
      <div className="ielts-options">
        {q.answers.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(SINGLE_ITEM_IDX, idx)}
            className={`ielts-option ${selectedIdx === idx ? "is-selected" : ""}`}
          >
            <span className="ielts-option-letter">{LETTERS[idx]}</span>
            <span>{opt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Matching renderer ────────────────────────────────────────────────────────

function MatchingQuestion({
  q,
  answerObj,
  onSelect,
}: {
  q: Question;
  answerObj: Record<string, number>;
  onSelect: (itemIdx: number, optIdx: number) => void;
}) {
  const items = q.matchItems ?? [];
  const options = q.matchOptions ?? [];

  return (
    <div className="ielts-question-body">
      <p className="ielts-question-prompt">{q.question}</p>
      <div className="matching-container">
        {items.map((item, i) => (
          <div key={i} className="matching-row">
            <div className="matching-item-num">{i + 1}.</div>
            <div className="matching-item-text">{item}</div>
            <select
              className="matching-select"
              value={answerObj[String(i)] !== undefined ? String(answerObj[String(i)]) : ""}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) onSelect(i, val);
              }}
            >
              <option value="" disabled>
                Choose…
              </option>
              {options.map((opt, j) => (
                <option key={j} value={j}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Summary renderer ────────────────────────────────────────────────────────

function SummaryQuestion({
  q,
  answerObj,
  onSelect,
}: {
  q: Question;
  answerObj: Record<string, number>;
  onSelect: (itemIdx: number, optIdx: number) => void;
}) {
  const items = q.matchItems ?? [];

  return (
    <div className="ielts-question-body">
      <p className="ielts-question-prompt">{q.question}</p>
      <div className="summary-container">
        {items.map((item, i) => (
          <div key={i} className="summary-row">
            <div className="summary-item-text">{item}</div>
            <select
              className="matching-select"
              value={answerObj[String(i)] !== undefined ? String(answerObj[String(i)]) : ""}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) onSelect(i, val);
              }}
            >
              <option value="" disabled>
                Choose…
              </option>
              {(q.matchOptions ?? []).map((opt, j) => (
                <option key={j} value={j}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function IELTSReadingView({
  questions,
  currentIndex,
  answers,
  onSelectAnswer,
  onJump,
  onPrev,
  onNext,
  onSubmit,
  totalSecs,
  setName,
  passageLabel = "Reading Passage 1",
  passage,
}: IELTSReadingViewProps) {
  const pillRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const passageBodyRef = useRef<HTMLDivElement>(null);
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Auto-scroll passage to top when question changes
  useEffect(() => {
    if (passageBodyRef.current) {
      passageBodyRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentIndex]);

  // Stable callback ref setter for each pill
  const setPillRef = (i: number) => (el: HTMLButtonElement | null) => {
    pillRefs.current[i] = el;
  };

  // Keep pill refs array in sync with question count
  useEffect(() => {
    if (pillRefs.current.length > questions.length) {
      pillRefs.current = pillRefs.current.slice(0, questions.length);
    }
  }, [questions.length]);

  const effectiveQuestions: Question[] =
    questions.length > 0 ? questions : [];
  const currentQ = effectiveQuestions[currentIndex];
  const total = effectiveQuestions.length;
  const answeredCount = effectiveQuestions.reduce((count, q, i) => {
    return count + (isAnsweredForQuestion(q, answers[i]) ? 1 : 0);
  }, 0);
  const isLast = currentIndex === total - 1;

  const timerColor =
    totalSecs <= 60 ? "is-danger" : totalSecs <= 180 ? "is-warning" : "";

  const effectivePassage =
    passage ??
    (currentQ?.passage ??
      "No passage provided. Please load the reading passage.");

  useEffect(() => {
    if (flashIdx === null) return;
    const t = setTimeout(() => setFlashIdx(null), 700);
    return () => clearTimeout(t);
  }, [flashIdx]);

  // Close submit modal on Escape
  useEffect(() => {
    if (!showSubmitConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSubmitConfirm(false);
    };
    window.addEventListener("keydown", onKey);

    // Lock body scroll while modal is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [showSubmitConfirm]);

  // Empty state: no questions at all
  if (total === 0) {
    return (
      <div className="ielts-page">
        <div className="ielts-topbar">
          <div className="ielts-topbar-inner">
            <div className="ielts-brand">
              <div className="ielts-brand-mark">IDP</div>
              <div>
                <div>IELTS Academic</div>
                <div className="ielts-brand-sub">Reading · {setName}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="ielts-question-card" style={{ margin: "32px auto", textAlign: "center", padding: "64px 32px", maxWidth: 540 }}>
          <h2 style={{ fontFamily: "Georgia, serif", color: "var(--ielts-ink)", marginBottom: 8 }}>
            No reading test available
          </h2>
          <p style={{ color: "var(--ielts-ink-muted)", fontSize: 14 }}>
            This set does not have a reading section.
          </p>
        </div>
      </div>
    );
  }

  const handlePillClick = (i: number) => {
    onJump(i);
    setFlashIdx(i);
  };

  const handleSubmitClick = () => {
    const unanswered = effectiveQuestions.reduce((c, q, i) => {
      return c + (isAnsweredForQuestion(q, answers[i]) ? 0 : 1);
    }, 0);
    if (unanswered > 0) {
      setShowSubmitConfirm(true);
      return;
    }
    onSubmit();
  };

  const selected = currentQ ? (answers[currentIndex] ?? "-1") : "-1";
  // Parse answer for matching/summary (JSON object) or MCQ (string index)
  let currentAnswerObj: Record<string, number> = {};
  try {
    if (currentQ && (currentQ.type === "matching" || currentQ.type === "summary") && selected !== "-1") {
      const parsed = JSON.parse(selected);
      if (parsed && typeof parsed === "object") currentAnswerObj = parsed;
    }
  } catch {
    currentAnswerObj = {};
  }
  const currentMcqIdx =
    !currentQ || currentQ.type === "matching" || currentQ.type === "summary"
      ? -1
      : parseInt(selected === "-1" ? "-1" : selected, 10);

  return (
    <div className="ielts-page">
      {/* Top bar */}
      <div className="ielts-topbar">
        <div className="ielts-topbar-inner">
          <div className="ielts-brand">
            <div className="ielts-brand-mark">IDP</div>
            <div>
              <div>IELTS Academic</div>
              <div className="ielts-brand-sub">Reading · {setName}</div>
            </div>
          </div>
          <div className="ielts-topbar-actions">
            <div className="ielts-progress-text">
              <strong>{answeredCount}</strong> / {total} answered
            </div>
            <div className={`ielts-timer-pill ${timerColor}`}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{fmt(totalSecs)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="ielts-reading-layout">
        {/* Passage column */}
        <aside className="ielts-passage-card">
          <div className="ielts-passage-header">
            <div>
              <div className="ielts-passage-title">{passageLabel}</div>
              <div className="ielts-progress-text" style={{ marginTop: 2 }}>
                You should spend about 20 minutes on this passage.
              </div>
            </div>
            {/* Sticky question reminder */}
            <div style={{
              marginTop: "8px", padding: "4px 8px",
              background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)",
              borderRadius: "6px", fontSize: "11px", color: "#3b82f6",
              fontFamily: "var(--font-jetbrains)", fontWeight: 600,
              display: "flex", alignItems: "center", gap: "4px"
            }}>
              <BookOpen size={11} />
              Question {currentIndex + 1} / {total}
            </div>
          </div>
          <div className="ielts-passage-body" ref={passageBodyRef}>
            {effectivePassage.split("\n\n").map((para, idx) => {
              const trimmed = para.trim();
              if (
                trimmed.startsWith("READING PASSAGE") ||
                trimmed.startsWith("READING")
              ) {
                return (
                  <p key={idx} className="passage-label">
                    {trimmed}
                  </p>
                );
              }
              return <p key={idx}>{trimmed}</p>;
            })}
          </div>
        </aside>

        {/* Question column */}
        <main className="ielts-question-card">
          <div className="ielts-question-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="ielts-question-num">
                Question {currentIndex + 1}
                <span className="ielts-question-num-of"> of {total}</span>
              </div>
              {(() => {
                const t = currentQ?.type;
                if (t === "matching") return <span className="ielts-qtype-badge ielts-qtype-matching">Matching</span>;
                if (t === "summary")  return <span className="ielts-qtype-badge ielts-qtype-summary">Summary</span>;
                return <span className="ielts-qtype-badge ielts-qtype-mcq">MCQ</span>;
              })()}
            </div>
            {isAnsweredForQuestion(currentQ, answers[currentIndex] ?? "-1") ? (
              <span className="ielts-q-status">Answered</span>
            ) : (
              <span className="ielts-q-status is-empty">Not answered</span>
            )}
          </div>

          {currentQ && isMatching(currentQ) ? (
            <MatchingQuestion
              q={currentQ}
              answerObj={currentAnswerObj}
              onSelect={onSelectAnswer}
            />
          ) : currentQ && isSummary(currentQ) ? (
            <SummaryQuestion
              q={currentQ}
              answerObj={currentAnswerObj}
              onSelect={onSelectAnswer}
            />
          ) : currentQ ? (
            <McqQuestion
              q={currentQ}
              selectedIdx={currentMcqIdx}
              onSelect={onSelectAnswer}
            />
          ) : (
            <div className="ielts-question-body">
              <p className="ielts-question-prompt">No question to display.</p>
            </div>
          )}

          {/* Question nav */}
          <div className="ielts-qnav">
            <p className="ielts-qnav-title">Questions</p>
            <div className="ielts-qnav-grid">
              {effectiveQuestions.map((q, i) => {
                const isActive = i === currentIndex;
                const isAnswered = isAnsweredForQuestion(q, answers[i]);
                const isFlash = flashIdx === i;
                let typeTag = "";
                if (q?.type === "matching") typeTag = "M";
                else if (q?.type === "summary") typeTag = "S";
                const cls = [
                  "ielts-qnav-pill",
                  isAnswered ? "is-answered" : "",
                  isActive ? "is-active" : "",
                  isFlash ? "is-flash" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <button
                    key={i}
                    ref={setPillRef(i)}
                    className={cls}
                    onClick={() => handlePillClick(i)}
                    aria-label={`Go to question ${i + 1}${q?.type ? ` (${q.type})` : ""}`}
                    title={q?.type ? `type: ${q.type}` : undefined}
                  >
                    {typeTag ? (
                      <span className="ielts-qnav-pill-tag">
                        <span className="ielts-qnav-pill-num">{i + 1}</span>
                        <span className="ielts-qnav-pill-type">{typeTag}</span>
                      </span>
                    ) : (
                      i + 1
                    )}
                  </button>
                );
              })}
            </div>
            <div className="ielts-qnav-actions">
              <button
                onClick={onPrev}
                disabled={currentIndex === 0}
                className="ielts-btn ielts-btn-secondary"
                style={
                  currentIndex === 0
                    ? { opacity: 0.4, cursor: "not-allowed" }
                    : {}
                }
              >
                <ArrowLeft size={14} /> Previous
              </button>
              {isLast ? (
                <button
                  onClick={handleSubmitClick}
                  className="ielts-btn ielts-btn-success"
                >
                  <Send size={14} /> Submit test
                </button>
              ) : (
                <button
                  onClick={onNext}
                  className="ielts-btn ielts-btn-primary"
                >
                  Next <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Submit confirm modal */}
      {showSubmitConfirm && (
        <div
          className="ielts-score-modal"
          style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(6px)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-confirm-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSubmitConfirm(false);
          }}
        >
          <div className="ielts-intro-card" style={{ maxWidth: 440, animation: "ieltsScorePop 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
            <div className="ielts-intro-banner" style={{ paddingBottom: 16 }}>
              <span className="ielts-intro-eyebrow">
                <BookOpen size={11} /> Submit
              </span>
              <h3 id="submit-confirm-title" className="ielts-intro-title" style={{ fontSize: 20 }}>
                Submit your test?
              </h3>
              <p className="ielts-intro-sub">
                You still have{" "}
                <strong style={{ color: "var(--ielts-danger)" }}>
                  {effectiveQuestions.reduce((c, q, i) => {
                    return c + (isAnsweredForQuestion(q, answers[i]) ? 0 : 1);
                  }, 0)}
                </strong>{" "}
                unanswered question(s).
              </p>
            </div>
            <div className="ielts-intro-form">
              <div className="ielts-intro-actions">
                <button
                  className="ielts-btn ielts-btn-secondary"
                  onClick={() => setShowSubmitConfirm(false)}
                >
                  Continue test
                </button>
                <button
                  className="ielts-btn ielts-btn-success"
                  onClick={() => {
                    setShowSubmitConfirm(false);
                    onSubmit();
                  }}
                >
                  <CheckCircle2 size={14} /> Submit anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
