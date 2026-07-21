"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import ResultCard from "@/components/ResultCard";
import AnswerReview from "@/components/AnswerReview";
import Footer from "@/components/Footer";
import { QuizResult, Question } from "@/lib/types";
import { RotateCcw, Trophy, Eye, Home, Cloud, CloudOff, Save } from "lucide-react";

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [cloudSaved, setCloudSaved] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- must read sessionStorage after mount to avoid hydration mismatch */
    try {
      const r = sessionStorage.getItem("qthtm_result");
      if (r) setResult(JSON.parse(r));
      const q = sessionStorage.getItem("qthtm_questions");
      if (q) setQuestions(JSON.parse(q));
      const c = sessionStorage.getItem("qthtm_cloud_saved");
      if (c) setCloudSaved(JSON.parse(c));
    } catch { /* ignore parse errors */ }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!result) router.replace("/");
  }, [result, router]);

  if (!result) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p style={{ color: "#94a3b8" }}>Đang tải kết quả...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <ResultCard result={result} />

        <div className="mt-4 flex items-center justify-center">
          {cloudSaved ? (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <Cloud size={13} style={{ color: "#34d399" }} />
              <span className="text-xs font-medium" style={{ color: "#34d399" }}>Da dong bo len cloud</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.2)" }}>
              <CloudOff size={13} style={{ color: "#94a3b8" }} />
              <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>Luu cuc bo</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
          <Link
            href="/"
            className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 text-center"
            style={{ backgroundColor: "#111827", border: "1px solid #334155" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.backgroundColor = "rgba(59,130,246,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.backgroundColor = "#111827"; }}
          >
            <Home size={20} style={{ color: "#3b82f6" }} />
            <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>Trang chủ</span>
          </Link>

          <Link
            href="/history"
            className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 text-center"
            style={{ backgroundColor: "#111827", border: "1px solid #334155" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.backgroundColor = "rgba(16,185,129,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.backgroundColor = "#111827"; }}
          >
            <Save size={20} style={{ color: "#10b981" }} />
            <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>Lịch sử</span>
          </Link>

          <button
            onClick={() => { sessionStorage.removeItem("qthtm_result"); sessionStorage.removeItem("qthtm_questions"); router.push("/"); }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200"
            style={{ backgroundColor: "#111827", border: "1px solid #334155" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#06b6d4"; e.currentTarget.style.backgroundColor = "rgba(6,182,212,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.backgroundColor = "#111827"; }}
          >
            <RotateCcw size={20} style={{ color: "#06b6d4" }} />
            <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>Chơi lại</span>
          </button>

          <Link
            href="/leaderboard"
            className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200"
            style={{ backgroundColor: "#111827", border: "1px solid #334155" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f59e0b"; e.currentTarget.style.backgroundColor = "rgba(245,158,11,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.backgroundColor = "#111827"; }}
          >
            <Trophy size={20} style={{ color: "#f59e0b" }} />
            <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>Bảng xếp hạng</span>
          </Link>

          <button
            onClick={() => setShowReview(!showReview)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200"
            style={{ backgroundColor: "#111827", border: "1px solid #334155" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#a855f7"; e.currentTarget.style.backgroundColor = "rgba(168,85,247,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.backgroundColor = "#111827"; }}
          >
            <Eye size={20} style={{ color: "#a855f7" }} />
            <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>Xem lại bài</span>
          </button>
        </div>

        {showReview && (
          <div className="mt-8 animate-fade-slide-up">
            <h3 className="text-lg font-bold mb-5" style={{ color: "#f1f5f9", fontFamily: "var(--font-orbitron)" }}>
              Xem lại bài làm
            </h3>
            <AnswerReview
              questions={questions}
              answers={result.answers}
              speakingAnswers={result.speakingAnswers}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
