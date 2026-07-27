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
  BookOpen,
  TrendingUp,
  Flame,
  Clock,
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
  resetSetProgress,
  type SetStudyStats,
} from "@/lib/flashcards-storage";
import { scoreAnswer, ratingFromScore } from "@/lib/fuzzy-match";
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
  const [choiceOptions, setChoiceOptions] = useState<string[]>([]);
  const [choicePick, setChoicePick] = useState<null | { picked: string; correct: boolean }>(null);
  const [choiceLocked, setChoiceLocked] = useState(false);

  const [previews, setPreviews] = useState<{
    again: string;
    hard: string;
    good: string;
    easy: string;
  }>({ again: "<1 phút", hard: "1 ngày", good: "1 ngày", easy: "4 ngày" });

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

  useEffect(() => {
    setTestInput("");
    setTestResult(null);
    setChoicePick(null);
    setChoiceLocked(false);
  }, [currentIndex, mode]);

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
    if (found.id !== setId) {
      router.replace(`/flashcards/${encodeURIComponent(found.id)}`);
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

  useEffect(() => clearPendingTimers, [clearPendingTimers]);

  const currentCard: Flashcard | null = useMemo(() => {
    if (!set) return null;
    const entry = queue[currentIndex];
    if (!entry) return null;
    return set.cards.find((c) => c.id === entry.cardId) ?? null;
  }, [set, queue, currentIndex]);

  useEffect(() => {
    if (mode !== "choice" || !set || !currentCard) {
      setChoiceOptions([]);
      return;
    }
    setChoiceOptions(buildChoiceOptions(currentCard.id, set.cards, 3));
    setChoicePick(null);
    setChoiceLocked(false);
  }, [currentCard, mode, set]);

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
      const lockKey = `${set.id}::${currentCard.id}`;
      if (advanceLockRef.current === lockKey) return;
      advanceLockRef.current = lockKey;

      rateFlashcard(set.id, currentCard.id, rating);
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
          advanceLockRef.current = null;
          if (bounded) {
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
        advanceLockRef.current = null;
        const next = currentIndex + 1;
        if (next >= queue.length) {
          setSessionDone(true);
          setAnimating(false);
        } else {
          setCurrentIndex(next);
          setAnimating(false);
        }
      }, 600);
    },
    [set, currentCard, currentIndex, queue.length, safeSetTimeout],
  );

  const submitTestAnswer = useCallback(() => {
    if (!currentCard || testResult) return;
    const { score, bestMatch } = scoreAnswer(testInput, currentCard.back);
    setTestResult({ score, bestMatch });
    const rating = ratingFromScore(score);
    setReviewedCount((c) => c + 1);
    if (rating === "good" || rating === "easy") {
      setCorrectCount((c) => c + 1);
    }
    safeSetTimeout(() => {
      advance(rating);
    }, 1200);
  }, [testInput, currentCard, testResult, advance, safeSetTimeout]);

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
          const map: Record<string, Rating> = {
            "1": "again",
            "2": "hard",
            "3": "good",
            "4": "easy",
          };
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
        if (e.key === "Enter" && testInput.trim() && !testResult) {
          e.preventDefault();
          submitTestAnswer();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    flipped,
    currentCard,
    sessionDone,
    advance,
    mode,
    testInput,
    testResult,
    submitTestAnswer,
    choiceLocked,
    choiceOptions,
    submitChoice,
  ]);

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
  const learningCount = stats?.learning ?? 0;
  const newCount = stats?.new ?? 0;
  const knownCount = stats?.known ?? 0;
  const mastery = stats?.mastery ?? 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
      <Header />
      <main className="flex-1 fc-page">
        <div className="fc-study">
          {/* ── Top bar: back · title · icon · master progress ── */}
          <header className="fc-study-header">
            <Link href="/flashcards" className="fc-study-back">
              <ArrowLeft size={13} /> Thư viện
            </Link>
            <div className="fc-study-title-block">
              <div className="flex items-center gap-2">
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
                <h1 className="fc-study-title">{set.name}</h1>
              </div>
              <p className="fc-study-sub">
                {total === 0
                  ? "Không có thẻ nào cần ôn lúc này"
                  : sessionDone
                    ? `Hoàn thành ${reviewedCount}/${total} thẻ · ${mastery}% đã thuộc`
                    : `Thẻ ${currentIndex + 1}/${total}`}
              </p>
            </div>
            <div className="fc-study-mastery">
              <div className="fc-study-mastery-num">{mastery}%</div>
              <div className="fc-study-mastery-lbl">Đã thuộc</div>
            </div>
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
              mastery={mastery}
              onRestart={() => router.push(`/flashcards/${encodeURIComponent(setId)}`)}
            />
          ) : total === 0 ? (
            <div className="fc-empty">
              <div className="fc-empty-icon">
                <Trophy size={22} />
              </div>
              <p style={{ margin: 0 }}>
                Tuyệt vời! Hiện không có thẻ nào cần ôn. Hãy thêm bộ thẻ mới.
              </p>
              <button
                type="button"
                className="fc-btn fc-btn-ghost mt-3"
                onClick={() => {
                  if (
                    typeof window !== "undefined" &&
                    window.confirm("Xóa toàn bộ tiến độ SRS của bộ thẻ này?")
                  ) {
                    resetSetProgress(set.id);
                    window.dispatchEvent(new Event("qthtm:flashcard-progress-changed"));
                    setStats(getSetStats(set.id, set.cards.length));
                  }
                }}
                title="Xóa toàn bộ SRS state cho bộ thẻ này"
              >
                <XCircle size={13} /> Xóa tiến độ
              </button>
            </div>
          ) : currentCard ? (
            <div className="fc-study-grid">
              {/* ── Left: card stage + actions ── */}
              <div className="fc-study-main">
                <div className="fc-card-stage">
                  <div
                    className={`fc-card ${mode === "flip" && flipped ? "is-flipped" : ""} ${mode === "choice" && choiceLocked ? "is-flipped" : ""}`}
                    onClick={() => {
                      if (mode === "choice") return;
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
                      <div className="fc-card-top-row">
                        <span className="fc-card-label">
                          {mode === "test"
                            ? "Gõ nghĩa của từ này"
                            : mode === "choice"
                              ? "Chọn nghĩa đúng"
                              : "Mặt trước"}
                        </span>
                        {currentCard.pronunciation && (
                          <span className="fc-card-pron">{currentCard.pronunciation}</span>
                        )}
                      </div>
                      <div className="fc-card-content">
                        <span className="fc-card-front">{currentCard.front}</span>
                      </div>
                      <div className="fc-card-bottom-row">
                        <SpeakerButton text={currentCard.front} compact />
                        {mode === "flip" && (
                          <span className="fc-card-hint">
                            Bấm thẻ hoặc nhấn <kbd style={kbdStyle}>Space</kbd>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="fc-card-face fc-card-face-back">
                      <div className="fc-card-top-row">
                        <span className="fc-card-label fc-card-label-back">Mặt sau</span>
                        {currentCard.pronunciation && (
                          <span className="fc-card-pron">{currentCard.pronunciation}</span>
                        )}
                      </div>
                      <div className="fc-card-content">
                        <p className="fc-card-back">{currentCard.back}</p>
                        {currentCard.example && (
                          <p className="fc-card-example">&ldquo;{currentCard.example}&rdquo;</p>
                        )}
                      </div>
                      <div className="fc-card-bottom-row">
                        <SpeakerButton text={currentCard.back} label="Nghe dịch nghĩa" compact />
                        <span className="fc-card-hint">
                          Phím <kbd style={kbdStyle}>1</kbd>–<kbd style={kbdStyle}>4</kbd> để đánh
                          giá
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {mode === "test" ? (
                  <TestAnswerPanel
                    input={testInput}
                    setInput={setTestInput}
                    result={testResult}
                    onSubmit={submitTestAnswer}
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
                      kbd="1"
                    />
                    <RateButton
                      variant="hard"
                      label="Khó"
                      interval={previews.hard}
                      onClick={() => advance("hard")}
                      kbd="2"
                    />
                    <RateButton
                      variant="good"
                      label="Tốt"
                      interval={previews.good}
                      onClick={() => advance("good")}
                      kbd="3"
                    />
                    <RateButton
                      variant="easy"
                      label="Dễ"
                      interval={previews.easy}
                      onClick={() => advance("easy")}
                      kbd="4"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="fc-btn fc-btn-primary fc-flip-cta"
                    onClick={() => setFlipped(true)}
                  >
                    <Repeat size={14} /> Lật thẻ để xem đáp án
                  </button>
                )}
              </div>

              {/* ── Right: sidebar (stats, mode, hints) ── */}
              <aside className="fc-study-side">
                {/* Stats tile */}
                <div className="fc-side-card">
                  <div className="fc-side-card-title">
                    <BookOpen size={13} /> Thống kê bộ thẻ
                  </div>
                  <div className="fc-side-stats">
                    <div className="fc-side-stat">
                      <div className="fc-side-stat-num">{total}</div>
                      <div className="fc-side-stat-lbl">Cần ôn</div>
                    </div>
                    <div className="fc-side-stat">
                      <div className="fc-side-stat-num" style={{ color: "#fbbf24" }}>
                        {learningCount}
                      </div>
                      <div className="fc-side-stat-lbl">Đang học</div>
                    </div>
                    <div className="fc-side-stat">
                      <div className="fc-side-stat-num" style={{ color: "#60a5fa" }}>
                        {newCount}
                      </div>
                      <div className="fc-side-stat-lbl">Mới</div>
                    </div>
                    <div className="fc-side-stat">
                      <div className="fc-side-stat-num" style={{ color: "#34d399" }}>
                        {knownCount}
                      </div>
                      <div className="fc-side-stat-lbl">Đã thuộc</div>
                    </div>
                  </div>
                </div>

                {/* Mode toggle */}
                <div className="fc-side-card">
                  <div className="fc-side-card-title">
                    <Flame size={13} /> Chế độ học
                  </div>
                  <div className="fc-mode-stack">
                    <button
                      type="button"
                      aria-pressed={mode === "flip"}
                      className={`fc-mode-stack-btn ${mode === "flip" ? "is-active" : ""}`}
                      onClick={() => setMode("flip")}
                    >
                      <Repeat size={14} aria-hidden="true" />
                      <div className="flex flex-col items-start">
                        <span className="fc-mode-stack-title">Lật thẻ</span>
                        <span className="fc-mode-stack-sub">Truyền thống</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-pressed={mode === "test"}
                      className={`fc-mode-stack-btn ${mode === "test" ? "is-active" : ""}`}
                      onClick={() => setMode("test")}
                    >
                      <PencilLine size={14} aria-hidden="true" />
                      <div className="flex flex-col items-start">
                        <span className="fc-mode-stack-title">Kiểm tra</span>
                        <span className="fc-mode-stack-sub">Gõ nghĩa</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-pressed={mode === "choice"}
                      className={`fc-mode-stack-btn ${mode === "choice" ? "is-active" : ""}`}
                      onClick={() => setMode("choice")}
                    >
                      <ListTree size={14} aria-hidden="true" />
                      <div className="flex flex-col items-start">
                        <span className="fc-mode-stack-title">Trắc nghiệm</span>
                        <span className="fc-mode-stack-sub">Chọn 1/4</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Keyboard hint */}
                <div className="fc-side-card fc-side-card-hint">
                  <div className="fc-side-card-title">
                    <Clock size={13} /> Phím tắt
                  </div>
                  <ul className="fc-kbd-list">
                    <li>
                      <kbd style={kbdStyle}>Space</kbd> lật thẻ
                    </li>
                    <li>
                      <kbd style={kbdStyle}>1</kbd>–<kbd style={kbdStyle}>4</kbd> đánh giá sau khi
                      lật
                    </li>
                    <li>
                      <kbd style={kbdStyle}>Enter</kbd> nộp bài (test mode)
                    </li>
                    <li>
                      <kbd style={kbdStyle}>1</kbd>–<kbd style={kbdStyle}>4</kbd> chọn đáp án
                      (choice mode)
                    </li>
                  </ul>
                </div>

                {/* Mastery */}
                <div className="fc-side-card">
                  <div className="fc-side-card-title">
                    <TrendingUp size={13} /> Tiến độ thuộc bài
                  </div>
                  <div className="fc-mastery-bar-wrap">
                    <div className="fc-mastery-bar">
                      <div className="fc-mastery-bar-fill" style={{ width: `${mastery}%` }} />
                    </div>
                    <div className="fc-mastery-bar-meta">
                      <span>
                        <strong>{mastery}%</strong> đã thuộc
                      </span>
                      <span style={{ color: "#94a3b8" }}>
                        {Math.max(
                          0,
                          set.cards.length - Math.round((mastery / 100) * set.cards.length),
                        )}{" "}
                        thẻ còn yếu
                      </span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
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
  kbd,
}: {
  variant: "again" | "hard" | "good" | "easy";
  label: string;
  interval: string;
  onClick: () => void;
  kbd: string;
}) {
  return (
    <button type="button" className={`fc-rate-btn fc-rate-${variant}`} onClick={onClick}>
      <div className="fc-rate-btn-row">
        <span className="fc-rate-label">{label}</span>
        <kbd className="fc-rate-kbd">{kbd}</kbd>
      </div>
      <span className="fc-rate-interval">{interval}</span>
    </button>
  );
}

function SessionSummary({
  reviewed,
  correct,
  mastery,
  onRestart,
}: {
  reviewed: number;
  correct: number;
  mastery: number;
  onRestart: () => void;
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
  compact = false,
}: {
  text: string;
  label?: string;
  compact?: boolean;
}) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
      className={`fc-speaker-btn ${speaking ? "is-speaking" : ""} ${compact ? "fc-speaker-btn-compact" : ""}`}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <Volume2 size={compact ? 12 : 15} />
      {!compact && <span>{speaking ? "Đang phát…" : label}</span>}
    </button>
  );
}

function TestAnswerPanel({
  input,
  setInput,
  result,
  onSubmit,
}: {
  input: string;
  setInput: (s: string) => void;
  result: null | { score: number; bestMatch: string };
  onSubmit: () => void;
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
          <span
            className="fc-test-pct"
            style={{ background: `${tone.color}22`, color: tone.color }}
          >
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
        Gõ nghĩa (có thể không dấu) và nhấn <kbd style={kbdStyle}>Enter</kbd>. Sai chính tả nhẹ vẫn
        được tính điểm.
      </p>
    </div>
  );
}

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
              <CheckCircle2 size={14} /> Chính xác! Đáp án là <strong>{correct}</strong>.
            </>
          ) : (
            <>
              <XCircle size={14} /> Chưa đúng. Đáp án là <strong>{correct}</strong>.
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
