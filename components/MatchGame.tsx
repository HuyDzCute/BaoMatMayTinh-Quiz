"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { Timer, RotateCcw, ArrowLeft, Check, X } from "lucide-react";
import type { Flashcard } from "@/lib/types";
import {
  recordMatchRun,
  formatMatchTime,
  getMatchLevelState,
} from "@/lib/match-storage";
import LevelBadge, { LevelUpBadge } from "./LevelBadge";

/* ─────────────────────────────────────────
   Types & helpers
   ───────────────────────────────────────── */

interface Tile {
  /** Stable id used as React key and matching key (the card id itself). */
  id: string;
  /** Text shown on the face. */
  text: string;
  /** Which column this tile belongs to. */
  side: "left" | "right";
}

interface MatchGameProps {
  setName: string;
  cards: Flashcard[];
  /** Number of pairs to play this round. Drawn randomly from `cards`. */
  pairCount: number;
  /**
   * Fired exactly once when the player finishes a successful run.
   * Receives the final time and mistake count. The component itself also
   * persists the run to localStorage via `recordMatchRun`, so callers don't
   * need to do that.
   */
  onFinish: (result: {
    timeMs: number;
    mistakes: number;
    isNewBest: boolean;
    leveledUpTo: { name: string; icon: string; color: string; level: number } | null;
    totalCompleted: number;
  }) => void;
  /** Best record (if any) for the player banner. */
  bestTimeMs?: number;
  /** Hook for the parent to abort cleanly (e.g. user navigates away). */
  onExit?: () => void;
}

/* ─────────────────────────────────────────
   Reducer state — separated so dispatch is cheap in the hot path.
   ───────────────────────────────────────── */

interface State {
  /** Cards remaining to match, keyed by id. */
  pool: Record<string, Flashcard>;
  /** Cards already matched. */
  matched: Record<string, Flashcard>;
  /** Tiles currently rendered on each side (shuffled at boot). */
  leftTiles: Tile[];
  rightTiles: Tile[];
  /** First tile of the in-progress pair. */
  pickedLeft: string | null;
  /** Second tile. `null` until the player clicks the other column. */
  pickedRight: string | null;
  /** True while a wrong match is flashing (input locked). */
  locked: boolean;
  mistakes: number;
  status: "playing" | "finished";
}

type Action =
  | { type: "PICK"; side: "left" | "right"; id: string }
  | { type: "RESOLVE_CORRECT"; id: string }
  | { type: "RESOLVE_WRONG" }
  | { type: "FINISH" };

function shuffle<T>(items: T[]): T[] {
  // Fisher-Yates; we don't mutate the input array.
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildInitialState(cards: Flashcard[], pairCount: number): State {
  const safe = Math.max(2, Math.min(pairCount, cards.length));
  const drawn = shuffle(cards).slice(0, safe);
  const pool: Record<string, Flashcard> = {};
  for (const c of drawn) pool[c.id] = c;

  const leftTiles: Tile[] = shuffle(drawn).map((c) => ({
    id: c.id,
    text: c.front,
    side: "left",
  }));
  const rightTiles: Tile[] = shuffle(drawn).map((c) => ({
    id: c.id,
    text: c.back,
    side: "right",
  }));

  return {
    pool,
    matched: {},
    leftTiles,
    rightTiles,
    pickedLeft: null,
    pickedRight: null,
    locked: false,
    mistakes: 0,
    status: "playing",
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "PICK": {
      // Ignore picks while wrong-flash is animating, or on already-matched tiles.
      if (state.locked || state.status !== "playing") return state;
      const isMatched = !!state.matched[action.id];
      if (isMatched) return state;

      if (action.side === "left") {
        // Toggle off if re-clicking the same selection.
        if (state.pickedLeft === action.id) return { ...state, pickedLeft: null };
        return { ...state, pickedLeft: action.id };
      }
      // right side
      if (state.pickedRight === action.id) return { ...state, pickedRight: null };
      // Need a left pick to form a pair.
      if (!state.pickedLeft) return state;
      return { ...state, pickedRight: action.id, locked: true };
    }
    case "RESOLVE_CORRECT": {
      const card = state.pool[action.id];
      if (!card) return state;
      const matched = { ...state.matched, [action.id]: card };
      const pool = { ...state.pool };
      delete pool[action.id];
      const isFinished = Object.keys(pool).length === 0;
      return {
        ...state,
        matched,
        pool,
        pickedLeft: null,
        pickedRight: null,
        locked: false,
        status: isFinished ? "finished" : "playing",
      };
    }
    case "RESOLVE_WRONG":
      return {
        ...state,
        pickedLeft: null,
        pickedRight: null,
        locked: false,
        mistakes: state.mistakes + 1,
      };
    case "FINISH":
      return { ...state, status: "finished" };
  }
}

/* ─────────────────────────────────────────
   Component
   ───────────────────────────────────────── */

export default function MatchGame({ setName, cards, pairCount, onFinish, bestTimeMs, onExit }: MatchGameProps) {
  const initial = useMemo(() => buildInitialState(cards, pairCount), [cards, pairCount]);
  const [state, dispatch] = useReducer(reducer, initial);

  // Player progression snapshot. We re-read it on mount so the top-bar
  // pill is accurate even if the player navigated here from another set.
  // (It's also re-read after a finished run via `setTotalCompleted`.)
  const [totalCompleted, setTotalCompleted] = useState<number>(() =>
    getMatchLevelState().totalCompleted
  );

  // ── Timer ────────────────────────────────────────────────────────────
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const finalTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Start the clock immediately on mount. We deliberately restart from 0
    // when the component remounts with a fresh `pairCount`, which gives the
    // player a clean slate for every game.
    startedAtRef.current = performance.now();
    const id = window.setInterval(() => {
      if (startedAtRef.current == null) return;
      setElapsedMs(performance.now() - startedAtRef.current);
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  // ── When the reducer reports finished, freeze the timer and notify the parent. ──
  useEffect(() => {
    if (state.status !== "finished" || finalTimeRef.current != null) return;
    const finalMs = startedAtRef.current ? performance.now() - startedAtRef.current : elapsedMs;
    finalTimeRef.current = finalMs;

    const { record, isNewBest, leveledUpTo, totalCompleted } = recordMatchRun({
      setId: setName,
      setName,
      timeMs: finalMs,
      pairCount,
      mistakes: state.mistakes,
    });

    onFinish({
      timeMs: finalMs,
      mistakes: state.mistakes,
      isNewBest,
      leveledUpTo: leveledUpTo
        ? {
            name: leveledUpTo.name,
            icon: leveledUpTo.icon,
            color: leveledUpTo.color,
            level: leveledUpTo.level,
          }
        : null,
      totalCompleted,
    });

    // Refresh the top-bar pill with the freshly-incremented total so the
    // player can see their progress as soon as the result screen renders.
    setTotalCompleted(totalCompleted);

    // Touch the localStorage cache so the banner can refresh without a reload.
    void record;
  }, [state.status, state.mistakes, setName, pairCount, onFinish, elapsedMs]);

  // ── Resolve match attempts ────────────────────────────────────────────
  // We use a separate effect (not in the reducer) so the wrong-flash animation
  // gets to play before we clear the picks. ~600ms feels right: long enough
  // for the shake, short enough that fast players don't get annoyed.
  useEffect(() => {
    if (!state.pickedLeft || !state.pickedRight) return;
    const tid = window.setTimeout(() => {
      if (state.pickedLeft === state.pickedRight) {
        dispatch({ type: "RESOLVE_CORRECT", id: state.pickedLeft });
      } else {
        dispatch({ type: "RESOLVE_WRONG" });
      }
    }, 600);
    return () => window.clearTimeout(tid);
  }, [state.pickedLeft, state.pickedRight]);

  const handlePick = (side: "left" | "right", id: string) => {
    dispatch({ type: "PICK", side, id });
  };

  // Derived: which tiles should currently be flashing red (the two picks
  // during a wrong-match resolution window).
  const wrongPair =
    state.pickedLeft && state.pickedRight && state.pickedLeft !== state.pickedRight
      ? { left: state.pickedLeft, right: state.pickedRight }
      : null;

  const matchedCount = Object.keys(state.matched).length;
  // `total` reflects the *actual* number of pairs in this round, not the
  // player's chosen pairCount (which gets clamped to fit the set). Falling
  // back to pairCount is fine: when no clamping happened, they're equal.
  const total = Math.min(pairCount, state.leftTiles.length);

  return (
    <div className="w-full">
      {/* ── Top bar: title + timer + best ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Link
            href="/match"
            onClick={() => onExit?.()}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: "rgba(30,41,59,0.5)",
              border: "1px solid rgba(51,65,85,0.4)",
              color: "#94a3b8",
            }}
          >
            <ArrowLeft size={14} />
            <span>Đổi bộ</span>
          </Link>
          <div
            className="text-sm px-3 py-1.5 rounded-lg truncate max-w-[200px] sm:max-w-[320px]"
            style={{
              backgroundColor: "rgba(30,41,59,0.5)",
              border: "1px solid rgba(51,65,85,0.4)",
              color: "#cbd5e1",
            }}
            title={setName}
          >
            {setName}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LevelBadge totalCompleted={totalCompleted} variant="compact" />
          {bestTimeMs !== undefined && (
            <div
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{
                backgroundColor: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.3)",
                color: "#10b981",
              }}
            >
              <span>PB</span>
              <span className="font-mono font-semibold">{formatMatchTime(bestTimeMs)}</span>
            </div>
          )}
          <div
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-mono"
            style={{
              backgroundColor: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.4)",
              color: "#60a5fa",
            }}
          >
            <Timer size={14} />
            <span className="font-semibold tabular-nums">{formatMatchTime(elapsedMs)}</span>
          </div>
        </div>
      </div>

      {/* ── Progress ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5 text-xs">
          <span style={{ color: "#94a3b8" }}>
            Đã ghép <strong style={{ color: "#f1f5f9" }}>{matchedCount}</strong> / {total} cặp
          </span>
          <span style={{ color: "#94a3b8" }}>
            Sai <strong style={{ color: state.mistakes > 0 ? "#f59e0b" : "#f1f5f9" }}>{state.mistakes}</strong>
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: "rgba(30,41,59,0.7)" }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${(matchedCount / total) * 100}%`,
              background: "linear-gradient(90deg, #10b981, #06b6d4)",
            }}
          />
        </div>
      </div>

      {/* ── Game grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Left column */}
        <div className="flex flex-col gap-2 sm:gap-3">
          {state.leftTiles.map((tile) => {
            return (
              <TileButton
                key={`L-${tile.id}`}
                tile={tile}
                isMatched={!!state.matched[tile.id]}
                isPicked={state.pickedLeft === tile.id}
                isWrong={
                  wrongPair !== null && wrongPair.left === tile.id
                }
                locked={state.locked}
                onClick={() => handlePick("left", tile.id)}
              />
            );
          })}
        </div>
        {/* Right column */}
        <div className="flex flex-col gap-2 sm:gap-3">
          {state.rightTiles.map((tile) => {
            return (
              <TileButton
                key={`R-${tile.id}`}
                tile={tile}
                isMatched={!!state.matched[tile.id]}
                isPicked={state.pickedRight === tile.id}
                isWrong={
                  wrongPair !== null && wrongPair.right === tile.id
                }
                locked={state.locked}
                onClick={() => handlePick("right", tile.id)}
              />
            );
          })}
        </div>
      </div>

      {/* ── Bottom hint + restart ── */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs">
        <p style={{ color: "#475569" }}>
          Nhấn 2 thẻ — 1 thuật ngữ + 1 định nghĩa — để ghép cặp.
        </p>
        <Link
          href="/match"
          onClick={() => onExit?.()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
          style={{
            backgroundColor: "rgba(30,41,59,0.4)",
            border: "1px solid rgba(51,65,85,0.4)",
            color: "#94a3b8",
          }}
        >
          <RotateCcw size={12} />
          Chơi lại bộ khác
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Internal: tile button. Pure presentational.
   ───────────────────────────────────────── */

interface TileButtonProps {
  tile: Tile;
  isMatched: boolean;
  isPicked: boolean;
  isWrong: boolean;
  locked: boolean;
  onClick: () => void;
}

function TileButton({ tile, isMatched, isPicked, isWrong, locked, onClick }: TileButtonProps) {
  // Disable clicking on matched tiles. While two tiles are flashing wrong,
  // we additionally disable everything (the parent's `locked` handles this
  // on the matching-path, but having `disabled` makes the visual unambiguous).
  const disabled = isMatched || locked;

  let bg = "rgba(30,41,59,0.6)";
  let border = "1px solid rgba(51,65,85,0.5)";
  let color = "#e2e8f0";
  let ring = "none";
  let animation = "";
  let icon: React.ReactNode = null;

  if (isMatched) {
    bg = "rgba(16,185,129,0.12)";
    border = "1px solid rgba(16,185,129,0.5)";
    color = "#a7f3d0";
    animation = "animate-pulse-glow";
    icon = <Check size={14} style={{ color: "#10b981" }} />;
  } else if (isWrong) {
    bg = "rgba(239,68,68,0.18)";
    border = "1px solid rgba(239,68,68,0.6)";
    color = "#fecaca";
    animation = "animate-shake";
    icon = <X size={14} style={{ color: "#ef4444" }} />;
  } else if (isPicked) {
    bg = "rgba(59,130,246,0.18)";
    border = "1px solid rgba(59,130,246,0.7)";
    color = "#bfdbfe";
    ring = "0 0 0 3px rgba(59,130,246,0.25)";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-4 py-3 rounded-xl font-medium text-sm sm:text-base transition-all ${animation}`}
      style={{
        backgroundColor: bg,
        border,
        color,
        boxShadow: ring,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled && !isMatched && !isWrong && !isPicked ? 0.5 : 1,
      }}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="break-words">{tile.text}</span>
        {icon && <span className="shrink-0">{icon}</span>}
      </span>
    </button>
  );
}
