"use client";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SetSelector from "@/components/SetSelector";
import Footer from "@/components/Footer";
import { Info, Keyboard, Zap, Layers, Trophy, Clock, ArrowRight } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  const handleSelect = (setId: string, subSetId: string) => {
    router.push(`/quiz/${subSetId}`);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
      <Header />

      <main className="flex-1 w-full px-4 py-10" style={{ maxWidth: "900px", margin: "0 auto" }}>
        <Hero />

        {/* Notice */}
        <div
          className="mb-8 px-4 py-3 rounded-lg flex items-start gap-3 animate-fade-slide-up"
          style={{
            backgroundColor: "rgba(59,130,246,0.06)",
            border: "1px solid rgba(59,130,246,0.15)",
            borderLeft: "3px solid rgba(59,130,246,0.4)",
          }}
        >
          <Info size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#3b82f6" }} />
          <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
            <strong style={{ color: "#60a5fa" }}>Ca 3 sáng 8h40</strong> nằm trong label{" "}
            <strong style={{ color: "#e2e8f0" }}>BỘ 190 CÂU QTHTM (Thầy Sáng)</strong>.
            Khuyến khích ôn bộ 190 câu của thầy Sáng, chúc thi tốt!
          </p>
        </div>

        {/* Section label */}
        <div className="mb-5 flex items-center gap-3 animate-fade-slide-up" style={{ animationDelay: "50ms" }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#334155", letterSpacing: "0.15em" }}>
            Chọn bộ đề thi
          </h2>
          <div className="flex-1 h-px" style={{ backgroundColor: "rgba(51,65,85,0.3)" }} />
        </div>

        <SetSelector onSelect={handleSelect} />

        {/* Trò chơi — Match Game */}
        <div className="mt-10 mb-5 flex items-center gap-3 animate-fade-slide-up" style={{ animationDelay: "70ms" }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#334155", letterSpacing: "0.15em" }}>
            Trò chơi
          </h2>
          <div className="flex-1 h-px" style={{ backgroundColor: "rgba(51,65,85,0.3)" }} />
        </div>

        <button
          type="button"
          onClick={() => router.push("/match")}
          className="w-full text-left p-4 sm:p-5 rounded-2xl flex items-center gap-4 transition-all hover:-translate-y-0.5 animate-fade-slide-up"
          style={{
            animationDelay: "90ms",
            background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(6,182,212,0.08))",
            border: "1px solid rgba(59,130,246,0.25)",
          }}
        >
          <div
            className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              boxShadow: "0 0 16px rgba(59,130,246,0.4)",
            }}
          >
            <Layers size={22} style={{ color: "#fff" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-base sm:text-lg" style={{ color: "#f1f5f9" }}>
                Ghép thẻ (Match)
              </h3>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: "rgba(245,158,11,0.12)",
                  color: "#f59e0b",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                Mới
              </span>
            </div>
            <p className="text-xs sm:text-sm" style={{ color: "#94a3b8" }}>
              Nối thuật ngữ với định nghĩa tương ứng — càng nhanh càng tốt.
            </p>
            <div className="flex flex-wrap gap-3 mt-2 text-[11px]" style={{ color: "#64748b" }}>
              <span className="inline-flex items-center gap-1">
                <Clock size={11} />
                Đếm giờ
              </span>
              <span className="inline-flex items-center gap-1">
                <Trophy size={11} />
                Kỷ lục cá nhân
              </span>
              <span className="inline-flex items-center gap-1">
                <Zap size={11} />
                Click 2 thẻ để ghép
              </span>
            </div>
          </div>
          <ArrowRight
            size={20}
            className="shrink-0"
            style={{ color: "#60a5fa" }}
          />
        </button>

        {/* Keyboard hints */}
        <div
          className="mt-8 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 animate-fade-slide-up"
          style={{
            backgroundColor: "rgba(15,23,42,0.5)",
            border: "1px solid rgba(51,65,85,0.25)",
          }}
        >
          <div className="flex items-center gap-2 text-xs" style={{ color: "#475569" }}>
            <Keyboard size={13} />
            <span className="font-medium">Phím tắt</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <div className="flex items-center gap-1.5">
              <kbd
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
                style={{
                  backgroundColor: "rgba(30,41,59,0.8)",
                  border: "1px solid rgba(51,65,85,0.5)",
                  color: "#94a3b8",
                }}
              >
                1–4
              </kbd>
              <span className="text-xs" style={{ color: "#475569" }}>Chọn đáp án</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
                style={{
                  backgroundColor: "rgba(30,41,59,0.8)",
                  border: "1px solid rgba(51,65,85,0.5)",
                  color: "#94a3b8",
                }}
              >
                ← →
              </kbd>
              <span className="text-xs" style={{ color: "#475569" }}>Chuyển câu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
                style={{
                  backgroundColor: "rgba(30,41,59,0.8)",
                  border: "1px solid rgba(51,65,85,0.5)",
                  color: "#94a3b8",
                }}
              >
                Enter
              </kbd>
              <span className="text-xs" style={{ color: "#475569" }}>Nộp bài</span>
            </div>
          </div>
          <div className="sm:ml-auto flex items-center gap-1.5">
            <Zap size={11} style={{ color: "#10b981" }} />
            <span className="text-xs font-medium" style={{ color: "#10b981" }}>
              10 điểm / câu đúng
            </span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}