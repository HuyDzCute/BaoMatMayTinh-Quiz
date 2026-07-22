"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MatchGame from "@/components/MatchGame";
import MatchResult from "@/components/MatchResult";
import { getFlashcardSet } from "@/lib/flashcards-storage";
import {
  getAllMatchRecords,
  type MatchRecord,
} from "@/lib/match-storage";
import { playSfx } from "@/lib/sound";

/* ─────────────────────────────────────────
   Difficulty presets
   ───────────────────────────────────────── */

/**
 * Allowed pair counts. The player picks one before starting. The page clamps
 * the actual value to whatever the chosen set can supply, so a 6-card set
 * won't break "12 pairs" — we'd just give them all 6 pairs.
 */
const PAIR_OPTIONS = [
  { value: 6, label: "6 cặp", hint: "Nhanh" },
  { value: 8, label: "8 cặp", hint: "Vừa" },
  { value: 10, label: "10 cặp", hint: "Thử thách" },
] as const;

export default function MatchPlayPage() {
  const router = useRouter();
  const params = useParams<{ setId: string }>();
  const setId = decodeURIComponent(params.setId);

  const [hydrated, setHydrated] = useState(false);
  const [records, setRecords] = useState<Record<string, MatchRecord>>({});

  useEffect(() => {
    setRecords(getAllMatchRecords());
    setHydrated(true);
  }, []);

  // Look up the set (must run client-side: user-created sets live in
  // localStorage). We re-run after hydration so user sets become visible.
  const set = useMemo(() => {
    if (!hydrated) return undefined;
    return getFlashcardSet(setId);
  }, [setId, hydrated]);

  // Pre-game screen: pick pair count. Once `pairCount` is non-null we mount
  // the actual game.
  const [pairCount, setPairCount] = useState<number | null>(null);

  // Replay key — bumping it forces MatchGame to remount with a fresh shuffle,
  // since `MatchGame`'s initial state is keyed on `cards`/`pairCount` via
  // useMemo. We rely on React's reconciliation here to give us a clean slate.
  const [replayKey, setReplayKey] = useState(0);

  // Final result captured from MatchGame via onFinish.
  const [result, setResult] = useState<
    | {
        timeMs: number;
        mistakes: number;
        isNewBest: boolean;
        leveledUpTo:
          | { name: string; icon: string; color: string; level: number }
          | null;
        totalCompleted: number;
      }
    | null
  >(null);

  const handleFinish = useCallback(
    (r: {
      timeMs: number;
      mistakes: number;
      isNewBest: boolean;
      leveledUpTo: { name: string; icon: string; color: string; level: number } | null;
      totalCompleted: number;
    }) => {
      setResult(r);
      // Refresh the in-memory records cache so the result page shows the
      // freshly-saved PB. We read from storage rather than trusting the
      // returned `record` object because future code may add fields we don't
      // know about yet.
      setRecords(getAllMatchRecords());
    },
    [],
  );

  const handlePlayAgain = useCallback(() => {
    playSfx("click");
    setResult(null);
    setReplayKey((k) => k + 1);
  }, []);

  // ── Not found / still hydrating ──
  if (!hydrated) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p style={{ color: "#94a3b8" }}>Đang tải…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!set) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
        <Header />
        <main
          className="flex-1 w-full px-4 py-10 flex flex-col items-center justify-center"
          style={{ maxWidth: "640px", margin: "0 auto" }}
        >
          <p className="text-center mb-4" style={{ color: "#f87171" }}>
            Không tìm thấy bộ thẻ.
          </p>
          <button
            type="button"
            onClick={() => { playSfx("click"); router.push("/match") }}
            className="text-sm px-4 py-2 rounded-lg"
            style={{
              backgroundColor: "rgba(30,41,59,0.5)",
              border: "1px solid rgba(51,65,85,0.5)",
              color: "#cbd5e1",
            }}
          >
            ← Quay lại
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  if (set.cards.length < 2) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
        <Header />
        <main
          className="flex-1 w-full px-4 py-10 flex flex-col items-center justify-center"
          style={{ maxWidth: "640px", margin: "0 auto" }}
        >
          <p className="text-center mb-2" style={{ color: "#f87171" }}>
            Bộ thẻ cần ít nhất 2 thẻ để chơi.
          </p>
          <p className="text-center mb-4 text-sm" style={{ color: "#94a3b8" }}>
            {set.name} hiện có {set.cards.length} thẻ.
          </p>
          <button
            type="button"
            onClick={() => { playSfx("click"); router.push("/match") }}
            className="text-sm px-4 py-2 rounded-lg"
            style={{
              backgroundColor: "rgba(30,41,59,0.5)",
              border: "1px solid rgba(51,65,85,0.5)",
              color: "#cbd5e1",
            }}
          >
            ← Chọn bộ khác
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Pre-game: pick pair count ──
  if (pairCount === null) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
        <Header />

        <main
          className="flex-1 w-full px-4 py-8"
          style={{ maxWidth: "640px", margin: "0 auto" }}
        >
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3"
              style={{
                background: `linear-gradient(135deg, ${set.color}, ${set.color}99)`,
                boxShadow: `0 0 24px ${set.color}40`,
              }}
            >
              <Sparkles size={26} style={{ color: "#fff" }} />
            </div>
            <h1
              className="text-xl sm:text-2xl font-bold mb-1"
              style={{ color: "#f1f5f9", fontFamily: "var(--font-orbitron)" }}
            >
              {set.name}
            </h1>
            <p className="text-sm" style={{ color: "#94a3b8" }}>
              {set.cards.length} thẻ có sẵn
            </p>
          </div>

          <div className="mb-6">
            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-3 text-center"
              style={{ color: "#334155", letterSpacing: "0.15em" }}
            >
              Chọn độ dài
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {PAIR_OPTIONS.map((opt) => {
                // Clamp the option to whatever the set can supply. This way,
                // a 5-card set still gets a playable game even when the player
                // can't fit a full "6 cặp". We surface the actual count in the
                // label so there's no surprise in-game.
                const actual = Math.min(opt.value, set.cards.length);
                const isCapped = actual !== opt.value;
                const rec = records[set.id];
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { playSfx("click"); setPairCount(opt.value); }}
                    className="px-3 py-4 rounded-xl font-medium transition-all hover:-translate-y-0.5 text-center"
                    style={{
                      backgroundColor: "rgba(30,41,59,0.5)",
                      border: "1px solid rgba(51,65,85,0.4)",
                      color: "#e2e8f0",
                    }}
                  >
                    <div className="text-lg font-bold">
                      {actual} cặp
                    </div>
                    <div
                      className="text-[10px] mt-0.5 uppercase tracking-wider"
                      style={{ color: "#64748b" }}
                    >
                      {opt.hint}
                    </div>
                    {isCapped && (
                      <div
                        className="text-[10px] mt-0.5"
                        style={{ color: "#f59e0b" }}
                      >
                        tối đa của bộ
                      </div>
                    )}
                    {rec?.bestTimeMs !== undefined && (
                      <div
                        className="text-[10px] mt-1 font-mono"
                        style={{ color: "#f59e0b" }}
                      >
                        PB {rec.bestTimeMs !== undefined ? formatPb(rec.bestTimeMs) : ""}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-center text-xs" style={{ color: "#475569" }}>
            Timer bắt đầu ngay khi bạn nhấn vào một cặp.
          </p>
          {PAIR_OPTIONS.some((opt) => opt.value > set.cards.length) && (
            <p
              className="text-center text-[11px] mt-3"
              style={{ color: "#64748b" }}
            >
              Bộ này có {set.cards.length} thẻ — các lựa chọn lớn hơn đã được ẩn.
            </p>
          )}
        </main>

        <Footer />
      </div>
    );
  }

  // Actual pair count we'll use in-game: clamped to what the set has.
  // The pre-game view advertises the player's chosen value, but the game
  // component itself clamps further (defensive), so we pass the *original*
  // pairCount and let MatchGame decide. We surface the clamp in the UI by
  // hiding options that exceed the set's size.
  const actualPairs = Math.max(2, Math.min(pairCount, set.cards.length));

  // ── Game & result screens ──
  const currentRec = records[set.id];
  const bestTimeMs = currentRec?.bestTimeMs;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0f1e" }}>
      <Header />

      <main
        className="flex-1 w-full px-4 py-8"
        style={{ maxWidth: "800px", margin: "0 auto" }}
      >
        {result ? (
          <MatchResult
            setName={set.name}
            timeMs={result.timeMs}
            pairCount={actualPairs}
            mistakes={result.mistakes}
            isNewBest={result.isNewBest}
            bestTimeMs={bestTimeMs}
            totalCompleted={result.totalCompleted}
            leveledUpTo={result.leveledUpTo}
            onPlayAgain={handlePlayAgain}
          />
        ) : (
          <MatchGame
            key={replayKey}
            setName={set.name}
            cards={set.cards}
            pairCount={pairCount}
            onFinish={handleFinish}
            bestTimeMs={bestTimeMs}
            onExit={() => {
              // No-op: leaving is handled by the Link in the game header.
              // We keep the prop so the result page can be displayed after
              // navigation.
            }}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

/** Small local formatter just for the pre-game view; keeps imports tidy. */
function formatPb(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const tenths = Math.floor((ms % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}
