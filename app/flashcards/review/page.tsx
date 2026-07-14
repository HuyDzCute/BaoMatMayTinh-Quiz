"use client";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  ArrowLeft,
  Repeat,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  ListChecks,
  Layers,
  CircleSlash,
  Flame,
  Clock,
  Sparkle,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { speak, stopSpeaking } from "@/lib/speech";
import {
  buildFilteredCrossSetReview,
  buildChoiceOptionsFromPool,
  getCrossSetFilterCounts,
  rateFlashcard,
  sm2Next,
  formatInterval,
  type DueCard,
  type CrossSetReview,
  type ReviewFilter,
} from "@/lib/flashcards-storage";
import { scoreAnswer, ratingFromScore, similarity } from "@/lib/fuzzy-match";
import type { FlashcardProgress } from "@/lib/types";

type Rating = "again" | "hard" | "good" | "easy";
type StudyMode = "flip" | "test" | "choice";

interface SessionEntry {
  card: DueCard;
  rating: Rating | null;
}

const FILTER_OPTIONS: { id: ReviewFilter; label: string; icon: typeof Flame }[] = [
  { id: "all", label: "Tất cả", icon: Layers },
  { id: "lapses", label: "Hay sai", icon: Flame },
  { id: "due", label: "Đến hạn", icon: Clock },
  { id: "new", label: "Mới", icon: Sparkle },
];

function parseFilter(raw: string | null): ReviewFilter {
  if (raw === "lapses" || raw === "due" || raw === "new" || raw === "all") return raw;
  return "all";
}

export default function CrossSetReviewPage() {
  return (
    <Suspense fallback={null}>
      <CrossSetReviewInner />
    </Suspense>
  );
}

function CrossSetReviewInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filter = parseFilter(searchParams.get("filter"));

  const [review, setReview] = useState<CrossSetReview | null>(null);
  const [counts, setCounts] = useState<Record<ReviewFilter, number>>({ all: 0, lapses: 0, due: 0, new: 0 });
  const [queue, setQueue] = useState<SessionEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [mode, setMode] = useState<StudyMode>("flip");
  const [reviewed, setReviewed] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  // Test-mode state
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<null | { score: number; bestMatch: string }>(null);

  // Choice-mode state
  const [choiceOptions, setChoiceOptions] = useState<string[]>([]);
  const [choicePicked, setChoicePicked] = useState<string | null>(null);
  const [choiceLocked, setChoiceLocked] = useState(false);

  const [previews, setPreviews] = useState({
    again: "<1 phút",
    hard: "1 ngày",
    good: "1 ngày",
    easy: "4 ngày",
  });

  // ── In-flight guards ─────────────────────────────────────────────
  // `advanceLockRef` makes `advance` idempotent within a single card: once
  // a rating has been persisted for the current card, further clicks /
  // auto-advance timers become no-ops. This prevents the bug where manual
  // rating and a scheduled auto-advance (700ms after a choice/test) both
  // call `rateFlashcard` for the same card.
  const advanceLockRef = useRef<string | null>(null);
  // Tracks all pending timer IDs so we can cancel them on filter switch,
  // rebuild, mode switch, or unmount — otherwise a stale 700ms callback
  // can call `advance` on a card the user has already left.
  const pendingTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const clearPendingTimers = useCallback(() => {
    for (const id of pendingTimersRef.current) {
      clearTimeout(id);
    }
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

  // Refs for keyboard shortcuts and distractor builder are declared below,
  // right after `currentCard` is derived, so the initial values are valid.

  // Build / rebuild queue when filter changes. Also cancel any in-flight
  // auto-advance timers and clear the idempotency lock, otherwise a stale
  // 700 ms callback could rate a card from the previous filter.
  useEffect(() => {
    clearPendingTimers();
    advanceLockRef.current = null;
    const r = buildFilteredCrossSetReview(filter);
    setReview(r);
    setCounts(getCrossSetFilterCounts());
    setQueue(r.cards.map((c) => ({ card: c, rating: null })));
    setCurrentIndex(0);
    setFlipped(false);
    setDone(false);
    setReviewed(0);
    setCorrect(0);
  }, [filter, clearPendingTimers]);

  // Cancel pending timers on unmount as well.
  useEffect(() => clearPendingTimers, [clearPendingTimers]);

  // Cancel timers and lock whenever the card or mode changes. The scheduled
  // auto-advance from the previous card would otherwise race the user's
  // actions on the new card. We also wipe per-card transient state so the
  // input/feedback for the previous card doesn't leak into the next.
  useEffect(() => {
    clearPendingTimers();
    advanceLockRef.current = null;
    setTestInput("");
    setTestResult(null);
    setChoicePicked(null);
    setChoiceLocked(false);
  }, [currentIndex, mode, clearPendingTimers]);

  const currentEntry = queue[currentIndex];
  const currentCard = currentEntry?.card ?? null;

  // ── Refs ─────────────────────────────────────────────────────────
  // We mirror values that need to be read from inside long-lived listeners
  // (keydown, per-card distractor builder) so those effects can mount once
  // and still see fresh state. Declared here so the initial values are valid.
  const queueRef = useRef<SessionEntry[]>(queue);
  const modeRef = useRef<StudyMode>(mode);
  const flippedRef = useRef(flipped);
  const choiceLockedRef = useRef(choiceLocked);
  const choiceOptionsRef = useRef(choiceOptions);
  const testInputRef = useRef(testInput);
  const testResultRef = useRef(testResult);
  const doneRef = useRef(done);
  const currentCardRef = useRef(currentCard);

  // Single sync effect — cheaper than 8 separate ones and easier to reason
  // about. Runs after every render but does only assignments, so the cost
  // is negligible.
  useEffect(() => {
    modeRef.current = mode;
    flippedRef.current = flipped;
    choiceLockedRef.current = choiceLocked;
    choiceOptionsRef.current = choiceOptions;
    testInputRef.current = testInput;
    testResultRef.current = testResult;
    doneRef.current = done;
    currentCardRef.current = currentCard;
    queueRef.current = queue;
  });

  // Build choice options when the card or mode changes.
  // We deliberately depend on a *stable* key (card id) rather than the whole
  // queue object — otherwise every `setQueue(...)` call (which happens on
  // every card advance) would re-shuffle options mid-interaction.
  const choiceKey = currentCard ? `${currentCard.setId}::${currentCard.card.id}` : "";
  useEffect(() => {
    if (mode !== "choice" || !currentCard) {
      setChoiceOptions([]);
      return;
    }
    // Prefer distractor cards from the current review session so they share
    // context. If the session has only one card we fall back to that single
    // card; the helper pads with placeholders so we always return 4 options.
    const sessionCards = queueRef.current.map((q) => q.card.card);
    const pool = sessionCards.length > 1 ? sessionCards : [currentCard.card];
    setChoiceOptions(buildChoiceOptionsFromPool(currentCard.card.back, pool, 3));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, choiceKey]);

  // Compute interval previews whenever the current card changes
  useEffect(() => {
    if (!currentCard) return;
    const prev: FlashcardProgress = currentCard.progress;
    const next = (r: Rating) => sm2Next(prev, r);
    setPreviews({
      again: formatInterval(next("again").interval ?? 0),
      hard: formatInterval(next("hard").interval ?? 0),
      good: formatInterval(next("good").interval ?? 0),
      easy: formatInterval(next("easy").interval ?? 0),
    });
  }, [currentCard]);

  const advance = useCallback(
    (rating: Rating) => {
      if (!currentCard) return;
      // Idempotency: if the user already rated this exact card (manual
      // rating or auto-advance), drop the second call silently. We key on
      // the card id + setId rather than a boolean because the card can
      // legitimately appear again after the queue wraps.
      const lockKey = `${currentCard.setId}::${currentCard.card.id}`;
      if (advanceLockRef.current === lockKey) return;
      advanceLockRef.current = lockKey;

      rateFlashcard(currentCard.setId, currentCard.card.id, rating);

      const wasCorrect = rating === "good" || rating === "easy";
      setReviewed((c) => c + 1);
      if (wasCorrect) setCorrect((c) => c + 1);

      setFlipped(false);
      setAnimating(true);
      safeSetTimeout(() => {
        setQueue((q) => {
          const nextQ = [...q];
          if (nextQ[currentIndex]) {
            nextQ[currentIndex] = { ...nextQ[currentIndex], rating };
          }
          return nextQ;
        });
        // Release the lock as soon as the card is committed so the next
        // card can be rated normally.
        advanceLockRef.current = null;
        if (currentIndex + 1 >= queue.length) {
          setDone(true);
        } else {
          setCurrentIndex((i) => i + 1);
        }
        setAnimating(false);
        // Notify any mounted indicators (Header badge, etc.) that progress
        // changed so the badge updates without a reload.
        window.dispatchEvent(new Event("qthtm:flashcard-progress-changed"));
      }, 180);
    },
    [currentCard, currentIndex, queue.length, safeSetTimeout],
  );

  const switchFilter = useCallback(
    (next: ReviewFilter) => {
      if (next === filter) return;
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") params.delete("filter");
      else params.set("filter", next);
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}` as `/${string}`);
    },
    [filter, pathname, router, searchParams],
  );

  const rebuildQueue = useCallback(() => {
    const r = buildFilteredCrossSetReview(filter);
    setReview(r);
    setCounts(getCrossSetFilterCounts());
    setQueue(r.cards.map((c) => ({ card: c, rating: null })));
    setCurrentIndex(0);
    setFlipped(false);
    setDone(false);
    setReviewed(0);
    setCorrect(0);
  }, [filter]);

  const pickChoice = useCallback(
    (picked: string) => {
      if (!currentCard || choiceLocked) return;
      const isCorrect = similarity(picked, currentCard.card.back) > 0.6;
      setChoicePicked(picked);
      setChoiceLocked(true);
      const rating: Rating = isCorrect ? "good" : "again";
      safeSetTimeout(() => advance(rating), 700);
    },
    [currentCard, choiceLocked, advance, safeSetTimeout],
  );

  const submitTest = useCallback(() => {
    if (!currentCard || !testInput.trim() || testResult) return;
    const r = scoreAnswer(testInput, currentCard.card.back);
    setTestResult(r);
    const rating = ratingFromScore(r.score);
    safeSetTimeout(() => advance(rating), 700);
  }, [currentCard, testInput, testResult, advance, safeSetTimeout]);

  // Keyboard shortcuts. The handler reads every value via refs (synced
  // up top) so the effect only mounts once — no re-attach on every key press,
  // and no stale-closure bugs when the user types quickly.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (doneRef.current || !currentCardRef.current) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (
          e.key === "Enter" &&
          modeRef.current === "test" &&
          !testResultRef.current &&
          testInputRef.current.trim()
        ) {
          e.preventDefault();
          submitTest();
        }
        return;
      }
      if (modeRef.current === "flip") {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          if (!flippedRef.current) setFlipped(true);
        } else if (flippedRef.current) {
          if (e.key === "1") advance("again");
          else if (e.key === "2") advance("hard");
          else if (e.key === "3") advance("good");
          else if (e.key === "4") advance("easy");
        }
      } else if (modeRef.current === "choice") {
        if (choiceLockedRef.current) return;
        const opts = choiceOptionsRef.current;
        const idx = ["1", "2", "3", "4"].indexOf(e.key);
        if (idx >= 0 && idx < opts.length) {
          pickChoice(opts[idx]);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // `advance`, `submitTest`, `pickChoice` are stable because they're wrapped
    // in useCallback and only change when their listed deps change. We accept
    // the re-attach in those cases to keep behaviour correct.
  }, [advance, pickChoice, submitTest]);

  // Stop any speech on unmount
  useEffect(() => () => stopSpeaking(), []);

  // ── Render branches ────────────────────────────────────────────────

  if (!review) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
        <Header />
        <main className="flex-1 fc-page" style={{ textAlign: "center", paddingTop: 80 }}>
          <p style={{ color: "#94a3b8" }}>Đang tải hàng đợi ôn tập…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (review.totalDue === 0) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
        <Header />
        <main className="flex-1 fc-page">
          <Link
            href="/flashcards"
            className="fc-btn fc-btn-ghost"
            style={{ alignSelf: "flex-start", marginBottom: 16 }}
          >
            <ArrowLeft size={14} /> Quay lại
          </Link>
          <section className="fc-hero">
            <span className="fc-hero-eyebrow">
              <Sparkles size={12} /> Ôn tập hợp nhất
            </span>
            <h1 className="fc-hero-title">Ôn tất cả thẻ đến hạn</h1>
            <p className="fc-hero-sub">
              Hệ thống sẽ gộp mọi thẻ đến hạn từ tất cả bộ (có sẵn + của bạn) vào một phiên ôn duy nhất.
            </p>
          </section>
          <FilterChips counts={counts} active={filter} onChange={switchFilter} />

          <div className="fc-empty">
            <div className="fc-empty-icon">
              <CircleSlash size={22} />
            </div>
            <p style={{ margin: 0, color: "#cbd5e1", fontWeight: 600 }}>
              {filter === "lapses"
                ? "Không có thẻ nào bị sai gần đây."
                : filter === "due"
                  ? "Không có thẻ nào đến hạn."
                  : filter === "new"
                    ? "Bạn đã học hết tất cả thẻ mới!"
                    : "Tuyệt vời! Hiện không có thẻ nào đến hạn ôn."}
            </p>
            <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 13 }}>
              {filter !== "all" ? "Thử chọn bộ lọc khác — hoặc " : ""}Hãy quay lại sau, hoặc vào từng bộ để học thêm từ mới.
            </p>
            <Link href="/flashcards" className="fc-btn fc-btn-primary" style={{ marginTop: 16 }}>
              <ListChecks size={14} /> Về danh sách bộ thẻ
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (done) {
    const accuracy = reviewed === 0 ? 0 : Math.round((correct / reviewed) * 100);
    const breakdown = new Map<string, { setName: string; setColor: string; total: number; correct: number }>();
    for (const entry of queue) {
      const k = entry.card.setId;
      const cur = breakdown.get(k) ?? {
        setName: entry.card.setName,
        setColor: entry.card.setColor,
        total: 0,
        correct: 0,
      };
      cur.total += 1;
      if (entry.rating === "good" || entry.rating === "easy") cur.correct += 1;
      breakdown.set(k, cur);
    }
    const breakdownArr = Array.from(breakdown.values()).sort((a, b) => b.total - a.total);
    const emoji = accuracy >= 80 ? "🎉" : accuracy >= 50 ? "👍" : "💪";

    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
        <Header />
        <main className="flex-1 fc-page">
          <Link href="/flashcards" className="fc-btn fc-btn-ghost" style={{ alignSelf: "flex-start" }}>
            <ArrowLeft size={14} /> Quay lại
          </Link>
          <section className="fc-hero">
            <span className="fc-hero-eyebrow">
              <Trophy size={12} /> Hoàn thành phiên ôn
            </span>
            <h1 className="fc-hero-title">Đã ôn xong!</h1>
            <p className="fc-hero-sub">Tổng kết phiên ôn tập hợp nhất của bạn hôm nay.</p>
          </section>

          <FilterChips counts={counts} active={filter} onChange={switchFilter} />

          <div className="fc-summary">
            <span className="fc-summary-emoji">{emoji}</span>
            <h2 className="fc-summary-title">Hoàn thành phiên ôn tập!</h2>
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
                  {correct}
                </span>
                <span className="fc-summary-tile-lbl">Đúng</span>
              </div>
              <div className="fc-summary-tile">
                <span className="fc-summary-tile-num">{breakdownArr.length}</span>
                <span className="fc-summary-tile-lbl">Bộ đã chạm</span>
              </div>
            </div>
          </div>

          {breakdownArr.length > 0 && (
            <>
              <div className="fc-section-label">
                <span className="fc-section-label-text">Theo bộ thẻ</span>
                <span className="fc-section-label-line" />
              </div>
              <div className="fc-grid">
                {breakdownArr.map((b) => {
                  const pct = b.total === 0 ? 0 : Math.round((b.correct / b.total) * 100);
                  return (
                    <div
                      key={b.setName}
                      className="fc-set-card"
                      style={
                        {
                          ["--fc-accent" as string]: b.setColor,
                          ["--fc-accent-soft" as string]: `${b.setColor}1f`,
                        } as React.CSSProperties
                      }
                    >
                      <span className="fc-set-card-accent" aria-hidden="true" />
                      <div className="fc-set-card-head">
                        <div className="flex-1 min-w-0">
                          <h3 className="fc-set-card-title">{b.setName}</h3>
                        </div>
                        <span
                          className="fc-badge-due"
                          style={{ background: `${b.setColor}26`, color: b.setColor }}
                        >
                          {b.total} thẻ
                        </span>
                      </div>
                      <p className="fc-set-card-desc">
                        Đúng <strong style={{ color: "#34d399" }}>{b.correct}</strong> / {b.total} · chính xác {pct}%
                      </p>
                      <div
                        className="fc-mastery-bar"
                        style={
                          {
                            ["--fc-mastery-pct" as string]: `${pct}%`,
                          } as React.CSSProperties
                        }
                      >
                        <span className="fc-mastery-fill" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex gap-2" style={{ marginTop: 24, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="fc-btn fc-btn-primary"
              onClick={rebuildQueue}
            >
              <RotateCcw size={14} /> Ôn tiếp (tạo hàng đợi mới)
            </button>
            {counts.all > queue.length && (
              <button
                type="button"
                className="fc-btn fc-btn-ghost"
                onClick={() => switchFilter("all")}
              >
                <Layers size={14} /> Mở rộng sang tất cả ({counts.all})
              </button>
            )}
            <Link href="/flashcards" className="fc-btn fc-btn-ghost">
              <ListChecks size={14} /> Về danh sách bộ thẻ
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!currentCard) return null;

  const progressPct = queue.length === 0 ? 0 : Math.round((currentIndex / queue.length) * 100);
  const showRating = (mode === "flip" && flipped) || (mode === "test" && !!testResult) || (mode === "choice" && choiceLocked);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
      <Header />
      <main className="flex-1 fc-page">
        <section className="fc-study">
          <header className="fc-study-header">
            <Link href="/flashcards" className="fc-study-back">
              <ArrowLeft size={13} /> Thoát
            </Link>
            <div className="fc-study-title-block">
              <h1 className="fc-study-title">Ôn tập hợp nhất</h1>
              <p className="fc-study-sub">
                Từ{" "}
                <span
                  className="fc-set-chip"
                  style={
                    {
                      ["--fc-accent" as string]: currentCard.setColor,
                      ["--fc-accent-soft" as string]: `${currentCard.setColor}1f`,
                    } as React.CSSProperties
                  }
                  title={currentCard.setName}
                >
                  <Layers size={11} /> {currentCard.setName}
                </span>{" "}
                · {Math.min(currentIndex + 1, queue.length)} / {queue.length} · đúng {correct}
              </p>
            </div>
            <div className="fc-mode-toggle" role="group" aria-label="Chế độ ôn tập">
              <button
                type="button"
                aria-pressed={mode === "flip"}
                className={`fc-mode-toggle-btn ${mode === "flip" ? "is-active" : ""}`}
                onClick={() => setMode("flip")}
                title="Lật thẻ truyền thống"
              >
                <Repeat size={13} aria-hidden="true" /> Lật
              </button>
              <button
                type="button"
                aria-pressed={mode === "test"}
                className={`fc-mode-toggle-btn ${mode === "test" ? "is-active" : ""}`}
                onClick={() => setMode("test")}
                title="Gõ đáp án"
              >
                <CheckCircle2 size={13} aria-hidden="true" /> Gõ
              </button>
              <button
                type="button"
                aria-pressed={mode === "choice"}
                className={`fc-mode-toggle-btn ${mode === "choice" ? "is-active" : ""}`}
                onClick={() => setMode("choice")}
                title="Trắc nghiệm"
              >
                <ListChecks size={13} aria-hidden="true" /> Chọn
              </button>
            </div>
          </header>

          <FilterChips counts={counts} active={filter} onChange={switchFilter} />

          <div className="fc-progress-bar">
            <span className="fc-progress-fill" style={{ width: `${done ? 100 : progressPct}%` }} />
          </div>

          <div className="fc-card-stage">
            <div
              className={`fc-card ${mode === "flip" && flipped ? "is-flipped" : ""} ${
                mode === "choice" && choiceLocked ? "is-flipped" : ""
              }`}
              onClick={() => {
                if (mode === "choice") return;
                if (mode !== "flip" || animating) return;
                if (!flipped) setFlipped(true);
              }}
            >
              <div className="fc-card-face">
                <span className="fc-card-label">
                  {mode === "test" ? "Hãy gõ nghĩa của từ này" : mode === "choice" ? "Chọn nghĩa đúng" : "Mặt trước"}
                </span>
                <span className="fc-card-front">{currentCard.card.front}</span>
                <button
                  type="button"
                  className="fc-card-speaker"
                  aria-label="Phát âm mặt trước"
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(currentCard.card.front);
                  }}
                >
                  <Volume2 size={14} />
                </button>
                {mode === "flip" && !flipped && (
                  <span className="fc-card-hint">
                    Bấm để lật — <kbd style={{ padding: "1px 5px", background: "rgba(15,23,42,0.6)", borderRadius: 3, border: "1px solid rgba(51,65,85,0.6)" }}>Space</kbd>
                  </span>
                )}
              </div>
              <div className="fc-card-face fc-card-face-back">
                <span className="fc-card-label fc-card-label-back">Mặt sau</span>
                <p className="fc-card-back">{currentCard.card.back}</p>
                <button
                  type="button"
                  className="fc-card-speaker"
                  aria-label="Phát âm mặt sau"
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(currentCard.card.back);
                  }}
                >
                  <Volume2 size={14} />
                </button>
                {currentCard.card.example && (
                  <p className="fc-card-example">“{currentCard.card.example}”</p>
                )}
              </div>
            </div>

            {mode === "test" && (
              <div className="fc-test-panel">
                <div className="fc-test-input-wrap">
                  <input
                    type="text"
                    className="fc-test-input"
                    placeholder="Gõ nghĩa / đáp án của bạn…"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        // Stop propagation so the global `window` keydown
                        // listener can't run submitTest a second time for
                        // the same keypress.
                        e.preventDefault();
                        e.stopPropagation();
                        submitTest();
                      }
                    }}
                    disabled={!!testResult}
                    autoFocus
                  />
                </div>
                {testResult ? (
                  <div className={`fc-test-result ${testResult.score >= 0.85 ? "is-good" : testResult.score >= 0.6 ? "is-ok" : "is-bad"}`}>
                    {testResult.score >= 0.85 ? <CheckCircle2 size={14} /> : <RotateCcw size={14} />}
                    <span>
                      {testResult.score >= 0.99
                        ? "Hoàn hảo!"
                        : testResult.score >= 0.85
                          ? "Gần đúng"
                          : testResult.score >= 0.6
                            ? "Sai chính tả"
                            : "Sai rồi"}{" "}
                      · đáp án: <strong>{testResult.bestMatch}</strong>
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="fc-btn fc-btn-primary"
                    onClick={submitTest}
                    disabled={!testInput.trim()}
                    style={{ alignSelf: "center", padding: "12px 24px" }}
                  >
                    Kiểm tra
                  </button>
                )}
              </div>
            )}

            {mode === "choice" && (
              <div className="fc-choice-panel">
                <div className="fc-choice-grid">
                  {choiceOptions.map((opt, i) => {
                    const isCorrectOpt = similarity(opt, currentCard.card.back) > 0.6;
                    const isPicked = choicePicked === opt;
                    let className = "fc-choice-btn";
                    if (choiceLocked) {
                      if (isCorrectOpt) className += " is-correct";
                      else if (isPicked) className += " is-wrong";
                    } else if (isPicked) className += " is-picked";
                    return (
                      <button
                        key={`${opt}-${i}`}
                        type="button"
                        className={className}
                        onClick={() => pickChoice(opt)}
                        disabled={choiceLocked}
                      >
                        <span className="fc-choice-key">{i + 1}</span>
                        <span className="fc-choice-text">{opt}</span>
                      </button>
                    );
                  })}
                </div>
                {choiceLocked && (
                  <div className="fc-choice-feedback">
                    {similarity(choicePicked ?? "", currentCard.card.back) > 0.6 ? (
                      <>
                        <CheckCircle2 size={14} /> Đúng rồi!
                      </>
                    ) : (
                      <>
                        <RotateCcw size={14} /> Đáp án đúng: <strong>{currentCard.card.back}</strong>
                      </>
                    )}
                  </div>
                )}
                {!choiceLocked && (
                  <div className="fc-choice-hint">
                    Nhấn phím <kbd>1</kbd>–<kbd>4</kbd> để chọn nhanh
                  </div>
                )}
              </div>
            )}

            {showRating && (
              <div className="fc-rating">
                <button type="button" className="fc-rate-btn fc-rate-again" onClick={() => advance("again")}>
                  <span className="fc-rate-label">Quên</span>
                  <span className="fc-rate-interval">{previews.again}</span>
                </button>
                <button type="button" className="fc-rate-btn fc-rate-hard" onClick={() => advance("hard")}>
                  <span className="fc-rate-label">Khó</span>
                  <span className="fc-rate-interval">{previews.hard}</span>
                </button>
                <button type="button" className="fc-rate-btn fc-rate-good" onClick={() => advance("good")}>
                  <span className="fc-rate-label">Tốt</span>
                  <span className="fc-rate-interval">{previews.good}</span>
                </button>
                <button type="button" className="fc-rate-btn fc-rate-easy" onClick={() => advance("easy")}>
                  <span className="fc-rate-label">Dễ</span>
                  <span className="fc-rate-interval">{previews.easy}</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   FilterChips — segmented control for switching review scopes
   ──────────────────────────────────────────────────────────────────── */
function FilterChips({
  counts,
  active,
  onChange,
}: {
  counts: Record<ReviewFilter, number>;
  active: ReviewFilter;
  onChange: (next: ReviewFilter) => void;
}) {
  return (
    <div
      className="fc-filter-chips"
      role="group"
      aria-label="Bộ lọc phiên ôn tập"
    >
      {FILTER_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = active === opt.id;
        const count = counts[opt.id] ?? 0;
        const isDisabled = count === 0 && !isActive;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={isActive}
            disabled={isDisabled}
            className={`fc-filter-chip ${isActive ? "is-active" : ""} ${
              isDisabled ? "is-disabled" : ""
            } fc-filter-chip--${opt.id}`}
            onClick={() => onChange(opt.id)}
            title={
              isDisabled ? `Không có thẻ trong nhóm "${opt.label}"` : `Hiển thị: ${opt.label}`
            }
          >
            <Icon size={12} aria-hidden="true" />
            <span>{opt.label}</span>
            <span className="fc-filter-chip-count" aria-label={`${count} thẻ`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}