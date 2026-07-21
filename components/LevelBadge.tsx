"use client";

import {
  MATCH_LEVELS,
  getMatchLevel,
  getNextMatchLevel,
} from "@/lib/match-storage";

interface LevelBadgeProps {
  /** Total completed matches across all sets. */
  totalCompleted: number;
  /** Compact = single-line pill. Full = icon + name + progress bar. */
  variant?: "compact" | "full";
}

/**
 * Visualizes the player's progression. Reads the `MatchLevel` table from
 * `match-storage` — no business logic lives here.
 *
 * `compact` is meant for navbars / header bars where vertical space is
 * at a premium. `full` is used on result screens and the dedicated
 * progress view where we have room to show the next-tier progress bar.
 */
export default function LevelBadge({
  totalCompleted,
  variant = "compact",
}: LevelBadgeProps) {
  const current = getMatchLevel(totalCompleted);
  const next = getNextMatchLevel(current);

  // Next-tier progress: how many of the (next.threshold - current.threshold)
  // matches the player still owes. When `next` is null they are maxed.
  const progressPct = next
    ? Math.min(
        100,
        ((totalCompleted - current.threshold) /
          (next.threshold - current.threshold)) *
          100
      )
    : 100;
  const matchesToNext = next ? Math.max(0, next.threshold - totalCompleted) : 0;

  if (variant === "compact") {
    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
        style={{
          backgroundColor: current.bg,
          border: `1px solid ${current.color}55`,
          color: current.color,
        }}
        title={
          next
            ? `${matchesToNext} trận nữa để lên ${next.name}`
            : "Cấp tối đa!"
        }
      >
        <span className="text-base leading-none">{current.icon}</span>
        <span className="font-bold tabular-nums">Lv.{current.level}</span>
        <span className="hidden sm:inline">{current.name}</span>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-4 sm:p-5"
      style={{
        backgroundColor: current.bg,
        border: `1px solid ${current.color}55`,
      }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-2xl sm:text-3xl shrink-0"
          style={{
            background: `linear-gradient(135deg, ${current.color}, ${current.color}99)`,
            boxShadow: `0 0 20px ${current.color}55`,
          }}
        >
          {current.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: current.color }}
            >
              Cấp {current.level}
            </span>
            <span
              className="text-base sm:text-lg font-bold"
              style={{ color: "#f1f5f9" }}
            >
              {current.name}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
            {current.hint}
          </p>
        </div>
      </div>

      {next ? (
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span style={{ color: "#94a3b8" }}>
              Tiến trình lên{" "}
              <span style={{ color: next.color, fontWeight: 600 }}>
                {next.icon} {next.name}
              </span>
            </span>
            <span
              className="font-mono tabular-nums"
              style={{ color: "#cbd5e1" }}
            >
              {totalCompleted} / {next.threshold}
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: "rgba(15,23,42,0.6)" }}
          >
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${current.color}, ${next.color})`,
              }}
            />
          </div>
          <p
            className="text-[11px] mt-1.5 text-right"
            style={{ color: "#64748b" }}
          >
            Còn {matchesToNext} trận nữa
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm" style={{ color: current.color }}>
          <span>🏆</span>
          <span className="font-semibold">Bạn đã đạt cấp tối đa — Đại sư!</span>
        </div>
      )}
    </div>
  );
}

/** Small inline tag for the level-up celebration banner. */
export function LevelUpBadge({ tier }: { tier: { name: string; icon: string; color: string } }) {
  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold animate-pulse-glow"
      style={{
        background: `linear-gradient(135deg, ${tier.color}, ${tier.color}cc)`,
        color: "#fff",
        boxShadow: `0 0 24px ${tier.color}88`,
      }}
    >
      <span className="text-lg">{tier.icon}</span>
      <span>Lên cấp — {tier.name}!</span>
    </div>
  );
}

// Re-export so consumers don't need to import from match-storage directly.
export { MATCH_LEVELS };
