"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, Trophy, Zap, BookOpen, ChevronRight, Clock } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  getAllFlashcardSets,
} from "@/lib/flashcards-storage";
import {
  getAllMatchRecords,
  formatMatchTime,
  getMatchLevelState,
  type MatchRecord,
} from "@/lib/match-storage";
import LevelBadge from "@/components/LevelBadge";

/**
 * Match hub — the "/match" landing page.
 *
 * Lists every available flashcard set and lets the player jump into a game.
 * Each set row shows: card count, the player's best time (if any), and the
 * number of past attempts. Newest sets without records show a friendly hint
 * instead of zeros.
 */
export default function MatchHubPage() {
  const [hydrated, setHydrated] = useState(false);
  const [records, setRecords] = useState<Record<string, MatchRecord>>({});

  useEffect(() => {
    // Read localStorage only after mount to keep SSR markup stable.
    setRecords(getAllMatchRecords());
    setHydrated(true);
  }, []);

  const sets = getAllFlashcardSets();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
      <Header />

      <main className="flex-1 w-full px-4 py-8 sm:py-10" style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* ── Hero ── */}
        <section
          className="mb-8 p-6 sm:p-8 rounded-2xl relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(6,182,212,0.08))",
            border: "1px solid rgba(59,130,246,0.25)",
          }}
        >
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            aria-hidden="true"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.25), transparent 40%), radial-gradient(circle at 80% 80%, rgba(6,182,212,0.2), transparent 40%)",
            }}
          />
          <div className="relative">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg"
                  style={{
                    background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                    boxShadow: "0 0 16px rgba(59,130,246,0.4)",
                  }}
                >
                  <Layers size={18} style={{ color: "#fff" }} />
                </div>
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "#60a5fa", letterSpacing: "0.15em" }}
                >
                  Trò chơi mới
                </span>
              </div>
              {hydrated && (
                <LevelBadge
                  totalCompleted={getMatchLevelState().totalCompleted}
                  variant="compact"
                />
              )}
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold mb-2"
              style={{ color: "#f1f5f9", fontFamily: "var(--font-orbitron)" }}
            >
              Ghép thẻ (Match)
            </h1>
            <p
              className="text-sm sm:text-base max-w-xl"
              style={{ color: "#94a3b8" }}
            >
              Nối <strong style={{ color: "#60a5fa" }}>thuật ngữ</strong> với{" "}
              <strong style={{ color: "#06b6d4" }}>định nghĩa</strong> tương ứng — càng nhanh càng tốt.
              Hoàn thành để ghi vào bảng kỷ lục cá nhân của bạn.
            </p>

            {/* Quick tips */}
            <div className="flex flex-wrap gap-3 mt-4 text-xs">
              <Tip icon={<Zap size={13} />} label="Click 1 thuật ngữ + 1 định nghĩa để ghép" />
              <Tip icon={<Trophy size={13} />} label="Lưu kỷ lục cá nhân tự động" />
              <Tip icon={<Clock size={13} />} label="Đếm giờ bắt đầu khi vào chơi" />
            </div>
          </div>
        </section>

        {/* ── Set list ── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <h2
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#334155", letterSpacing: "0.15em" }}
            >
              Chọn bộ thẻ
            </h2>
            <div className="flex-1 h-px" style={{ backgroundColor: "rgba(51,65,85,0.3)" }} />
          </div>

          {sets.length === 0 ? (
            <div
              className="p-6 rounded-xl text-center"
              style={{
                backgroundColor: "rgba(30,41,59,0.5)",
                border: "1px solid rgba(51,65,85,0.4)",
                color: "#94a3b8",
              }}
            >
              Chưa có bộ thẻ nào. Hãy vào{" "}
              <Link href="/flashcards" className="underline" style={{ color: "#60a5fa" }}>
                Học từ vựng
              </Link>{" "}
              để tạo bộ mới.
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sets.map((set) => {
                const rec = records[set.id];
                return (
                  <li key={set.id}>
                    <Link
                      href={`/match/play/${encodeURIComponent(set.id)}`}
                      className="block p-4 rounded-xl transition-all hover:-translate-y-0.5"
                      style={{
                        backgroundColor: "rgba(30,41,59,0.5)",
                        border: "1px solid rgba(51,65,85,0.4)",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{
                            background: `linear-gradient(135deg, ${set.color}, ${set.color}99)`,
                            color: "#fff",
                          }}
                        >
                          <BookOpen size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className="font-semibold text-sm sm:text-base mb-0.5 truncate"
                            style={{ color: "#f1f5f9" }}
                            title={set.name}
                          >
                            {set.name}
                          </h3>
                          <p
                            className="text-xs truncate mb-2"
                            style={{ color: "#64748b" }}
                            title={set.description}
                          >
                            {set.description || "Bộ thẻ người dùng tạo"}
                          </p>

                          <div className="flex flex-wrap gap-1.5">
                            <Pill
                              icon={<BookOpen size={11} />}
                              label={`${set.cards.length} thẻ`}
                            />
                            {hydrated && rec?.bestTimeMs !== undefined && (
                              <Pill
                                icon={<Trophy size={11} />}
                                label={`PB ${formatMatchTime(rec.bestTimeMs)}`}
                                accent="#f59e0b"
                              />
                            )}
                            {hydrated && rec && rec.attempts > 0 && (
                              <Pill
                                icon={<Clock size={11} />}
                                label={`${rec.attempts} lượt`}
                                accent="#64748b"
                              />
                            )}
                            {!hydrated && (
                              <Pill label="Đang tải…" accent="#64748b" />
                            )}
                          </div>
                        </div>
                        <ChevronRight
                          size={18}
                          className="shrink-0 mt-1"
                          style={{ color: "#475569" }}
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

/* ─────────────────────────────────────────
   Internal: small UI bits
   ───────────────────────────────────────── */

function Tip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{
        backgroundColor: "rgba(15,22,45,0.5)",
        border: "1px solid rgba(51,65,85,0.4)",
        color: "#94a3b8",
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function Pill({
  icon,
  label,
  accent,
}: {
  icon?: React.ReactNode;
  label: string;
  accent?: string;
}) {
  const color = accent ?? "#60a5fa";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider"
      style={{
        backgroundColor: `${color}1A`, // ~10% alpha
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {icon}
      {label}
    </span>
  );
}
