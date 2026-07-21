/**
 * Match (Ghép thẻ) — localStorage helpers.
 *
 * Stores the player's best time per flashcard set so the leaderboard can
 * show personal records even across browser sessions. A small in-memory
 * cache (mirrors the pattern used in `flashcards-storage.ts`) keeps the
 * hot read path cheap during gameplay.
 */

const RECORDS_KEY = "qthtm_match_records";
const HISTORY_KEY = "qthtm_match_history";
const LEVEL_KEY = "qthtm_match_level";

/* ─────────────────────────────────────────
   Level system
   ───────────────────────────────────────── */

/**
 * One tier in the player progression. `threshold` is the cumulative
 * number of completed matches required to *reach* this level. The
 * first entry (threshold 0) is always the default starting point.
 */
export interface MatchLevel {
  /** 1-based level index. */
  level: number;
  /** Vietnamese short name shown in badges. */
  name: string;
  /** Vietnamese subtitle shown beneath the name. */
  hint: string;
  /** Cumulative completed matches needed to reach this level. */
  threshold: number;
  /** Emoji or single glyph shown next to the name. */
  icon: string;
  /** Tailwind/hex color for the badge (matches the game palette). */
  color: string;
  /** Soft tint used for the pill background. */
  bg: string;
}

export const MATCH_LEVELS: readonly MatchLevel[] = [
  { level: 1, name: "Tân binh",     hint: "Bắt đầu hành trình",  threshold: 0,  icon: "🌱", color: "#94a3b8", bg: "rgba(148,163,184,0.18)" },
  { level: 2, name: "Học việc",     hint: "Hoàn thành trận đầu",  threshold: 1,  icon: "📚", color: "#10b981", bg: "rgba(16,185,129,0.18)"  },
  { level: 3, name: "Luyện tập",    hint: "Quen tay rồi",          threshold: 5,  icon: "⚔️", color: "#06b6d4", bg: "rgba(6,182,212,0.18)"   },
  { level: 4, name: "Thành thạo",   hint: "Phản xạ nhanh",         threshold: 15, icon: "🎯", color: "#3b82f6", bg: "rgba(59,130,246,0.18)"  },
  { level: 5, name: "Bậc thầy",     hint: "Ít sai sót",            threshold: 30, icon: "👑", color: "#a855f7", bg: "rgba(168,85,247,0.18)"  },
  { level: 6, name: "Đại sư",       hint: "Tốc độ đỉnh cao",       threshold: 60, icon: "🏆", color: "#f59e0b", bg: "rgba(245,158,11,0.20)"  },
] as const;

/** Returns the highest tier whose threshold is ≤ `completedMatches`. */
export function getMatchLevel(completedMatches: number): MatchLevel {
  // Walk from the top so the first match is the strictest case.
  let current: MatchLevel = MATCH_LEVELS[0];
  for (const tier of MATCH_LEVELS) {
    if (completedMatches >= tier.threshold) current = tier;
    else break;
  }
  return current;
}

/**
 * Returns the *next* tier above the player's current level, or `null` if
 * they are already at the max tier. Useful for "X / Y để lên Z".
 */
export function getNextMatchLevel(current: MatchLevel): MatchLevel | null {
  const idx = MATCH_LEVELS.findIndex((t) => t.level === current.level);
  if (idx < 0 || idx >= MATCH_LEVELS.length - 1) return null;
  return MATCH_LEVELS[idx + 1];
}

/** Persisted level snapshot — we cache this so the UI can render synchronously. */
export interface MatchLevelState {
  /** Last computed level (number). */
  level: number;
  /** Total completed matches at the time of last update. */
  totalCompleted: number;
  /** ISO timestamp when the player last leveled up. `undefined` if never. */
  lastLevelUpAt?: string;
}

/** Reads the persisted level state. Safe to call server-side. */
export function getMatchLevelState(): MatchLevelState {
  return lsGet<MatchLevelState>(LEVEL_KEY, { level: 1, totalCompleted: 0 });
}

function setMatchLevelState(state: MatchLevelState) {
  lsSet(LEVEL_KEY, state);
}

/**
 * Computes the player's current level from `records` and persists it.
 * Returns both the resulting state and (if applicable) the new tier the
 * player just reached — `leveledUpTo` is `null` unless this call bumped
 * the level upward.
 *
 * `previousLevel` is the level the player was on *before* this run so we
 * can detect a level-up without doing a second storage read.
 */
export function recomputeMatchLevel(
  records: Record<string, MatchRecord>,
  previousLevel: number
): { state: MatchLevelState; leveledUpTo: MatchLevel | null } {
  const totalCompleted = Object.values(records).reduce(
    (sum, r) => sum + (r.attempts ?? 0),
    0
  );
  const tier = getMatchLevel(totalCompleted);
  const next = getNextMatchLevel(tier);
  const now = new Date().toISOString();
  const leveledUp = tier.level > previousLevel;
  const state: MatchLevelState = {
    level: tier.level,
    totalCompleted,
    lastLevelUpAt: leveledUp ? now : getMatchLevelState().lastLevelUpAt,
  };
  setMatchLevelState(state);
  return { state, leveledUpTo: leveledUp ? tier : null };
}

/* ─────────────────────────────────────────
   Safe localStorage helpers
   ───────────────────────────────────────── */
function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, val: unknown): boolean {
  if (typeof window === "undefined") return true;
  try {
    localStorage.setItem(key, JSON.stringify(val));
    return true;
  } catch {
    return false;
  }
}

let recordsCache: Record<string, MatchRecord> | null = null;
function invalidateRecordsCache() {
  recordsCache = null;
}

/* ─────────────────────────────────────────
   Types
   ───────────────────────────────────────── */

/**
 * One row per set in the records table. Stored under
 * `qthtm_match_records` as `{ [setId]: MatchRecord }`.
 *
 * `bestTimeMs` is the player's fastest completion (lower is better).
 * `attempts` counts *finished* games, not page-loads.
 */
export interface MatchRecord {
  setId: string;
  setName: string;
  /** Fastest completion time in milliseconds. `undefined` if not yet completed. */
  bestTimeMs?: number;
  /** Number of completed runs (the current run counts only after finish). */
  attempts: number;
  /** ISO timestamp of the last completed run. */
  lastPlayedAt?: string;
}

/**
 * One entry per finished game. Stored under `qthtm_match_history`.
 * Capped to the most recent `HISTORY_LIMIT` runs to keep storage bounded.
 */
export interface MatchHistoryEntry {
  id: string;
  setId: string;
  setName: string;
  timeMs: number;
  pairCount: number;
  /** How many pairs were wrong during the run. */
  mistakes: number;
  date: string; // ISO timestamp
}

const HISTORY_LIMIT = 50;

/* ─────────────────────────────────────────
   Records (best per set)
   ───────────────────────────────────────── */

/** Returns all stored records, or `{}` if storage is empty/broken. */
export function getAllMatchRecords(): Record<string, MatchRecord> {
  if (recordsCache) return recordsCache;
  recordsCache = lsGet<Record<string, MatchRecord>>(RECORDS_KEY, {});
  return recordsCache;
}

/** Returns the record for a single set, or a fresh empty record. */
export function getMatchRecord(setId: string, setName?: string): MatchRecord {
  const all = getAllMatchRecords();
  return (
    all[setId] ?? {
      setId,
      setName: setName ?? setId,
      attempts: 0,
    }
  );
}

/**
 * Records a finished run. Updates best time if the new time is faster and
 * always increments the attempts counter and `lastPlayedAt`.
 *
 * Returns the (possibly-new) record so the UI can show "New best!" without
 * re-reading storage. Also returns `leveledUpTo` if this run promoted the
 * player to a new tier — callers can use it to trigger a celebration.
 */
export function recordMatchRun(args: {
  setId: string;
  setName: string;
  timeMs: number;
  pairCount: number;
  mistakes: number;
}): {
  record: MatchRecord;
  isNewBest: boolean;
  historyEntry: MatchHistoryEntry;
  leveledUpTo: MatchLevel | null;
  totalCompleted: number;
} {
  const all = getAllMatchRecords();
  const existing: MatchRecord = all[args.setId] ?? {
    setId: args.setId,
    setName: args.setName,
    attempts: 0,
  };

  const isNewBest =
    existing.bestTimeMs === undefined || args.timeMs < existing.bestTimeMs;

  const updated: MatchRecord = {
    ...existing,
    setName: args.setName || existing.setName,
    bestTimeMs: isNewBest ? args.timeMs : existing.bestTimeMs,
    attempts: existing.attempts + 1,
    lastPlayedAt: new Date().toISOString(),
  };

  all[args.setId] = updated;
  recordsCache = all;
  lsSet(RECORDS_KEY, all);

  // Append to history (capped). We re-read on every write — the history is
  // small (~50 entries * ~80 bytes) and writes are infrequent (only on game
  // finish), so caching it doesn't pay off here.
  const history = lsGet<MatchHistoryEntry[]>(HISTORY_KEY, []);
  const entry: MatchHistoryEntry = {
    id: `${args.setId}-${Date.now()}`,
    setId: args.setId,
    setName: args.setName,
    timeMs: args.timeMs,
    pairCount: args.pairCount,
    mistakes: args.mistakes,
    date: updated.lastPlayedAt!,
  };
  const nextHistory = [entry, ...history].slice(0, HISTORY_LIMIT);
  lsSet(HISTORY_KEY, nextHistory);

  // Recompute player level. We snapshot the previous level BEFORE the
  // update so `recomputeMatchLevel` can detect the tier bump. The result
  // is written back into localStorage inside `recomputeMatchLevel`.
  const previousLevel = getMatchLevelState().level;
  const { leveledUpTo, state: levelState } = recomputeMatchLevel(
    all,
    previousLevel
  );

  return {
    record: updated,
    isNewBest,
    historyEntry: entry,
    leveledUpTo,
    totalCompleted: levelState.totalCompleted,
  };
}

/* ─────────────────────────────────────────
   History
   ───────────────────────────────────────── */

export function getMatchHistory(): MatchHistoryEntry[] {
  return lsGet<MatchHistoryEntry[]>(HISTORY_KEY, []);
}

export function clearMatchHistory(): void {
  lsSet(HISTORY_KEY, []);
}

/** Wipes everything — useful for tests. */
export function resetMatchStorage(): void {
  lsSet(RECORDS_KEY, {});
  lsSet(HISTORY_KEY, []);
  invalidateRecordsCache();
}

/* ─────────────────────────────────────────
   Formatting helpers (pure)
   ───────────────────────────────────────── */

/** Formats a duration in ms as `M:SS.t` (e.g. `1:23.4`). Always at least 0.0s. */
export function formatMatchTime(ms: number): string {
  const safe = Math.max(0, ms);
  const totalSeconds = safe / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const tenths = Math.floor((safe % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

/** Like `formatMatchTime` but longer form (`1 ph 23 giây`). For result page. */
export function formatMatchTimeLong(ms: number): string {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} giây`;
  if (seconds === 0) return `${minutes} phút`;
  return `${minutes} ph ${seconds} giây`;
}
