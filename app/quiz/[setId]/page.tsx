"use client";
import { useRouter } from "next/navigation";
import { use, useEffect, useState, useCallback, useRef } from "react";
import { getQuizState, saveQuizState, clearQuizState, getPlayerName, setPlayerName } from "@/lib/storage";
import { QuizState, QuizResult, Question } from "@/lib/types";
import { saveResult } from "@/lib/storage";
import { isFirebaseConfigured } from "@/lib/firebase";
import { getQuizSet } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { playSfx } from "@/lib/sound";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuizQuestion from "@/components/QuizQuestion";
import ProgressBar from "@/components/ProgressBar";
import IELTSReadingView from "@/components/IELTSReadingView";
import IELTSSpeakingView from "@/components/IELTSSpeakingView";
import { ArrowLeft, ArrowRight, Send, Clock, AlertCircle, Zap, CheckCircle2, Lock, LogIn, Mic, RotateCcw, SendHorizontal } from "lucide-react";

const PER_QUESTION_SECONDS = 60;
const TOTAL_MINUTES = 30;
const TOTAL_SECONDS = TOTAL_MINUTES * 60;
const WARNING_THRESHOLD = 10;
const SECTION_WARNING_SECS = 120;

type PreQuizStep = "info" | "name";
type QuizSectionType = "reading" | "speaking";

export default function QuizPage({ params }: { params: Promise<{ setId: string }> }) {
  // Next.js 15 requires React.use() to unwrap the dynamic params Promise
  // before accessing its properties. Using `use()` synchronously suspends
  // the component until the Promise resolves, then we can read the props
  // directly on every render without managing intermediate state.
  const { setId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Quiz state
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [speakingAnswers, setSpeakingAnswers] = useState<(string | undefined)[]>([]);
  const [sectionType, setSectionType] = useState<QuizSectionType | null>(null);
  const [sectionDuration, setSectionDuration] = useState<number>(TOTAL_MINUTES);
  const [sectionPassage, setSectionPassage] = useState<string>("");
  const [sectionLabel, setSectionLabel] = useState<string>("");
  const [sectionSections, setSectionSections] = useState<{ id: string; passage?: string }[] | undefined>(undefined);
  const [quizActive, setQuizActive] = useState(false);

  // Pre-quiz modal
  const [preQuizStep, setPreQuizStep] = useState<PreQuizStep | null>(null);
  const [preQuizName, setPreQuizName] = useState("");
  const [preQuizShake, setPreQuizShake] = useState(false);

  // Loading
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Timers
  const [totalSecs, setTotalSecs] = useState(() => TOTAL_SECONDS);
  const [perQSecs, setPerQSecs] = useState(() => PER_QUESTION_SECONDS);
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const perQTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);
  const doSubmitRef = useRef<() => Promise<void>>(async () => {});
  // Ensures the pre-quiz bootstrap effect below runs exactly once per
  // setId, even when `user` / `authLoading` references churn.
  const initRanRef = useRef<string | null>(null);

  // Initialize: generate quiz questions and show pre-quiz flow.
// Runs exactly once per setId change. We intentionally do NOT depend on
// `user` / `authLoading` directly here — auth state is reconciled via the
// pre-quiz modal handlers. Depending on those values caused infinite render
// loops because `useAuth()` returns a fresh object reference on each render.
useEffect(() => {
  /* eslint-disable react-hooks/set-state-in-effect -- pre-quiz state depends on the resolved async params + auth; cannot be moved to a handler without breaking the mount-time pre-quiz modal. */
  // Guard: skip if we've already initialized for this setId, OR if the quiz
  // is already running (the init effect must never re-assert the pre-quiz
  // step while a quiz is in progress).
  if (quizActive) return;
  if (initRanRef.current === setId) return;
  initRanRef.current = setId;
  // Generate questions from setId (always, even if resuming)
  // setId has been unwrapped via React.use() at the top of this component.
  // Strip IELTS sub-section suffix ("-reading", "-reading-2", "-speaking") plus legacy "-part-N" / "-mockN"
  const mainSetId = setId
    .replace(/-(reading|reading-2|speaking)$/, "")
    .split("-part-")[0]
    .split("-mock")[0];
  const mainSet = getQuizSet(mainSetId);
  let questions: Question[] = mainSet ? [...mainSet.questions] : [];
  let detectedSectionType: QuizSectionType | null = null;
  let detectedDuration = TOTAL_MINUTES;

  // Detect IELTS sub-section: ids look like "ielts-1-reading" / "ielts-1-speaking"
  if (mainSet && mainSet.sections && mainSet.sections.length > 0) {
    const matchedSection = mainSet.sections.find((s) => s.id === setId);
    if (matchedSection) {
      questions = [...matchedSection.questions];
      detectedSectionType = matchedSection.type;
      detectedDuration = matchedSection.duration || TOTAL_MINUTES;
      setSectionPassage(matchedSection.passage ?? "");
      setSectionLabel(matchedSection.name ?? "");
    } else {
      setSectionPassage("");
      setSectionLabel("");
    }
  } else if (setId.includes("-part-")) {
    const partNum = parseInt(setId.split("-part-")[1]) - 1;
    questions = mainSet ? mainSet.questions.slice(partNum * 20, partNum * 20 + 20) : [];
    setSectionPassage("");
    setSectionLabel("");
  } else if (setId.includes("-mock")) {
    questions = mainSet ? [...mainSet.questions].sort(() => Math.random() - 0.5).slice(0, 40) : [];
    setSectionPassage("");
    setSectionLabel("");
  }

  setSectionType(detectedSectionType);
  setSectionDuration(detectedDuration);
  // Keep the full sections list around as a fallback so the Reading view
  // can resolve its passage even if `sectionPassage` is stale or empty
  // for any reason (defensive against empty-card reports).
  setSectionSections(mainSet?.sections ?? undefined);

  const quizName = mainSet
    ? detectedSectionType
      ? `${mainSet.name} — ${detectedSectionType === "reading" ? "Reading" : "Speaking"}`
      : mainSet.name
    : "Bài thi";
  const generated: QuizState = {
    setId,
    setName: quizName,
    questions,
    currentIndex: 0,
    answers: new Array(questions.length).fill("-1"),
    speakingAnswers: new Array(questions.length).fill(undefined),
    startTime: Date.now(),
    playerName: "",
    sectionType: detectedSectionType ?? undefined,
  };
  setQuiz(generated);

  const saved = getQuizState();
  // Stale or empty saved state — clear it and fall through to pre-quiz modal
  if (saved && saved.questions.length === 0) {
    clearQuizState();
  } else if (saved && saved.setId === setId && saved.questions.length === questions.length && questions.length > 0) {
    // Validate: ensure saved question IDs still match current questions
    const idsMatch = questions.every((q, i) => q.id === saved.questions[i]?.id);
    if (idsMatch) {
      // Migrate legacy number[] to string[]
      const migrated: string[] = saved.answers.map((v) =>
        typeof v === "number" ? String(v) : v
      );
      setAnswers(migrated);
      setSpeakingAnswers((saved.speakingAnswers as (string | undefined)[] | undefined) ?? new Array(questions.length).fill(undefined));
      setCurrentIndex(saved.currentIndex);
      setPreQuizName(saved.playerName || "");
      // Resume the section-duration timer based on the original startTime so
      // refreshes don't reset the clock back to TOTAL_SECONDS.
      const elapsedSecs = Math.floor((Date.now() - saved.startTime) / 1000);
      const limit = detectedSectionType ? detectedDuration * 60 : TOTAL_SECONDS;
      setTotalSecs(Math.max(0, limit - elapsedSecs));
      setQuizActive(true);
      setIsReady(true);
      return;
    }
    // IDs don't match — stale saved state, clear it and start fresh
    clearQuizState();
  }

  // No saved state or different quiz — show pre-quiz modal.
  // Snapshot auth so the guard above doesn't have to re-run on every
  // auth listener tick.
  const currentUser = user;
  const currentAuthLoading = authLoading;
  if (currentUser) {
    if (currentUser.isAnonymous) {
      const savedName = getPlayerName();
      setPreQuizName(savedName);
      setPreQuizStep(savedName ? "info" : "name");
    } else {
      setPreQuizName(currentUser.displayName || "");
      setPreQuizStep("info");
    }
  } else if (!currentAuthLoading) {
    setPreQuizStep(null);
    setQuizActive(false);
  }
  setIsReady(true);
  /* eslint-enable react-hooks/set-state-in-effect */
}, [setId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Total timer
  useEffect(() => {
    if (!quizActive || !quiz) return;
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    totalTimerRef.current = setInterval(() => {
      setTotalSecs((prev) => {
        if (prev <= 1) {
          clearInterval(totalTimerRef.current!);
          totalTimerRef.current = null;
          doSubmitRef.current();
          return 0;
        }
        // Final 10 seconds — play the ticking chime so the player hears
        // the time slipping away without having to look at the pill.
        if (prev <= 11) playSfx("tick");
        return prev - 1;
      });
    }, 1000);
    return () => { if (totalTimerRef.current) clearInterval(totalTimerRef.current); };
  }, [quizActive, quiz, sectionType, sectionDuration]);

  // Per-question timer reset on question change (QTHTM only)
  useEffect(() => {
    if (!quizActive) return;
    if (sectionType) return; // IELTS uses total timer only
    if (perQTimerRef.current) clearInterval(perQTimerRef.current);
    perQTimerRef.current = setInterval(() => {
      setPerQSecs((prev) => {
        if (prev <= 1) {
          setCurrentIndex((ci) => {
            const next = Math.min(ci + 1, (quiz?.questions.length ?? 1) - 1);
            if (next >= (quiz?.questions.length ?? 1) - 1) {
              clearInterval(perQTimerRef.current!);
              perQTimerRef.current = null;
            }
            return next;
          });
          return PER_QUESTION_SECONDS;
        }
        // Last 3 seconds of each question — heartbeat tick.
        if (prev <= 4) playSfx("tick");
        return prev - 1;
      });
    }, 1000);
    return () => { if (perQTimerRef.current) clearInterval(perQTimerRef.current); };
  }, [currentIndex, quizActive, sectionType]);

  // Focus name input
  useEffect(() => {
    if (preQuizStep === "name" && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [preQuizStep]);

  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return; // prevent double submit (timer + manual click)
    if (!quiz) return;
    submittedRef.current = true;
    // Stop timers
    if (totalTimerRef.current) { clearInterval(totalTimerRef.current); totalTimerRef.current = null; }
    if (perQTimerRef.current) { clearInterval(perQTimerRef.current); perQTimerRef.current = null; }
    clearQuizState();

    const timeSpent = Math.round((Date.now() - quiz.startTime) / 1000);
    const aAnswers: string[] = answers;
    const questions = quiz.questions;
    let correctCount = 0, wrongCount = 0;
    for (let i = 0; i < aAnswers.length; i++) {
      if (aAnswers[i] === "-1") continue;
      const q = questions[i];
      if (q.type === "matching" || q.type === "summary") {
        // Matching/Summary answer is stored as a JSON map { itemIdx: optIdx }.
        // Grade "correct" only when ALL items are answered AND every selected
        // option index matches the corresponding matchCorrect entry.
        let parsed: Record<string, number> | null = null;
        try {
          const v = JSON.parse(aAnswers[i]);
          if (v && typeof v === "object" && !Array.isArray(v)) parsed = v;
        } catch {
          parsed = null;
        }
        const items = q.matchItems ?? [];
        const correct = q.matchCorrect ?? [];
        if (parsed && Object.keys(parsed).length === items.length) {
          let allCorrect = true;
          for (let k = 0; k < items.length; k++) {
            const sel = parsed[String(k)];
            const optLetter = q.matchOptions?.[sel]?.split(".")[0] ?? "";
            if (optLetter !== correct[k]) { allCorrect = false; break; }
          }
          if (allCorrect) correctCount++;
          else wrongCount++;
        } else {
          // Partial or malformed answer — counts as wrong (not "unanswered")
          wrongCount++;
        }
      } else {
        // MCQ: answer is the chosen option index 0-3
        const chosen = parseInt(aAnswers[i], 10);
        if (typeof q.correct === "number" && chosen === q.correct) correctCount++;
        else wrongCount++;
      }
    }
    // For IELTS Speaking: don't compute score — they are self-graded
    const isIeltsSpeaking = sectionType === "speaking";
    const score = isIeltsSpeaking ? 0 : correctCount * 10;
    const percentage = isIeltsSpeaking
      ? 0
      : quiz.questions.length > 0
        ? Math.round((correctCount / quiz.questions.length) * 100)
        : 0;

    const finalName =
      (user && !user.isAnonymous ? user.displayName : null) ||
      quiz.playerName ||
      preQuizName ||
      "Người chơi";

    const result: QuizResult = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      playerName: finalName,
      setId: quiz.setId,
      setName: quiz.setName,
      score,
      totalQuestions: quiz.questions.length,
      correctCount,
      wrongCount,
      percentage,
      answers: [...answers],
      timeSpent,
      date: new Date().toISOString(),
      sectionType: sectionType ?? undefined,
      speakingAnswers: sectionType === "speaking" ? [...speakingAnswers] : undefined,
    };

    sessionStorage.setItem("qthtm_result", JSON.stringify(result));
    sessionStorage.setItem("qthtm_questions", JSON.stringify(quiz.questions));

    let cloudSaved = false;
    try {
      // Give cloud save a generous window (Firestore on first write can be slow
      // due to cold-start auth + index warmup). We never *block* the result
      // page on it — localStorage already has the full record, and any partial
      // cloud write that lands after this point will be overwritten by the
      // pending-sync queue on the next page load.
      const saveRes = (await Promise.race([
        saveResult(result),
        new Promise<undefined>((r) => setTimeout(() => r(undefined), 8000)),
      ])) as { cloud: boolean; local: boolean } | undefined;
      cloudSaved = saveRes?.cloud ?? false;
    } catch (err) {
      console.warn("[quiz] saveResult failed:", err);
    }
    // If the cloud save didn't finish in time, kick off a non-blocking retry
    // so Firestore can catch up once auth + indexes are warm.
    if (!cloudSaved && isFirebaseConfigured) {
      saveResult(result).catch((err) =>
        console.warn("[quiz] background saveResult retry failed:", err),
      );
    }
    sessionStorage.setItem("qthtm_cloud_saved", JSON.stringify(cloudSaved));

    router.push("/result");
  }, [quiz, answers, speakingAnswers, user, preQuizName, router, sectionType]);

  // Keep ref in sync so async timer callbacks always use latest version
  useEffect(() => {
    doSubmitRef.current = doSubmit;
  }, [doSubmit]);

  // If the user signs out mid-quiz, drop back to the pre-quiz gate so we don't
  // leak a half-finished session whose results can't be persisted to cloud.
  useEffect(() => {
    if (!user && quizActive) {
      submittedRef.current = false;
      if (totalTimerRef.current) { clearInterval(totalTimerRef.current); totalTimerRef.current = null; }
      if (perQTimerRef.current) { clearInterval(perQTimerRef.current); perQTimerRef.current = null; }
      setQuizActive(false);
      clearQuizState();
      setPreQuizStep(null);
    }
  }, [user, quizActive]);

  const handleSelectAnswer = useCallback((itemIdx: number, optIdx: number) => {
    playSfx("click");
    setAnswers((prev) => {
      const next = [...prev];
      const q = quiz?.questions[currentIndex];
      if (!q) return prev;
      if (q.type === "matching" || q.type === "summary") {
        let current: Record<string, number> = {};
        try {
          if (prev[currentIndex] !== "-1" && prev[currentIndex]) {
            const parsed = JSON.parse(prev[currentIndex]);
            if (parsed && typeof parsed === "object") current = parsed;
          }
        } catch {
          current = {};
        }
        current[String(itemIdx)] = optIdx;
        next[currentIndex] = JSON.stringify(current);
      } else {
        next[currentIndex] = String(optIdx);
      }
      return next;
    });
  }, [currentIndex, quiz]);

  const handleSpeakingAnswer = useCallback((idx: number, value: string | undefined) => {
    setSpeakingAnswers((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }, []);

  // Persist audio answers to localStorage so they survive page refresh.
  useEffect(() => {
    if (!quiz) return;
    saveQuizState({
      ...quiz,
      speakingAnswers,
    });
  }, [speakingAnswers, quiz]);

  const goNext = useCallback(() => {
    if (!quiz) return;
    playSfx("click");
    setCurrentIndex((prev) => Math.min(prev + 1, quiz.questions.length - 1));
  }, [quiz]);

  const goPrev = useCallback(() => {
    playSfx("click");
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleSubmit = useCallback(async () => {
    // QTHTM-only: show a native confirm if some questions are unanswered.
    // IELTS renders its own in-page confirmation modal in IELTSReadingView /
    // IELTSSpeakingView, so skip the browser confirm for those sections.
    if (!sectionType) {
      const unanswered = answers.filter((a) => a === "-1").length;
      if (unanswered > 0) {
        playSfx("click");
        const confirmed = window.confirm(
          `Bạn còn ${unanswered} câu chưa trả lời. Bạn có chắc muốn nộp bài không?`,
        );
        if (!confirmed) {
          playSfx("click");
          return;
        }
      }
    }
    await doSubmit();
  }, [answers, doSubmit, sectionType]);

  // Keyboard shortcuts (only when quiz is active, QTHTM only)
  useEffect(() => {
    if (!quizActive || preQuizStep !== null) return;
    if (sectionType) return; // IELTS uses its own keyboard handling inside views
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); goNext(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      else if (e.key >= "1" && e.key <= "4") {
        const idx = parseInt(e.key) - 1;
        if (quiz && idx < quiz.questions[currentIndex]?.answers.length) handleSelectAnswer(0, idx);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quizActive, preQuizStep, goNext, goPrev, handleSelectAnswer, currentIndex, quiz, sectionType]);

  // ── Helpers ─────────────────────────────────────────────
  const fmt = (secs: number) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;
  const totalColor = totalSecs <= 60 ? "#ef4444" : totalSecs <= 180 ? "#f59e0b" : "#10b981";
  const perQColor = perQSecs <= WARNING_THRESHOLD ? "#ef4444" : "#06b6d4";
  // Surface a polite warning banner when the total clock is about to run out,
  // both at 60s and at 10s so the player has time to wrap up.
  const timerWarning =
    totalSecs > 0 && totalSecs <= 10
      ? "warning-final"
      : totalSecs > 0 && totalSecs <= 60
        ? "warning-minute"
        : sectionType && totalSecs > 0 && totalSecs <= SECTION_WARNING_SECS
          ? "warning-section"
          : null;

  const handleNameConfirm = () => {
    if (!preQuizName.trim()) {
      setPreQuizShake(true);
      setTimeout(() => setPreQuizShake(false), 500);
      nameInputRef.current?.focus();
      playSfx("wrong");
      return;
    }
    playSfx("click");
    const name = preQuizName.trim();
    setPlayerName(name);

    const questions = quiz?.questions ?? [];
    const newState: QuizState = {
      setId: setId,
      setName: quiz?.setName ?? "Bài thi",
      questions,
      currentIndex: 0,
      answers: new Array(questions.length).fill("-1"),
      speakingAnswers: new Array(questions.length).fill(undefined),
      startTime: Date.now(),
      playerName: name,
      sectionType: sectionType ?? undefined,
    };
    setQuiz(newState);
    setAnswers(newState.answers.map(String));
    setSpeakingAnswers(newState.speakingAnswers ?? new Array(questions.length).fill(undefined));
    setCurrentIndex(0);
    setPreQuizName(name);
    setPreQuizStep(null);
    setQuizActive(true);
  };

  // ── Auth required (not logged in, no quiz saved) ─────────
  if (!authLoading && !user && preQuizStep === null && !quizActive) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl p-8 text-center animate-fade-slide-up"
            style={{ backgroundColor: "#111827", border: "1px solid #334155" }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <Lock size={28} style={{ color: "#ef4444" }} />
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: "#f1f5f9", fontFamily: "var(--font-orbitron)" }}>
              Cần đăng nhập
            </h2>
            <p className="text-sm mb-6" style={{ color: "#94a3b8" }}>
              Bạn cần đăng nhập trước khi bắt đầu làm bài thi để lưu kết quả.
            </p>
            <button onClick={() => { playSfx("click"); router.push("/") }}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
              style={{ backgroundColor: "#3b82f6", color: "#fff" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#2563eb"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#3b82f6"; }}>
              <LogIn size={14} /> Quay lại đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────
  if (!isReady || !quiz) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          {loadError ? (
            <div className="w-full max-w-sm rounded-2xl p-8 text-center animate-fade-slide-up"
              style={{ backgroundColor: "#111827", border: "1px solid #334155" }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <AlertCircle size={24} style={{ color: "#ef4444" }} />
              </div>
              <h2 className="text-base font-bold mb-2" style={{ color: "#f1f5f9", fontFamily: "var(--font-orbitron)" }}>
                Không tải được bộ câu hỏi
              </h2>
              <p className="text-sm mb-5" style={{ color: "#94a3b8" }}>
                Có thể kết nối mạng đang chậm hoặc bộ đề chưa sẵn sàng. Vui lòng thử lại hoặc quay về trang chủ.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { playSfx("click"); setLoadError(false); setIsReady(false); router.refresh(); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: "#3b82f6", color: "#fff" }}
                >
                  Thử lại
                </button>
                <button
                  type="button"
                  onClick={() => { playSfx("click"); router.push("/"); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: "transparent", color: "#94a3b8", border: "1px solid #334155" }}
                >
                  Về trang chủ
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="animate-pulse-glow px-6 py-3 rounded-xl text-sm" style={{ color: "#60a5fa", fontFamily: "var(--font-jetbrains)" }}>
                Đang tải câu hỏi...
              </div>
              <button
                type="button"
                onClick={() => { playSfx("click"); setLoadError(true); }}
                className="text-xs underline"
                style={{ color: "#64748b" }}
              >
                Tải quá lâu? Báo lỗi
              </button>
            </div>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  const currentQ = quiz.questions[currentIndex];
  const answeredCount = answers.filter((a) => a !== "-1").length;
  const isLast = currentIndex === quiz.questions.length - 1;

  if (!currentQ) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ color: "#f1f5f9" }}>
        <div className="text-center max-w-md">
          <p className="text-lg font-semibold mb-2">Không có câu hỏi nào trong phần này.</p>
          <p className="text-sm mb-6" style={{ color: "#94a3b8" }}>Bộ câu hỏi IELTS đang được cập nhật. Vui lòng quay lại sau.</p>
          <button
            onClick={() => { playSfx("click"); router.push("/") }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: "#3b82f6", color: "#fff" }}
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  // ── Pre-quiz: info confirmation ────────────────────────
  if (preQuizStep === "info") {
    // IELTS-style: brand new academic intro modal
    if (sectionType) {
      const secLabel = sectionType === "reading" ? "Reading" : "Speaking";
      const taskTypes =
        sectionType === "reading"
          ? "Multiple choice · True/False/Not Given · Matching"
          : "Long-turn speaking prompts with bullet hints";
      return (
        <div className="ielts-page">
          <div className="ielts-intro">
            <div className="ielts-intro-card animate-fade-slide-up">
              <div className="ielts-intro-banner">
                <span className="ielts-intro-eyebrow">
                  <CheckCircle2 size={11} /> IELTS Academic Test
                </span>
                <h1 className="ielts-intro-title">{quiz.setName}</h1>
                <p className="ielts-intro-sub">
                  Bạn sắp bắt đầu phần thi {secLabel} theo format chuẩn IDP /
                  British Council.
                </p>
              </div>

              <div className="ielts-intro-section">
                <p className="ielts-intro-section-title">Format</p>
                <div className="ielts-info-grid">
                  <div className="ielts-info-cell">
                    <p className="ielts-info-cell-label">Section</p>
                    <p className="ielts-info-cell-value">{secLabel}</p>
                  </div>
                  <div className="ielts-info-cell">
                    <p className="ielts-info-cell-label">Duration</p>
                    <p className="ielts-info-cell-value">
                      {sectionDuration} minutes
                    </p>
                  </div>
                  <div className="ielts-info-cell" style={{ gridColumn: "1 / -1" }}>
                    <p className="ielts-info-cell-label">Task types</p>
                    <p className="ielts-info-cell-value" style={{ fontSize: 14 }}>
                      {taskTypes}
                    </p>
                  </div>
                </div>
              </div>

              <div className="ielts-intro-section">
                <p className="ielts-intro-section-title">Instructions</p>
                {sectionType === "reading" ? (
                  <p className="ielts-intro-instructions">
                    Đọc kỹ đoạn văn bên trái, sau đó chọn đáp án đúng nhất cho mỗi câu hỏi. Có thể tua lại đoạn văn bất kỳ lúc nào.
                  </p>
                ) : (
                  <>
                    <p className="ielts-intro-instructions" style={{ marginBottom: "12px" }}>
                      Đọc kỹ đề bài, lập dàn ý theo gợi ý, sau đó nhấn <strong style={{ color: "#60a5fa" }}>Start recording</strong> để ghi âm câu trả lời. Bạn có thể re-record nhiều lần.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {[
                        [<Mic size={13} key="icon" />, "Cho phep truy cap micro khi duoc yeu cau"],
                        [<RotateCcw size={13} key="icon" />, "Co the ghi lai nhieu lan neu chua zuf"],
                        [<SendHorizontal size={13} key="icon" />, "Nop bai khi da ghi xong tat ca cac cau"],
                      ].map(([icon, text], idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#94a3b8" }}>
                          <span style={{ width: "20px", display: "flex", justifyContent: "center", color: "#3b82f6" }}>{icon}</span>
                          <span>{text}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="ielts-intro-form">
                <div>
                  <label className="ielts-intro-label" htmlFor="ielts-candidate-name">
                    Candidate name
                  </label>
                  <input
                    id="ielts-candidate-name"
                    type="text"
                    value={preQuizName}
                    onChange={(e) => setPreQuizName(e.target.value.slice(0, 40))}
                    placeholder="Nguyen Van A"
                    className={`ielts-intro-input ${preQuizShake && !preQuizName.trim() ? "is-error" : ""}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (preQuizName.trim()) {
                          handleNameConfirm();
                        } else {
                          setPreQuizShake(true);
                          setTimeout(() => setPreQuizShake(false), 500);
                        }
                      }
                    }}
                  />
                  {preQuizShake && !preQuizName.trim() && (
                    <p className="ielts-intro-error">
                      Please enter your full name to continue.
                    </p>
                  )}
                </div>

                <div className="ielts-intro-actions">
                  <button
                    className="ielts-btn ielts-btn-secondary"
                    onClick={() => { playSfx("click"); router.push("/") }}
                  >
                    Cancel
                  </button>
                  <button
                    className="ielts-btn ielts-btn-primary"
                    onClick={() => {
                      if (!preQuizName.trim()) {
                        setPreQuizShake(true);
                        setTimeout(() => setPreQuizShake(false), 500);
                        return;
                      }
                      handleNameConfirm();
                    }}
                  >
                    <Zap size={14} /> Start test
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // QTHTM-style: original info modal
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-8 animate-fade-slide-up"
            style={{ backgroundColor: "#111827", border: "1px solid #334155" }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ backgroundColor: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <CheckCircle2 size={26} style={{ color: "#10b981" }} />
            </div>
            <h2 className="text-xl font-bold text-center mb-2"
              style={{ color: "#f1f5f9", fontFamily: "var(--font-orbitron)" }}>
              San sang bat dau!
            </h2>
            <p className="text-sm text-center mb-6" style={{ color: "#94a3b8" }}>
              Xac nhan thong tin truoc khi vao thi
            </p>

            <div className="space-y-3 mb-4">
              <InfoRow icon={<Zap size={14} style={{ color: "#3b82f6" }} />} label="Bai thi" value={quiz.setName} iconBg="rgba(59,130,246,0.1)" />
              <InfoRow icon={<AlertCircle size={14} style={{ color: "#06b6d4" }} />} label="So cau hoi" value={`${quiz.questions.length} cau`} iconBg="rgba(6,182,212,0.1)" />
              <InfoRow icon={<Clock size={14} style={{ color: "#f59e0b" }} />} label="Thoi gian" value={`${TOTAL_MINUTES} phut tong · ${PER_QUESTION_SECONDS}s/cau`} iconBg="rgba(245,158,11,0.1)" />
            </div>

            {/* Name input — always editable */}
            <div className="mb-6">
              <label className="block text-xs font-medium mb-2" style={{ color: "#94a3b8" }}>
                Ten thi sinh
              </label>
              <input
                type="text"
                value={preQuizName}
                onChange={(e) => setPreQuizName(e.target.value)}
                placeholder="Nhap ten cua ban"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
                style={{
                  backgroundColor: "rgba(15,23,42,0.8)",
                  border: `1px solid ${preQuizShake && !preQuizName.trim() ? "#ef4444" : "rgba(51,65,85,0.6)"}`,
                  color: "#f1f5f9",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = preQuizShake && !preQuizName.trim() ? "#ef4444" : "rgba(51,65,85,0.6)"; }}
              />
              {preQuizShake && !preQuizName.trim() && (
                <p className="text-xs mt-1" style={{ color: "#ef4444" }}>Vui long nhap ten thi sinh</p>
              )}
            </div>

            <button
              onClick={() => {
                if (!preQuizName.trim()) {
                  setPreQuizShake(true);
                  setTimeout(() => setPreQuizShake(false), 600);
                  return;
                }
                handleNameConfirm();
              }}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
              style={{ backgroundColor: "#10b981", color: "#fff" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#059669"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#10b981"; }}>
              <Zap size={15} /> Bat dau lam bai
            </button>
            <button onClick={() => { playSfx("click"); router.push("/") }}
              className="w-full py-2.5 mt-2 rounded-xl text-sm font-medium transition-all duration-200"
              style={{ backgroundColor: "transparent", color: "#64748b", border: "1px solid rgba(51,65,85,0.4)" }}>
              Huy
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Pre-quiz: name input ─────────────────────────────────
  if (preQuizStep === "name") {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl p-6 animate-fade-slide-up"
            style={{ backgroundColor: "#111827", border: "1px solid #334155" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(59,130,246,0.12)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: "#e2e8f0" }}>Nhap ten cua ban</h3>
                <p className="text-xs mt-0.5" style={{ color: "#475569" }}>Ten se hien thi tren bang xep hang</p>
              </div>
            </div>

            <input ref={nameInputRef} type="text" value={preQuizName}
              onChange={(e) => setPreQuizName(e.target.value.slice(0, 30))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleNameConfirm(); } }}
              placeholder="VD: Nguyen Van A"
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all duration-150 mb-4"
              style={{
                backgroundColor: "rgba(15,23,42,0.8)",
                border: `1px solid ${preQuizShake ? "#ef4444" : "rgba(51,65,85,0.5)"}`,
                color: "#e2e8f0",
              }}
            />

            <div className="flex gap-2">
              <button className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                style={{ backgroundColor: "rgba(30,41,59,0.6)", color: "#64748b", border: "1px solid rgba(51,65,85,0.4)" }}
                onClick={() => { playSfx("click"); router.push("/") }}>
                Huy
              </button>
              <button className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2"
                style={{ backgroundColor: "#3b82f6", color: "#fff" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#2563eb"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#3b82f6"; }}
                onClick={handleNameConfirm}>
                <Zap size={14} /> Bat dau
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz active ─────────────────────────────────────────
  // Dispatch: IELTS Reading view.
  // NOTE: this branches on `sectionType` alone — not on `quizActive` — so the
  // themed view is shown for the entire lifetime of the quiz, including the
  // very first render before the timer effect starts. Previously we gated on
  // `quizActive &&`, which silently fell through to the generic view whenever
  // the unauth branch in the init effect set `quizActive` back to false.
  if (sectionType === "reading" && isReady) {
    try {
      return (
        <IELTSReadingView
          questions={quiz.questions}
          currentIndex={currentIndex}
          answers={answers}
          onSelectAnswer={handleSelectAnswer}
          onJump={setCurrentIndex}
          onPrev={goPrev}
          onNext={goNext}
          onSubmit={handleSubmit}
          totalSecs={totalSecs}
          setName={quiz.setName}
          passage={sectionPassage}
          passageLabel={sectionLabel}
          sections={sectionSections}
          setId={setId}
        />
      );
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error("[IELTSReadingView] render error:", err);
      }
      // Fall through to generic view
    }
  }

  // Dispatch: IELTS Speaking view (light academic theme)
  // See note above: branch on sectionType alone so the themed view shows even
  // for unauth users whose init branch sets quizActive=false.
  if (sectionType === "speaking" && isReady) {
    return (
      <IELTSSpeakingView
        questions={quiz.questions}
        currentIndex={currentIndex}
        audioAnswers={speakingAnswers}
        onAudioAnswer={handleSpeakingAnswer}
        onJump={setCurrentIndex}
        onPrev={goPrev}
        onNext={goNext}
        onSubmit={handleSubmit}
        totalSecs={totalSecs}
        setName={quiz.setName}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
      <Header />

      <div className="max-w-2xl mx-auto w-full px-4 py-6 flex-1 flex flex-col">
        {/* Info bar */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse-slow" style={{ backgroundColor: "#10b981" }} />
            <span className="text-xs font-medium" style={{ color: "#64748b", fontFamily: "var(--font-jetbrains)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {quiz.setName}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg text-xs font-bold"
              style={{ backgroundColor: `${perQColor}15`, border: `1px solid ${perQColor}40`, color: perQColor, fontFamily: "var(--font-jetbrains)" }}>
              <Clock size={11} />
              <span>{fmt(perQSecs)}</span>
            </div>
            <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg text-xs font-bold"
              style={{ backgroundColor: `${totalColor}15`, border: `1px solid ${totalColor}40`, color: totalColor, fontFamily: "var(--font-jetbrains)" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{fmt(totalSecs)}</span>
            </div>
          </div>
        </div>

        {/* Timer warning banner — accessible live region for the last-minute heads-up. */}
        {timerWarning && (
          <div
            role={timerWarning === "warning-final" ? "alert" : "status"}
            aria-live={timerWarning === "warning-final" ? "assertive" : "polite"}
            className="mb-4 px-3 py-2 rounded-lg flex items-center gap-2 text-xs"
            style={{
              backgroundColor: timerWarning === "warning-final"
                ? "rgba(239,68,68,0.12)"
                : "rgba(245,158,11,0.10)",
              border: `1px solid ${timerWarning === "warning-final" ? "rgba(239,68,68,0.35)" : "rgba(245,158,11,0.3)"}`,
              color: timerWarning === "warning-final" ? "#fca5a5" : "#fcd34d",
            }}
          >
            <Clock size={13} aria-hidden="true" />
            <span>
              {timerWarning === "warning-final"
                ? `Sắp hết giờ — còn ${totalSecs}s, hệ thống sẽ tự động nộp bài.`
                : timerWarning === "warning-minute"
                  ? `Còn 1 phút — kiểm tra lại câu chưa trả lời.`
                  : `Còn khoảng ${Math.ceil(totalSecs / 60)} phút — hãy sắp xếp thời gian.`}
            </span>
          </div>
        )}

        <div className="mb-6">
          <ProgressBar total={quiz.questions.length} answered={answeredCount} />
        </div>

        <div className="flex-1">
          <QuizQuestion
            key={currentIndex}
            question={currentQ}
            index={currentIndex}
            total={quiz.questions.length}
            selectedAnswer={answers[currentIndex] ?? "-1"}
            onSelectAnswer={(idx) => handleSelectAnswer(0, idx)}
          />
        </div>

        <div className="mt-6 flex items-center gap-2" style={{ justifyContent: "space-between" }}>
          <button onClick={goPrev} disabled={currentIndex === 0}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor: "#1e293b", border: "1px solid #334155",
              color: currentIndex === 0 ? "#475569" : "#94a3b8",
              cursor: currentIndex === 0 ? "not-allowed" : "pointer",
            }}>
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Cau truoc</span>
          </button>

          <div className="flex items-center gap-1 flex-wrap justify-center" style={{ maxWidth: "100%", overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none", paddingBottom: 2 }}>
            {quiz.questions.map((_, i) => (
              <button key={i} onClick={() => { playSfx("click"); setCurrentIndex(i); }}
                className="rounded-md text-[9px] font-bold flex items-center justify-center transition-all duration-150 shrink-0"
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: i === currentIndex ? "#3b82f6" : answers[i] !== "-1" ? "rgba(16,185,129,0.2)" : "#1e293b",
                  border: i === currentIndex ? "1px solid #3b82f6" : "1px solid #334155",
                  color: i === currentIndex ? "#fff" : answers[i] !== "-1" ? "#10b981" : "#64748b",
                  fontFamily: "var(--font-jetbrains)",
                }}>
                {i + 1}
              </button>
            ))}
          </div>

          {isLast ? (
            <button onClick={handleSubmit}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{ backgroundColor: "#10b981", color: "#fff" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#059669"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#10b981"; }}>
              <Send size={16} />
              <span className="hidden sm:inline">Nop bai</span>
            </button>
          ) : (
            <button onClick={goNext}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200"
              style={{ backgroundColor: "#3b82f6", color: "#fff" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#2563eb"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#3b82f6"; }}>
              <span className="hidden sm:inline">Cau tiep</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

// Small helper component
function InfoRow({ icon, label, value, iconBg }: { icon: React.ReactNode; label: string; value: string; iconBg: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "rgba(15,23,42,0.6)", border: "1px solid rgba(51,65,85,0.3)" }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
        {icon}
      </div>
      <div>
        <p className="text-xs" style={{ color: "#64748b" }}>{label}</p>
        <p className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>{value}</p>
      </div>
    </div>
  );
}
