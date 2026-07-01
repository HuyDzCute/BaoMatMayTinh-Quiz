"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { getQuizState, clearQuizState, getPlayerName, setPlayerName } from "@/lib/storage";
import { QuizState, QuizResult, Question } from "@/lib/types";
import { saveResult } from "@/lib/storage";
import { getQuizSet } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import Header from "@/components/Header";
import QuizQuestion from "@/components/QuizQuestion";
import ProgressBar from "@/components/ProgressBar";
import { ArrowLeft, ArrowRight, Send, Clock, AlertCircle, Zap, CheckCircle2, Lock, LogIn } from "lucide-react";

const PER_QUESTION_SECONDS = 60;
const TOTAL_MINUTES = 30;
const TOTAL_SECONDS = TOTAL_MINUTES * 60;
const WARNING_THRESHOLD = 10;

type PreQuizStep = "info" | "name";

export default function QuizPage({ params }: { params: Promise<{ setId: string }> }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Quiz state
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizActive, setQuizActive] = useState(false);

  // Pre-quiz modal
  const [preQuizStep, setPreQuizStep] = useState<PreQuizStep | null>(null);
  const [preQuizName, setPreQuizName] = useState("");
  const [preQuizShake, setPreQuizShake] = useState(false);

  // Loading
  const [resolvedParams, setResolvedParams] = useState<{ setId: string } | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Timers
  const [totalSecs, setTotalSecs] = useState(TOTAL_SECONDS);
  const [perQSecs, setPerQSecs] = useState(PER_QUESTION_SECONDS);
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const perQTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    params.then((p) => setResolvedParams(p));
  }, [params]);

  // Initialize: generate quiz questions and show pre-quiz flow
  useEffect(() => {
    if (!resolvedParams) return;

    // Generate questions from setId (always, even if resuming)
    const setId = resolvedParams.setId;
    const mainSetId = setId.split("-part-")[0].split("-mock")[0];
    const mainSet = getQuizSet(mainSetId);
    let questions: Question[] = mainSet ? [...mainSet.questions] : [];

    if (setId.includes("-part-")) {
      const partNum = parseInt(setId.split("-part-")[1]) - 1;
      questions = mainSet ? mainSet.questions.slice(partNum * 20, partNum * 20 + 20) : [];
    } else if (setId.includes("-mock")) {
      questions = mainSet ? [...mainSet.questions].sort(() => Math.random() - 0.5).slice(0, 40) : [];
    }

    const quizName = mainSet ? mainSet.name : "Bai thi";
    const generated: QuizState = {
      setId,
      setName: quizName,
      questions,
      currentIndex: 0,
      answers: new Array(questions.length).fill(-1),
      startTime: Date.now(),
      playerName: "",
    };
    setQuiz(generated);

    const saved = getQuizState();
    if (saved && saved.setId === setId && saved.questions.length === questions.length) {
      // Validate: ensure saved question IDs still match current questions
      const idsMatch = questions.every((q, i) => q.id === saved.questions[i]?.id);
      if (idsMatch) {
        setAnswers(saved.answers);
        setCurrentIndex(saved.currentIndex);
        setPreQuizName(saved.playerName || "");
        setQuizActive(true);
        setIsReady(true);
        return;
      }
      // IDs don't match — stale saved state, clear it and start fresh
      clearQuizState();
    }

    // No saved state or different quiz — show pre-quiz modal
    if (user) {
      if (user.isAnonymous) {
        const savedName = getPlayerName();
        setPreQuizName(savedName);
        setPreQuizStep(savedName ? "info" : "name");
      } else {
        setPreQuizName(user.displayName || "");
        setPreQuizStep("info");
      }
    } else if (!authLoading) {
      setPreQuizStep(null);
      setQuizActive(false);
    }
    setIsReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams, user, authLoading]);

  // Total timer
  useEffect(() => {
    if (!quizActive || !quiz) return;
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    setTotalSecs(TOTAL_SECONDS);
    totalTimerRef.current = setInterval(() => {
      setTotalSecs((prev) => {
        if (prev <= 1) {
          clearInterval(totalTimerRef.current!);
          totalTimerRef.current = null;
          doSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (totalTimerRef.current) clearInterval(totalTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizActive, quiz]);

  // Per-question timer reset on question change
  useEffect(() => {
    if (!quizActive) return;
    setPerQSecs(PER_QUESTION_SECONDS);
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
        return prev - 1;
      });
    }, 1000);
    return () => { if (perQTimerRef.current) clearInterval(perQTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, quizActive]);

  // Focus name input
  useEffect(() => {
    if (preQuizStep === "name" && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [preQuizStep]);

  const doSubmit = useCallback(async () => {
    if (!quiz) return;
    // Stop timers
    if (totalTimerRef.current) { clearInterval(totalTimerRef.current); totalTimerRef.current = null; }
    if (perQTimerRef.current) { clearInterval(perQTimerRef.current); perQTimerRef.current = null; }
    clearQuizState();

    const timeSpent = Math.round((Date.now() - quiz.startTime) / 1000);
    const aAnswers: Array<number> = answers as Array<number>;
    const questions = quiz.questions as Array<{ correct: number }>;
    let correctCount = 0, wrongCount = 0;
    for (let i = 0; i < aAnswers.length; i++) {
      if (aAnswers[i] === -1) continue;
      if (aAnswers[i] === questions[i].correct) correctCount++;
      else wrongCount++;
    }
    const score = correctCount * 10;
    const percentage = quiz.questions.length > 0 ? Math.round((correctCount / quiz.questions.length) * 100) : 0;

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
    };

    sessionStorage.setItem("qthtm_result", JSON.stringify(result));
    sessionStorage.setItem("qthtm_questions", JSON.stringify(quiz.questions));

    let cloudSaved = false;
    try {
      const saveRes = await Promise.race([saveResult(result), new Promise((r) => setTimeout(r, 2500))]) as { cloud: boolean; local: boolean } | undefined;
      cloudSaved = saveRes?.cloud ?? false;
    } catch (err) {
      console.warn("[quiz] saveResult failed:", err);
    }
    sessionStorage.setItem("qthtm_cloud_saved", JSON.stringify(cloudSaved));

    router.push("/result");
  }, [quiz, answers, user, preQuizName, router]);

  const handleSelectAnswer = useCallback((idx: number) => {
    setAnswers((prev) => { const next = [...prev]; next[currentIndex] = idx; return next; });
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (!quiz) return;
    setCurrentIndex((prev) => Math.min(prev + 1, quiz.questions.length - 1));
  }, [quiz]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleSubmit = useCallback(async () => {
    const unanswered = answers.filter((a) => a === -1).length;
    if (unanswered > 0) {
      const confirmed = window.confirm(
        `Bạn còn ${unanswered} câu chưa trả lời. Bạn có chắc muốn nộp bài không?`
      );
      if (!confirmed) return;
    }
    await doSubmit();
  }, [answers, doSubmit]);

  // Keyboard shortcuts (only when quiz is active)
  useEffect(() => {
    if (!quizActive || preQuizStep !== null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); goNext(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      else if (e.key >= "1" && e.key <= "4") {
        const idx = parseInt(e.key) - 1;
        if (quiz && idx < quiz.questions[currentIndex]?.answers.length) handleSelectAnswer(idx);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quizActive, preQuizStep, goNext, goPrev, handleSelectAnswer, currentIndex, quiz]);

  // ── Helpers ─────────────────────────────────────────────
  const fmt = (secs: number) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;
  const totalColor = totalSecs <= 60 ? "#ef4444" : totalSecs <= 180 ? "#f59e0b" : "#10b981";
  const perQColor = perQSecs <= WARNING_THRESHOLD ? "#ef4444" : "#06b6d4";

  const handleNameConfirm = () => {
    if (!preQuizName.trim()) {
      setPreQuizShake(true);
      setTimeout(() => setPreQuizShake(false), 500);
      nameInputRef.current?.focus();
      return;
    }
    const name = preQuizName.trim();
    setPlayerName(name);

    const questions = quiz?.questions ?? [];
    const newState: QuizState = {
      setId: resolvedParams?.setId ?? "",
      setName: quiz?.setName ?? "Bài thi",
      questions,
      currentIndex: 0,
      answers: new Array(questions.length).fill(-1),
      startTime: Date.now(),
      playerName: name,
    };
    setQuiz(newState);
    setAnswers(newState.answers);
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
            <button onClick={() => router.push("/")}
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
  if (!isReady || !resolvedParams || !quiz) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse-glow px-6 py-3 rounded-xl text-sm" style={{ color: "#60a5fa", fontFamily: "var(--font-jetbrains)" }}>
            Đang tải câu hỏi...
          </div>
        </div>
      </div>
    );
  }

  const currentQ = quiz.questions[currentIndex];
  const answeredCount = answers.filter((a) => a !== -1).length;
  const isLast = currentIndex === quiz.questions.length - 1;

  // ── Pre-quiz: info confirmation ────────────────────────
  if (preQuizStep === "info") {
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
            <button onClick={() => router.push("/")}
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
                onClick={() => router.push("/")}>
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

        <div className="mb-6">
          <ProgressBar current={currentIndex + 1} total={quiz.questions.length} answered={answeredCount} />
        </div>

        <div className="flex-1">
          <QuizQuestion
            key={currentIndex}
            question={currentQ}
            index={currentIndex}
            total={quiz.questions.length}
            selectedAnswer={answers[currentIndex] ?? -1}
            onSelectAnswer={handleSelectAnswer}
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
              <button key={i} onClick={() => setCurrentIndex(i)}
                className="rounded-md text-[9px] font-bold flex items-center justify-center transition-all duration-150 shrink-0"
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: i === currentIndex ? "#3b82f6" : answers[i] !== -1 ? "rgba(16,185,129,0.2)" : "#1e293b",
                  border: i === currentIndex ? "1px solid #3b82f6" : "1px solid #334155",
                  color: i === currentIndex ? "#fff" : answers[i] !== -1 ? "#10b981" : "#64748b",
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
