"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Repeat,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Trophy,
  ListChecks,
  Volume2,
  PencilLine,
  Eye,
  XCircle,
  ListTree,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FlashcardSetIcon from "@/components/FlashcardSetIcon";
import { speak, stopSpeaking, detectLang, isSpeechSupported } from "@/lib/speech";
import {
  getFlashcardSet,
  buildStudyQueue,
  rateFlashcard,
  getSetStats,
  sm2Next,
  getProgressForCard,
  formatInterval,
  buildChoiceOptions,
  type SetStudyStats,
} from "@/lib/flashcards-storage";
import { scoreAnswer, ratingFromScore, similarity } from "@/lib/fuzzy-match";
import type { Flashcard, FlashcardSet } from "@/lib/types";

type Rating = "again" | "hard" | "good" | "easy";
type StudyMode = "flip" | "test" | "choice";

interface SessionCard {
  cardId: string;
  rating: Rating | null;
}

export default function FlashcardStudyPage() {
  const params = useParams<{ setId: string }>();
  const router = useRouter();
  const setId = decodeURIComponent(params.setId);

  const [set, setSet] = useState<FlashcardSet | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [queue, setQueue] = useState<SessionCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [stats, setStats] = useState<SetStudyStats | null>(null);
  const [sessionDone, setSessionDone] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mode, setMode] = useState<StudyMode>("flip");
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<null | { score: number; bestMatch: string }>(null);
  const [testTypedScore, setTestTypedScore] = useState(0);
  /** Multi-choice mode: shuffled answer options for the current card (correct
   *  answer is one of them), plus the user's pick once they answer. */
  const [choiceOptions, setChoiceOptions] = useState<string[]>([]);
  const [choicePick, setChoicePick] = useState<null | { picked: string; correct: boolean }>(null);
  const [choiceLocked, setChoiceLocked] = useState(false);

  /** Interval (days) for each rating button — derived live from SM-2 prev state.
   *  Recomputed each card via the useEffect below. */
  const [previews, setPreviews] = useState<{
    again: string;
    hard: string;
    good: string;
    easy: string;
  }>({ again: "<1 phút", hard: "1 ngày", good: "1 ngày", easy: "4 ngày" });

  // ── In-flight guards (shared pattern with review/page.tsx) ────
  // `advanceLockRef` makes `advance` idempotent per-card: a manual rating
  // and the auto-advance timer (scheduled by test/choice) must not both
  // run for the same card, otherwise counters and SRS state get
  // double-counted.
  const advanceLockRef = useRef<string | null>(null);
  const pendingTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const clearPendingTimers = useCallback(() => {
    for (const id of pendingTimersRef.current) clearTimeout(id);
    pendingTimersRef.current.clear();
  }, []);

  const safeSetTimeout = useCallback(
    (fn: () => void, ms: number): ReturnType<typeof setTimeout> => {
      const id = setTimeout(() => {
        pendingTimersRef.current.delete(id);
        fn();
      }, ms);
      pendingTimersRef.current.add(id);
      return id;
    },
    [],
  );

  // Reset test / choice state when moving to a new card or switching modes
  useEffect(() => {
    setTestInput("");
    setTestResult(null);
    setChoicePick(null);
    setChoiceLocked(false);
  }, [currentIndex, mode]);

  // Hydrate from localStorage. Reset `notFound` first so navigating from an
  // invalid id → a valid id doesn't leave the page stuck on the 404 branch.
  // Also cancel any in-flight timers (e.g. a stale setTimeout from a prior
  // card) and clear the advance lock so we start cleanly.
  useEffect(() => {
    clearPendingTimers();
    advanceLockRef.current = null;
    setNotFound(false);
    setSet(null);
    const found = getFlashcardSet(setId);
    if (!found) {
      setNotFound(true);
      return;
    }
    setSet(found);
    const ids = buildStudyQueue(found.id, found.cards);
    setQueue(ids.map((id) => ({ cardId: id, rating: null })));
    setCurrentIndex(0);
    setFlipped(false);
    setSessionDone(false);
    setReviewedCount(0);
    setCorrectCount(0);
    setStats(getSetStats(found.id, found.cards.length));
  }, [setId, clearPendingTimers]);

  // Clean up timers on unmount
  useEffect(() => clearPendingTimers, [clearPendingTimers]);

  const currentCard: Flashcard | null = useMemo(() => {
    if (!set) return null;
    const entry = queue[currentIndex];
    if (!entry) return null;
    return set.cards.find((c) => c.id === entry.cardId) ?? null;
  }, [set, queue, currentIndex]);

  // Build the 4-option list for multi-choice mode when the card changes
  useEffect(() => {
    if (mode !== "choice" || !set || !currentCard) {
      setChoiceOptions([]);
      return;
    }
    setChoiceOptions(buildChoiceOptions(currentCard.id, set.cards, 3));
    setChoicePick(null);
    setChoiceLocked(false);
  }, [currentCard, mode, set]);

  /** Recompute the SM-2 interval preview for each rating button whenever the
   *  visible card changes. We run `sm2Next` against the card's previous state
   *  to get the predicted interval for each possible rating — this is the
   *  same code path the rating click uses, so the labels are accurate. */
  useEffect(() => {
    if (!set || !currentCard) {
      setPreviews({ again: "<1 phút", hard: "1 ngày", good: "1 ngày", easy: "4 ngày" });
      return;
    }
    const prev = getProgressForCard(set.id, currentCard.id);
    const opts = (["again", "hard", "good", "easy"] as const).map((r) => ({
      r,
      next: sm2Next(prev, r),
    }));
    setPreviews({
      again: formatInterval(opts.find((o) => o.r === "again")!.next.interval ?? 0),
      hard: formatInterval(opts.find((o) => o.r === "hard")!.next.interval ?? 1),
      good: formatInterval(opts.find((o) => o.r === "good")!.next.interval ?? 1),
      easy: formatInterval(opts.find((o) => o.r === "easy")!.next.interval ?? 4),
    });
  }, [set, currentCard]);

const advance = useCallback(
    (rating: Rating) => {
      if (!set || !currentCard) return;
      // Idempotency guard: don't process this card twice.
      const lockKey = `${set.id}::${currentCard.id}`;
      if (advanceLockRef.current === lockKey) return;
      advanceLockRef.current = lockKey;

      rateFlashcard(set.id, currentCard.id, rating);
      // Notify any mounted cross-set indicators that progress changed
      window.dispatchEvent(new Event("qthtm:flashcard-progress-changed"));
      stopSpeaking();
      setReviewedCount((c) => c + 1);
      if (rating === "good" || rating === "easy") {
        setCorrectCount((c) => c + 1);
      }
      setStats(getSetStats(set.id, set.cards.length));
      setAnimating(true);
      safeSetTimeout(() => {
        setFlipped(false);
        setTestInput("");
        setTestResult(null);
        setChoicePick(null);
        setChoiceLocked(false);
        // "again" → re-queue the card at the end of this session so the user
        // sees it again before we declare "done". The previous version only
        // checked `slice(currentIndex + 1)` which missed the very occurrence
        // the user was *currently* on — letting users bounce the same card
        // forever. We now count how many times this card appears in the
        // whole queue and cap re-queues at 2 total occurrences per session.
        if (rating === "again") {
          let bounded = false;
          setQueue((q) => {
            const totalCount = q.filter((e) => e.cardId === currentCard.id).length;
            if (totalCount >= 2) {
              bounded = true;
              return q;
            }
            return [...q, { cardId: currentCard.id, rating: null }];
          });
          // Release the lock so the re-queued copy can itself be rated.
          advanceLockRef.current = null;
          if (bounded) {
            // No re-queue — just advance past the card.
            const next = currentIndex + 1;
            if (next >= queue.length) {
              setSessionDone(true);
            } else {
              setCurrentIndex(next);
            }
            setAnimating(false);
            return;
          }
          setCurrentIndex((i) => i + 1);
          setAnimating(false);
          return;
        }
        // Release lock for non-again ratings — next card can be rated.
        advanceLockRef.current = null;
        const next = currentIndex + 1;
        if (next >= queue.length) {
          setSessionDone(true);
          setAnimating(false);
        } else {
          setCurrentIndex(next);
          setAnimating(false);
        }
      }, 600); // longer delay in test mode so user sees feedback
    },
    [set, currentCard, currentIndex, queue.length, safeSetTimeout],
  );

  const submitTestAnswer = useCallback(() => {
    if (!currentCard || testResult) return;
    const { score, bestMatch } = scoreAnswer(testInput, currentCard.back);
    setTestResult({ score, bestMatch });
    setTestTypedScore(score);
    const rating = ratingFromScore(score);
    setReviewedCount((c) => c + 1);
    if (rating === "good" || rating === "easy") {
      setCorrectCount((c) => c + 1);
    }
    // Persist SRS update and advance after a short feedback pause. We do
    // NOT increment counters again here — `advance` already does it, and
    // the previous double-count bug inflated the session totals by 2x.
    safeSetTimeout(() => {
      advance(rating);
    }, 1200);
  }, [testInput, currentCard, testResult, advance, safeSetTimeout]);

  /** Handle the user picking one of the multi-choice options. Lock the
   *  buttons, reveal feedback, and after a short pause advance the card
   *  with the appropriate SRS rating (correct → good, wrong → again).
   *  Counters are incremented here exactly once (for the session totals);
   *  `advance` does not increment counters again to avoid the double-count. */
  const submitChoice = useCallback(
    (picked: string) => {
      if (!currentCard || choiceLocked) return;
      const correct = picked.trim() === currentCard.back.trim();
      setChoicePick({ picked, correct });
      setChoiceLocked(true);
      setReviewedCount((c) => c + 1);
      if (correct) setCorrectCount((c) => c + 1);
      safeSetTimeout(() => {
        advance(correct ? "good" : "again");
      }, 1100);
    },
    [currentCard, choiceLocked, advance, safeSetTimeout],
  );

  // Keyboard: Space flips (flip mode), Enter submits (test mode), 1-4 rate (flip mode after flip)
  useEffect(() => {
    if (!currentCard || sessionDone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === "Enter" && mode === "test" && !testResult && testInput.trim()) {
          e.preventDefault();
          submitTestAnswer();
        }
        return;
      }
      if (mode === "flip") {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          if (!flipped) setFlipped(true);
        } else if (flipped) {
          const map: Record<string, Rating> = { "1": "again", "2": "hard", "3": "good", "4": "easy" };
          const r = map[e.key];
          if (r) advance(r);
        }
      } else if (mode === "choice") {
        if (choiceLocked) return;
        const map: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3 };
        const idx = map[e.key];
        if (idx !== undefined && choiceOptions[idx]) {
          e.preventDefault();
          submitChoice(choiceOptions[idx]);
        }
      } else {
        // Test mode: Enter to submit when input has content
        if ((e.key === "Enter") && testInput.trim() && !testResult) {
          e.preventDefault();
          submitTestAnswer();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, currentCard, sessionDone, advance, mode, testInput, testResult, submitTestAnswer, choiceLocked, choiceOptions, submitChoice]);

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
        <Header />
        <main className="flex-1 fc-page">
          <div className="fc-empty">
            <p>Không tìm thấy bộ thẻ này.</p>
            <Link href="/flashcards" className="fc-btn fc-btn-primary mt-4 inline-flex">
              <ArrowLeft size={14} /> Quay lại thư viện
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!set) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
        <Header />
        <main className="flex-1 fc-page" />
        <Footer />
      </div>
    );
  }

  const total = queue.length;
  const progressPct = total === 0 ? 0 : Math.round((currentIndex / total) * 100);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
      <Header />
      <main className="flex-1 fc-page">
        <div className="fc-study">
          <header className="fc-study-header">
            <Link href="/flashcards" className="fc-study-back">
              <ArrowLeft size={13} /> Thư viện
            </Link>
            <div className="fc-study-title-block">
              <h1 className="fc-study-title">{set.name}</h1>
              <p className="fc-study-sub">
                {total === 0
                  ? "Không có thẻ nào cần ôn lúc này"
                  : sessionDone
                    ? `Hoàn thành ${reviewedCount}/${total} thẻ`
                    : `Thẻ ${currentIndex + 1}/${total} · ${stats?.mastery ?? 0}% đã thuộc`}
              </p>
            </div>
            {!sessionDone && total > 0 && (
              <div className="fc-mode-toggle" role="group" aria-label="Chế độ học">
                <button
                  type="button"
                  aria-pressed={mode === "flip"}
                  className={`fc-mode-btn ${mode === "flip" ? "is-active" : ""}`}
                  onClick={() => setMode("flip")}
                  title="Lật thẻ truyền thống"
                >
                  <Repeat size={13} aria-hidden="true" />
                  <span>Lật thẻ</span>
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "test"}
                  className={`fc-mode-btn ${mode === "test" ? "is-active" : ""}`}
                  onClick={() => setMode("test")}
                  title="Gõ đáp án để kiểm tra trí nhớ"
                >
                  <PencilLine size={13} aria-hidden="true" />
                  <span>Kiểm tra</span>
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "choice"}
                  className={`fc-mode-btn ${mode === "choice" ? "is-active" : ""}`}
                  onClick={() => setMode("choice")}
                  title="Chọn 1 đáp án đúng trong 4 lựa chọn"
                >
                  <ListTree size={13} aria-hidden="true" />
                  <span>Trắc nghiệm</span>
                </button>
              </div>
            )}
            <span
              className="fc-set-icon"
              style={
                {
                  ["--fc-accent" as string]: set.color,
                  ["--fc-accent-soft" as string]: `${set.color}1f`,
                  background: `${set.color}1f`,
                  color: set.color,
                } as React.CSSProperties
              }
            >
              <FlashcardSetIcon name={set.icon} size={18} color={set.color} />
            </span>
          </header>

          {total > 0 && (
            <div className="fc-progress-bar">
              <span
                className="fc-progress-fill"
                style={{ width: `${sessionDone ? 100 : progressPct}%` }}
              />
            </div>
          )}

          {sessionDone ? (
            <SessionSummary
              reviewed={reviewedCount}
              correct={correctCount}
              total={total}
              mastery={stats?.mastery ?? 0}
              onRestart={() => router.push(`/flashcards/${encodeURIComponent(setId)}`)}
              onBack={() => router.push("/flashcards")}
            />
          ) : total === 0 ? (
            <div className="fc-empty">
              <div className="fc-empty-icon">
                <Trophy size={22} />
              </div>
              <p style={{ margin: 0 }}>Tuyệt vời! Hiện không có thẻ nào cần ôn. Hãy thêm bộ thẻ mới.</p>
            </div>
          ) : currentCard ? (
            <>
              <div className="fc-card-stage">
                <div
                  className={`fc-card ${(mode === "flip" && flipped) ? "is-flipped" : ""} ${mode === "choice" && choiceLocked ? "is-flipped" : ""}`}
                  onClick={() => {
                    if (mode === "choice") return; // choice mode: no tap-to-flip
                    if (mode !== "flip" || animating) return;
                    setFlipped((v) => !v);
                  }}
                  style={
                    animating
                      ? ({ opacity: 0, transform: "scale(0.95)" } as React.CSSProperties)
                      : undefined
                  }
                >
                  <div className="fc-card-face">
                    <span className="fc-card-label">
                      {mode === "test"
                        ? "Hãy gõ nghĩa của từ này"
                        : mode === "choice"
                          ? "Chọn nghĩa đúng"
                          : "Front"}
                    </span>
                    {currentCard.pronunciation && (
                      <span className="fc-card-pron">{currentCard.pronunciation}</span>
                    )}
                    <span className="fc-card-front">{currentCard.front}</span>
                    <SpeakerButton text={currentCard.front} />
                    {mode === "flip" && (
                      <span className="fc-card-hint">
                        Bấm vào thẻ hoặc nhấn <kbd style={kbdStyle}>Space</kbd> để lật
                      </span>
                    )}
                  </div>
                  <div className="fc-card-face fc-card-face-back">
                    <span className="fc-card-label fc-card-label-back">Back</span>
                    <p className="fc-card-back">{currentCard.back}</p>
                    {currentCard.example && (
                      <p className="fc-card-example">
                        &ldquo;{currentCard.example}&rdquo;
                      </p>
                    )}
                    <SpeakerButton text={currentCard.back} label="Nghe dịch nghĩa" />
                  </div>
                </div>
              </div>

              {mode === "test" ? (
                <TestAnswerPanel
                  input={testInput}
                  setInput={setTestInput}
                  result={testResult}
                  onSubmit={submitTestAnswer}
                  correctnessHint={testTypedScore}
                />
              ) : mode === "choice" ? (
                <ChoicePanel
                  options={choiceOptions}
                  correct={currentCard.back}
                  pick={choicePick}
                  locked={choiceLocked}
                  onPick={submitChoice}
                />
              ) : flipped ? (
                <div className="fc-rating">
                  <RateButton
                    variant="again"
                    label="Lặp lại"
                    interval={previews.again}
                    onClick={() => advance("again")}
                  />
                  <RateButton
                    variant="hard"
                    label="Khó"
                    interval={previews.hard}
                    onClick={() => advance("hard")}
                  />
                  <RateButton
                    variant="good"
                    label="Tốt"
                    interval={previews.good}
                    onClick={() => advance("good")}
                  />
                  <RateButton
                    variant="easy"
                    label="Dễ"
                    interval={previews.easy}
                    onClick={() => advance("easy")}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="fc-btn fc-btn-primary"
                  onClick={() => setFlipped(true)}
                  style={{ alignSelf: "center", padding: "12px 24px" }}
                >
                  <Repeat size={14} /> Lật thẻ
                </button>
              )}
            </>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function RateButton({
  variant,
  label,
  interval,
  onClick,
}: {
  variant: "again" | "hard" | "good" | "easy";
  label: string;
  interval: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`fc-rate-btn fc-rate-${variant}`} onClick={onClick}>
      <span className="fc-rate-label">{label}</span>
      <span className="fc-rate-interval">{interval}</span>
    </button>
  );
}

function SessionSummary({
  reviewed,
  correct,
  total,
  mastery,
  onRestart,
  onBack,
}: {
  reviewed: number;
  correct: number;
  total: number;
  mastery: number;
  onRestart: () => void;
  onBack: () => void;
}) {
  const accuracy = reviewed === 0 ? 0 : Math.round((correct / reviewed) * 100);
  return (
    <div className="fc-summary">
      <span className="fc-summary-emoji">
        {accuracy >= 80 ? "🎉" : accuracy >= 50 ? "👍" : "💪"}
      </span>
      <h2 className="fc-summary-title">Hoàn thành phiên học!</h2>
      <div className="fc-summary-stats">
        <div className="fc-summary-tile">
          <span className="fc-summary-tile-num">{reviewed}</span>
          <span className="fc-summary-tile-lbl">Đã ôn</span>
        </div>
        <div className="fc-summary-tile">
          <span className="fc-summary-tile-num" style={{ color: "#34d399" }}>
            {accuracy}%
          </span>
          <span className="fc-summary-tile-lbl">Chính xác</span>
        </div>
        <div className="fc-summary-tile">
          <span className="fc-summary-tile-num" style={{ color: "#60a5fa" }}>
            {mastery}%
          </span>
          <span className="fc-summary-tile-lbl">Đã thuộc</span>
        </div>
      </div>
      <div className="flex gap-2 mt-2 flex-wrap justify-center">
        <button type="button" className="fc-btn fc-btn-primary" onClick={onRestart}>
          <RotateCcw size={13} /> Học tiếp
        </button>
        <Link href="/flashcards" className="fc-btn fc-btn-ghost">
          <ListChecks size={13} /> Về thư viện
        </Link>
      </div>
      <p
        className="text-xs mt-1 flex items-center gap-1.5"
        style={{ color: "#475569", textAlign: "center" }}
      >
        <Sparkles size={11} />
        Hãy quay lại vào ngày mai để lặp lại các thẻ cần ôn — bạn sẽ nhớ lâu hơn.
      </p>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 10,
  padding: "1px 5px",
  borderRadius: 4,
  background: "rgba(30,41,59,0.8)",
  border: "1px solid rgba(51,65,85,0.5)",
  color: "#94a3b8",
  marginLeft: 4,
};

function SpeakerButton({
  text,
  label = "Nghe phát âm",
}: {
  text: string;
  label?: string;
}) {
  const [speaking, setSpeaking] = useState(false);

  // Stop speech if user navigates away mid-playback
  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // don't flip the card when clicking speaker
    if (!isSpeechSupported() || !text) return;
    setSpeaking(true);
    try {
      await speak(text, { lang: detectLang(text), rate: 0.9 });
    } finally {
      setSpeaking(false);
    }
  };

  if (!isSpeechSupported() || !text) return null;

  return (
    <button
      type="button"
      className={`fc-speaker-btn ${speaking ? "is-speaking" : ""}`}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <Volume2 size={15} />
      <span>{speaking ? "Đang phát…" : label}</span>
    </button>
  );
}

/**
 * Test mode answer input — types the meaning, gets graded by fuzzy match.
 * Shows a live feedback panel after submission (correct / close / wrong).
 */
function TestAnswerPanel({
  input,
  setInput,
  result,
  onSubmit,
  correctnessHint,
}: {
  input: string;
  setInput: (s: string) => void;
  result: null | { score: number; bestMatch: string };
  onSubmit: () => void;
  correctnessHint: number;
}) {
  const inputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) node.focus();
  }, []);

  if (result) {
    const pct = Math.round(result.score * 100);
    const isExact = result.score >= 0.99;
    const isClose = result.score >= 0.85 && result.score < 0.99;
    const isPartial = result.score >= 0.6 && result.score < 0.85;
    const tone = isExact
      ? { color: "#34d399", icon: <CheckCircle2 size={18} />, label: "Hoàn hảo!" }
      : isClose
        ? { color: "#60a5fa", icon: <CheckCircle2 size={18} />, label: "Đúng rồi!" }
        : isPartial
          ? { color: "#f59e0b", icon: <Eye size={18} />, label: "Gần đúng — kiểm tra chính tả" }
          : { color: "#ef4444", icon: <XCircle size={18} />, label: "Sai rồi" };
    return (
      <div className="fc-test-feedback" style={{ borderColor: `${tone.color}66` }}>
        <div className="fc-test-feedback-head" style={{ color: tone.color }}>
          {tone.icon}
          <span style={{ fontWeight: 600 }}>{tone.label}</span>
          <span className="fc-test-pct" style={{ background: `${tone.color}22`, color: tone.color }}>
            {pct}%
          </span>
        </div>
        <div className="fc-test-feedback-row">
          <span className="fc-test-feedback-lbl">Bạn gõ:</span>
          <span className="fc-test-feedback-val">{input || "(trống)"}</span>
        </div>
        <div className="fc-test-feedback-row">
          <span className="fc-test-feedback-lbl">Đáp án:</span>
          <span className="fc-test-feedback-val" style={{ color: tone.color }}>
            {result.bestMatch}
          </span>
        </div>
        <div className="fc-test-progress-track">
          <div
            className="fc-test-progress-fill"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${tone.color}, ${tone.color})`,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fc-test-panel">
      <div className="fc-test-input-wrap">
        <input
          ref={inputRef}
          type="text"
          className="fc-test-input"
          placeholder="Nhập nghĩa của từ rồi nhấn Enter…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              // Stop propagation so the window-level keydown listener
              // (registered at the page level) doesn't run onSubmit again.
              e.preventDefault();
              e.stopPropagation();
              onSubmit();
            }
          }}
        />
        <button
          type="button"
          className="fc-test-submit"
          onClick={onSubmit}
          disabled={!input.trim()}
        >
          Kiểm tra
        </button>
      </div>
      <p className="fc-test-hint">
        Gõ nghĩa (có thể không dấu) và nhấn <kbd style={kbdStyle}>Enter</kbd>. Sai chính tả nhẹ vẫn được tính điểm.
      </p>
    </div>
  );
}

/**
 * Multi-choice mode panel — 4 buttons, one of which is the correct answer.
 * After the user clicks, the buttons lock, the correct option is highlighted,
 * the user's wrong pick is marked, and feedback shows the correct meaning.
 */
function ChoicePanel({
  options,
  correct,
  pick,
  locked,
  onPick,
}: {
  options: string[];
  correct: string;
  pick: null | { picked: string; correct: boolean };
  locked: boolean;
  onPick: (opt: string) => void;
}) {
  return (
    <div className="fc-choice-panel">
      <div className="fc-choice-grid">
        {options.map((opt, i) => {
          const isCorrect = opt.trim() === correct.trim();
          const isPicked = pick?.picked === opt;
          const showAsCorrect = locked && isCorrect;
          const showAsWrong = locked && isPicked && !isCorrect;
          const disabled = locked || !opt;
          const cls = [
            "fc-choice-btn",
            showAsCorrect && "is-correct",
            showAsWrong && "is-wrong",
            isPicked && !locked && "is-picked",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={`${opt}-${i}`}
              type="button"
              className={cls}
              onClick={() => onPick(opt)}
              disabled={disabled}
            >
              <span className="fc-choice-key">{i + 1}</span>
              <span className="fc-choice-text">{opt}</span>
              {showAsCorrect && <CheckCircle2 size={16} className="fc-choice-icon" />}
              {showAsWrong && <XCircle size={16} className="fc-choice-icon" />}
            </button>
          );
        })}
      </div>
      {locked && pick && (
        <div
          className="fc-choice-feedback"
          style={{
            color: pick.correct ? "#34d399" : "#ef4444",
            borderColor: pick.correct ? "#34d39966" : "#ef444466",
          }}
        >
          {pick.correct ? (
            <>
              <CheckCircle2 size={14} /> Chính xác! Đáp án là{" "}
              <strong>{correct}</strong>.
            </>
          ) : (
            <>
              <XCircle size={14} /> Chưa đúng. Đáp án là{" "}
              <strong>{correct}</strong>.
            </>
          )}
        </div>
      )}
      {!locked && (
        <p className="fc-choice-hint">
          Chọn đáp án đúng hoặc nhấn <kbd style={kbdStyle}>1</kbd>–<kbd style={kbdStyle}>4</kbd>.
        </p>
      )}
    </div>
  );
}
