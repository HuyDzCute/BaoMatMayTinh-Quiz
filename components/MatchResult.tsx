"use client";

import Link from "next/link";
import { Trophy, RotateCcw, Home, Target, Clock, AlertTriangle, Sparkles } from "lucide-react";
import { formatMatchTime, formatMatchTimeLong } from "@/lib/match-storage";
import LevelBadge, { LevelUpBadge } from "./LevelBadge";

interface LevelUpInfo {
  name: string;
  icon: string;
  color: string;
  level: number;
}

interface MatchResultProps {
  setName: string;
  timeMs: number;
  pairCount: number;
  mistakes: number;
  isNewBest: boolean;
  bestTimeMs?: number;
  /** Called to start a new run with the same set. Should reset state in the parent. */
  onPlayAgain: () => void;
  /** Cumulative completed matches across all sets, used to render the level card. */
  totalCompleted: number;
  /**
   * If this run promoted the player to a new tier, the tier they just reached.
   * `null` when no level-up happened. We surface a celebratory banner when
   * this is set.
   */
  leveledUpTo: LevelUpInfo | null;
}

/**
 * Final-screen card shown after the player clears the board.
 *
 * Designed to feel rewarding without being loud: a centered "card" with
 * a count-up stat row, then a single primary CTA (play again) and two
 * secondary ones (change set, home).
 */
export default function MatchResult({
  setName,
  timeMs,
  pairCount,
  mistakes,
  isNewBest,
  bestTimeMs,
  onPlayAgain,
  totalCompleted,
  leveledUpTo,
}: MatchResultProps) {
  // Accuracy uses correct-pair attempts: every correct pick is one pair; wrong
  // pairs add 2 (we counted each wrong selection). Total "tries" = pairCount
  // + mistakes (since each wrong attempt means at least one wasted pair).
  // Simpler & player-friendly: just show "ghép đúng hết / sai N lần".
  const accuracy = pairCount === 0 ? 0 : Math.round((pairCount / (pairCount + mistakes)) * 100);

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* ── Trophy / celebration badge ── */}
      <div className="text-center mb-6">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{
            background:
              isNewBest
                ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                : "linear-gradient(135deg, #10b981, #06b6d4)",
            boxShadow: isNewBest
              ? "0 0 30px rgba(245,158,11,0.4)"
              : "0 0 24px rgba(16,185,129,0.3)",
          }}
        >
          {isNewBest ? (
            <Sparkles size={28} style={{ color: "#fff" }} />
          ) : (
            <Trophy size={28} style={{ color: "#fff" }} />
          )}
        </div>
        <h2
          className="text-2xl sm:text-3xl font-bold mb-1"
          style={{ color: "#f1f5f9", fontFamily: "var(--font-orbitron)" }}
        >
          {isNewBest ? "Kỷ lục mới!" : "Hoàn thành!"}
        </h2>
        <p className="text-sm" style={{ color: "#94a3b8" }}>
          {setName}
          {isNewBest && (
            <>
              {" — "}
              <span style={{ color: "#f59e0b" }}>phá kỷ lục cá nhân</span>
            </>
          )}
        </p>

        {/* Level-up celebration. Rendered above stats so it's the first
            thing the player sees when they cross a tier threshold. */}
        {leveledUpTo && (
          <div className="mt-4 flex justify-center animate-level-up">
            <LevelUpBadge tier={leveledUpTo} />
          </div>
        )}
      </div>

      {/* ── Stats grid ── */}
      <div
        className="grid grid-cols-3 gap-2 sm:gap-3 mb-6"
        role="group"
        aria-label="Thống kê lượt chơi"
      >
        <StatCard
          icon={<Clock size={18} />}
          label="Thời gian"
          value={formatMatchTime(timeMs)}
          subValue={formatMatchTimeLong(timeMs)}
          accent="#60a5fa"
        />
        <StatCard
          icon={<Target size={18} />}
          label="Cặp đúng"
          value={`${pairCount}/${pairCount}`}
          subValue={`${accuracy}% chính xác`}
          accent="#10b981"
        />
        <StatCard
          icon={<AlertTriangle size={18} />}
          label="Lần sai"
          value={mistakes.toString()}
          subValue={mistakes === 0 ? "Hoàn hảo!" : mistakes <= 2 ? "Tốt" : "Cần luyện thêm"}
          accent={mistakes === 0 ? "#10b981" : mistakes <= 2 ? "#f59e0b" : "#ef4444"}
        />
      </div>

      {/* ── Best-time line (only when relevant) ── */}
      {bestTimeMs !== undefined && (
        <div
          className="mb-6 px-4 py-3 rounded-lg flex items-center gap-3"
          style={{
            backgroundColor: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.25)",
          }}
        >
          <Sparkles size={16} style={{ color: "#f59e0b" }} />
          <div className="flex-1 text-sm" style={{ color: "#fcd34d" }}>
            Kỷ lục cá nhân của bạn:{" "}
            <strong className="font-mono">{formatMatchTime(bestTimeMs)}</strong>
            {isNewBest && (
              <span className="ml-2 text-xs" style={{ color: "#94a3b8" }}>
                (cập nhật vừa xong)
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Player progression card ── */}
      <div className="mb-6">
        <LevelBadge totalCompleted={totalCompleted} variant="full" />
      </div>

      {/* ── Action buttons ── */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onPlayAgain}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all"
          style={{
            background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
            color: "#fff",
            boxShadow: "0 4px 14px rgba(59,130,246,0.35)",
          }}
        >
          <RotateCcw size={16} />
          Chơi lại
        </button>
        <Link
          href="/match"
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-colors"
          style={{
            backgroundColor: "rgba(30,41,59,0.5)",
            border: "1px solid rgba(51,65,85,0.5)",
            color: "#cbd5e1",
          }}
        >
          <Target size={16} />
          Đổi bộ khác
        </Link>
        <Link
          href="/"
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-colors"
          style={{
            backgroundColor: "rgba(30,41,59,0.5)",
            border: "1px solid rgba(51,65,85,0.5)",
            color: "#cbd5e1",
          }}
        >
          <Home size={16} />
          Trang chủ
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Internal: stat card
   ───────────────────────────────────────── */

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  accent: string;
}

function StatCard({ icon, label, value, subValue, accent }: StatCardProps) {
  return (
    <div
      className="rounded-xl px-3 py-4 text-center"
      style={{
        backgroundColor: "rgba(30,41,59,0.5)",
        border: "1px solid rgba(51,65,85,0.4)",
      }}
    >
      <div className="flex justify-center mb-1.5" style={{ color: accent }}>
        {icon}
      </div>
      <div
        className="text-[10px] uppercase tracking-wider mb-1"
        style={{ color: "#64748b", fontWeight: 600, letterSpacing: "0.08em" }}
      >
        {label}
      </div>
      <div className="font-bold text-lg sm:text-xl font-mono" style={{ color: "#f1f5f9" }}>
        {value}
      </div>
      <div className="text-[10px] mt-0.5 truncate" style={{ color: "#64748b" }} title={subValue}>
        {subValue}
      </div>
    </div>
  );
}
