import {
  FlashcardBucket,
  FlashcardProgress,
  FlashcardSet,
} from "./types";
import { builtinFlashcardSets, getBuiltinFlashcardSet } from "./flashcards-data";
import { similarity } from "./fuzzy-match";

const USER_SETS_KEY = "qthtm_flashcard_user_sets";
const PROGRESS_KEY = "qthtm_flashcard_progress";

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

/**
 * Parse a stored `nextReviewAt` ISO string safely. Returns 0 for missing,
 * empty, unparseable, or out-of-range values so comparisons downstream
 * don't silently drop cards on the floor.
 */
function parseReviewAt(value: string | null | undefined): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

// In-memory cache for the progress blob. We invalidate it automatically
// when PROGRESS_KEY is written, so the cache is correct within a single
// tab. Cross-tab updates go through the storage event in the UI layer.
let progressCache: FlashcardProgress[] | null = null;
function invalidateProgressCache() {
  progressCache = null;
}

/**
 * Format a Date as YYYY-MM-DD using the user's *local* timezone. Use this
 * for any date that pairs up with `lastReviewedAt` slices written by the
 * rest of the code base. `toISOString().slice(0, 10)` returns UTC and
 * makes a session at 23:00 local appear to belong to the *next* UTC day.
 */
function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Normalize a stored `lastReviewedAt` ISO timestamp into the local-date
 * key that the rest of the storage layer uses. Older data may have been
 * written with `toISOString().slice(0, 10)` (UTC) — for backwards
 * compatibility we accept that format too.
 */
function toLocalDayKeyFromISO(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso.slice(0, 10);
  return localDayKey(new Date(t));
}

function lsSet(key: string, val: unknown): boolean {
  if (typeof window === "undefined") return true;
  try {
    localStorage.setItem(key, JSON.stringify(val));
    if (key === PROGRESS_KEY) invalidateProgressCache();
    return true;
  } catch (err) {
    // Surface quota errors so the UI can react. Previously this was
    // swallowed silently, which meant "import succeeded" was actually a
    // data-loss event. `qthtm:flashcard-storage-error` lets the UI show a
    // toast; `console.error` keeps an audit trail for debugging.
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.error(`[flashcards-storage] failed to persist ${key}:`, err);
      window.dispatchEvent(
        new CustomEvent("qthtm:flashcard-storage-error", {
          detail: { key, error: err },
        }),
      );
    }
    return false;
  }
}

/* ─────────────────────────────────────────
   Combined list (built-in + user-created)
   ───────────────────────────────────────── */
export function getAllFlashcardSets(): FlashcardSet[] {
  return [...builtinFlashcardSets, ...getUserFlashcardSets()];
}

export function getFlashcardSet(setId: string): FlashcardSet | undefined {
  // Direct lookup first (the happy path).
  const direct =
    getBuiltinFlashcardSet(setId) ?? getUserFlashcardSets().find((s) => s.id === setId);
  if (direct) return direct;

  // Legacy / bookmark compatibility: some earlier code path produced IDs of
  // the form `builtin:[[short-id]]` instead of the canonical
  // `builtin:<bucket>-<short-id>`. Try to map those legacy IDs back to a
  // real built-in set so stale URLs and bookmarks still resolve.
  const LEGACY_RE = /^builtin:\[\[(.+?)\]\]$/;
  const m = LEGACY_RE.exec(setId);
  if (m) {
    const shortId = m[1];

    // 1) User-imported sets may also have been tagged with this legacy
    //    `builtin:[[short-id]]` shape. If a user set with this exact id
    //    exists in localStorage (e.g. someone imported a CSV that produced
    //    such an id), return it directly.
    const fromUser = getUserFlashcardSets().find((s) => s.id === setId);
    if (fromUser) return fromUser;

    // 2) Otherwise look for a built-in whose canonical id ends with the
    //    short id (covers `builtin:zh-food-cac-mon-khai-vi` → `cac-mon-khai-vi`,
    //    `builtin:ielts-100-core` → `ielts-100-core`, etc.).
    const fromBuiltin = builtinFlashcardSets.find(
      (s) => s.id.endsWith(`-${shortId}`) || s.id.endsWith(shortId),
    );
    if (fromBuiltin) return fromBuiltin;
  }

  return undefined;
}

/* ─────────────────────────────────────────
   User-created sets (CRUD on localStorage)
   ───────────────────────────────────────── */
export function getUserFlashcardSets(): FlashcardSet[] {
  return lsGet<FlashcardSet[]>(USER_SETS_KEY, []);
}

export function saveUserFlashcardSet(set: FlashcardSet): void {
  const all = getUserFlashcardSets();
  const idx = all.findIndex((s) => s.id === set.id);
  if (idx >= 0) {
    all[idx] = set;
  } else {
    all.unshift(set);
  }
  lsSet(USER_SETS_KEY, all);
}

export function deleteUserFlashcardSet(setId: string): void {
  // Caller is responsible for guarding the prefix; double-check here so a
  // malformed id can never wipe unrelated progress.
  if (!setId.startsWith("user:") && !setId.startsWith("import:")) return;
  // Refuse to wipe anything for a set that doesn't actually exist in
  // storage — otherwise an unrelated set whose id happens to share a
  // prefix (or a stale id passed in error) could lose its progress.
  const found = getFlashcardSet(setId);
  if (!found) return;

  const all = getUserFlashcardSets().filter((s) => s.id !== setId);
  lsSet(USER_SETS_KEY, all);
  // Wipe progress for cards that actually belonged to this set (defense in
  // depth: even if a corrupted cardId slipped in with the same prefix from
  // another set, the per-card card.id comparison keeps us scoped).
  const cardIds = new Set(found.cards.map((c) => c.id));
  const progress = getAllProgress();
  const prefix = `${setId}::`;
  const filtered = progress.filter((p) => {
    if (!p.cardId.startsWith(prefix)) return true;
    const cardId = p.cardId.slice(prefix.length);
    return !cardIds.has(cardId);
  });
  lsSet(PROGRESS_KEY, filtered);
}

/* ─────────────────────────────────────────
   Progress (SRS state per card)
   ───────────────────────────────────────── */
function makeProgressKey(setId: string, cardId: string): string {
  return `${setId}::${cardId}`;
}

/** Migrate a legacy progress entry (without SM-2 fields) to the new shape. */
function migrateProgress(p: FlashcardProgress): FlashcardProgress {
  if (typeof p.easeFactor === "number" && typeof p.interval === "number") {
    return p; // already migrated
  }
  // Derive SM-2 state from old bucket + review counts
  let interval = 0;
  let repetitions = 0;
  if (p.bucket === "learning") {
    interval = 1;
    repetitions = 1;
  } else if (p.bucket === "known") {
    interval = 4;
    repetitions = Math.max(1, Math.min(p.correct, 5));
  }
  return {
    ...p,
    easeFactor: 2.5,
    interval,
    repetitions,
    dueAt: p.nextReviewAt,
  };
}

export function getAllProgress(): FlashcardProgress[] {
  // In-memory cache: lsGet + JSON.parse on a large progress blob is the
  // dominant cost for the Hub and Stats pages (called once per set).
  // We invalidate the cache automatically whenever any lsSet touches
  // PROGRESS_KEY, so this stays correct under concurrent tabs.
  if (progressCache) return progressCache;
  const raw = lsGet<FlashcardProgress[]>(PROGRESS_KEY, []);
  // Always run migration on read so old data works seamlessly
  progressCache = raw.map(migrateProgress);
  return progressCache;
}

export function getProgressForSet(setId: string): FlashcardProgress[] {
  return getAllProgress().filter((p) => p.cardId.startsWith(`${setId}::`));
}

/**
 * Wipe all SRS progress for a given set. Returns the number of entries
 * removed. Useful when the user wants to start over (e.g. they previously
 * rated every card "easy" in a test run and now the queue is permanently
 * empty for a set they never really learned).
 */
export function resetSetProgress(setId: string): number {
  const prefix = `${setId}::`;
  const all = getAllProgress();
  const kept = all.filter((p) => !p.cardId.startsWith(prefix));
  const removed = all.length - kept.length;
  if (removed > 0) {
    lsSet(PROGRESS_KEY, kept);
    invalidateProgressCache();
  }
  return removed;
}

export function getProgressForCard(setId: string, cardId: string): FlashcardProgress {
  const key = makeProgressKey(setId, cardId);
  const found = getAllProgress().find((p) => p.cardId === key);
  return (
    found ?? {
      cardId: key,
      bucket: "new",
      reviews: 0,
      correct: 0,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
    }
  );
}

function setProgressForCard(setId: string, cardId: string, next: FlashcardProgress): void {
  const key = makeProgressKey(setId, cardId);
  // Read raw (not migrated) so we don't pile up duplicate keys
  const raw = lsGet<FlashcardProgress[]>(PROGRESS_KEY, []);
  const idx = raw.findIndex((p) => p.cardId === key);
  if (idx >= 0) raw[idx] = next;
  else raw.push(next);
  lsSet(PROGRESS_KEY, raw);
}

/* ─────────────────────────────────────────
   SM-2 algorithm
   Reference: https://super-memory.com/english/ol/sm2.htm
   ───────────────────────────────────────── */

/** Map a 4-button rating to an SM-2 quality score (0-5). */
function ratingToQuality(rating: "again" | "hard" | "good" | "easy"): number {
  switch (rating) {
    case "again":
      return 1; // wrong response; the correct one was easy to recall
    case "hard":
      return 3; // correct but with serious difficulty
    case "good":
      return 4; // correct after hesitation
    case "easy":
      return 5; // perfect response
  }
}

/** Pretty-print an interval (days) for the UI.
 *  - 0   → "<1 phút"  (lapse, scheduled ~10 min later)
 *  - 1   → "1 ngày"
 *  - N   → "N ngày"
 *  - 30+ → "N tháng" (approx)
 */
export function formatInterval(intervalDays: number): string {
  if (intervalDays <= 0) return "<1 phút";
  if (intervalDays === 1) return "1 ngày";
  if (intervalDays < 30) return `${intervalDays} ngày`;
  const months = Math.round(intervalDays / 30);
  return months === 1 ? "1 tháng" : `${months} tháng`;
}

/** Pick a display bucket from SM-2 state. */
function bucketFor(repetitions: number, interval: number): FlashcardBucket {
  if (repetitions === 0) return "new";
  if (interval < 1) return "learning";
  return "known";
}

/**
 * Compute the next SM-2 state given the previous state and a user rating.
 * Returns the full new progress record (does not persist).
 *
 * Exported so the study UI can preview the next interval for each button
 * (e.g. "Hard → 3 days", "Easy → 12 days").
 */
export function sm2Next(
  prev: FlashcardProgress,
  rating: "again" | "hard" | "good" | "easy",
): FlashcardProgress {
  const q = ratingToQuality(rating);
  const isCorrect = rating === "good" || rating === "easy";

  // Default ease factor (legacy entries may be missing it)
  const prevEase = typeof prev.easeFactor === "number" ? prev.easeFactor : 2.5;
  const prevInterval = typeof prev.interval === "number" ? prev.interval : 0;
  const prevReps = typeof prev.repetitions === "number" ? prev.repetitions : 0;

  // Update ease factor: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  // Clamp to >= 1.3
  let easeFactor = prevEase + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  let repetitions: number;
  let interval: number;

  if (!isCorrect) {
    // Lapse: reset reps, schedule for ~10 min
    repetitions = 0;
    interval = 0; // 0 days → use 10 minutes in scheduling below
  } else if (prevReps === 0) {
    repetitions = 1;
    interval = 1; // first success: review tomorrow
  } else if (prevReps === 1) {
    repetitions = 2;
    interval = 3; // second success: 3 days
  } else {
    repetitions = prevReps + 1;
    interval = Math.round(prevInterval * easeFactor);
    if (interval < 1) interval = 1;
    if (interval > 365) interval = 365; // cap at 1 year
  }

  // "easy" rating gets a bonus: bump interval by 1.3x and ease by +0.15
  if (rating === "easy") {
    interval = Math.round(interval * 1.3);
    easeFactor = Math.min(easeFactor + 0.15, 3.0);
    if (interval < 4) interval = 4;
  }

  const bucket = bucketFor(repetitions, interval);
  // For lapses we want a short re-show (10 min), so the queue picks them up
  // again in the same session.
  const minutes = interval === 0 ? 10 : interval * 24 * 60;
  const nextAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

  return {
    ...prev,
    bucket,
    reviews: prev.reviews + 1,
    correct: prev.correct + (isCorrect ? 1 : 0),
    lastReviewedAt: new Date().toISOString(),
    nextReviewAt: nextAt,
    easeFactor,
    interval,
    repetitions,
    dueAt: nextAt,
  };
}

/** Record a user rating and persist. Returns the new progress. */
export function rateFlashcard(
  setId: string,
  cardId: string,
  rating: "again" | "hard" | "good" | "easy",
): FlashcardProgress {
  const prev = getProgressForCard(setId, cardId);
  const next = sm2Next(prev, rating);
  setProgressForCard(setId, cardId, next);
  return next;
}

/* ─────────────────────────────────────────
   Study session queue builder
   ───────────────────────────────────────── */

export interface SetStudyStats {
  total: number;
  new: number;
  learning: number;
  known: number;
  /** Percentage 0-100 of cards in `known` bucket. */
  mastery: number;
  /** Average ease factor across all cards with progress (default 2.5). */
  avgEase?: number;
}

/** Return aggregate stats for a set. */
export function getSetStats(setId: string, totalCards: number): SetStudyStats {
  const progress = getProgressForSet(setId);
  const counts = { new: 0, learning: 0, known: 0 };
  let easeSum = 0;
  let easeCount = 0;
  for (const p of progress) {
    counts[p.bucket] += 1;
    if (typeof p.easeFactor === "number") {
      easeSum += p.easeFactor;
      easeCount += 1;
    }
  }
  // Cards without any progress entry are also "new"
  const accountedFor = counts.new + counts.learning + counts.known;
  counts.new += Math.max(0, totalCards - accountedFor);
  const mastery = totalCards === 0 ? 0 : Math.round((counts.known / totalCards) * 100);
  const avgEase = easeCount > 0 ? Math.round((easeSum / easeCount) * 100) / 100 : 2.5;
  return { total: totalCards, ...counts, mastery, avgEase };
}

/**
 * Count cards in a set whose `nextReviewAt` has passed (or has no progress yet).
 * Used by the Hub to show a "🟢 N thẻ đến hạn" badge on each set card.
 */
export function getDueCount(setId: string, totalCards: number): number {
  const now = Date.now();
  const progress = getProgressForSet(setId);
  let due = 0;
  for (const p of progress) {
    // Re-show lapses (repetitions === 0) right away — they always re-appear
    // in today's session.
    if (p.repetitions === 0 && p.bucket !== "new") {
      due += 1;
      continue;
    }
    const nextAt = parseReviewAt(p.nextReviewAt);
    if (nextAt > 0 && nextAt <= now) due += 1;
  }
  // Cards with no progress entry are also "new + due" (we'll show them in
  // the first study session), but cap so the badge doesn't explode on huge sets.
  const accountedFor = progress.length;
  const unseenNew = Math.max(0, totalCards - accountedFor);
  return Math.min(due + unseenNew, totalCards);
}

/** Build a study queue: due/difficult cards first, then new cards. */
export function buildStudyQueue(setId: string, cards: { id: string }[]): string[] {
  const now = Date.now();
  const progress = getProgressForSet(setId);
  const map = new Map(progress.map((p) => [p.cardId, p]));

  // Categorize cards
  const due: { id: string; weight: number }[] = [];
  const newCards: string[] = [];

  for (const c of cards) {
    const p = map.get(makeProgressKey(setId, c.id));
    if (!p || p.bucket === "new") {
      newCards.push(c.id);
      continue;
    }
    const nextAt = p.nextReviewAt ? new Date(p.nextReviewAt).getTime() : 0;
    if (nextAt <= now) {
      // Weight by:
      //   - how overdue the card is (more overdue → higher priority),
      //     capped at 30 days so that a card overdue a year still loses to
      //     a lapse as the docs promise.
      //   - lower ease factor (harder cards) → higher priority
      //   - lapses (repetitions === 0) get a massive boost so they re-appear
      //     before any overdue card.
      const overdueRawSec = Math.max(0, (now - nextAt) / 1000);
      const overdueSec = Math.min(overdueRawSec, 30 * 24 * 3600); // cap 30d
      const ease = typeof p.easeFactor === "number" ? p.easeFactor : 2.5;
      const easePenalty = (2.5 - ease) * 1000; // harder cards (low EF) get +weight
      const lapseBoost = p.repetitions === 0 ? 1e12 : 0;
      due.push({ id: c.id, weight: overdueSec + easePenalty + lapseBoost });
    }
  }

  // Sort due by weight desc (most overdue / hardest first)
  due.sort((a, b) => b.weight - a.weight);
  const dueIds = due.map((d) => d.id);
  // Shuffle new cards slightly for variety (Fisher-Yates)
  for (let i = newCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newCards[i], newCards[j]] = [newCards[j], newCards[i]];
  }
  return [...dueIds, ...newCards];
}

/* ─────────────────────────────────────────
   Cross-set review queue (Hub → "Ôn tất cả đến hạn")
   ───────────────────────────────────────── */

export interface DueCard {
  setId: string;
  setName: string;
  setColor: string;
  card: { id: string; front: string; back: string; example?: string };
  /** SM-2 progress for this card (or a "new" placeholder). */
  progress: FlashcardProgress;
}

export interface CrossSetReview {
  /** Ordered review queue. Lapses first, then most-overdue, then new. */
  cards: DueCard[];
  /** Total cards considered due across all sets. */
  totalDue: number;
  /** Per-set counts so the Hub can show a quick breakdown. */
  perSet: Array<{ setId: string; setName: string; setColor: string; due: number }>;
}

/**
 * Build a unified "review all due cards" queue across every flashcard set
 * the user has access to (built-in + user-created). Cards are prioritized:
 *   1. Lapses (repetitions === 0 after a wrong answer) — re-shown immediately
 *   2. Most overdue cards (largest `now - nextReviewAt`)
 *   3. Harder cards first (lower ease factor → higher priority)
 *   4. New cards (never seen) come last, shuffled for variety
 */
export function buildCrossSetReviewQueue(): CrossSetReview {
  // "all" reuses the same machinery as buildFilteredCrossSetReview; this is a
  // thin wrapper kept for back-compat with existing callers.
  return buildFilteredCrossSetReview("all");
}

/** Lightweight summary used by the Hub CTA without paying the full build cost. */
export function getCrossSetDueSummary(): { totalDue: number; perSetCount: number } {
  // Reuse the shared categorizer so we don't walk the cards twice when both
  // this and `getCrossSetFilterCounts` are called on the same render.
  const { counts, byBucket } = categorizeAllCards();
  const setsWithDue = new Set<string>();
  for (const entry of [...byBucket.lapse, ...byBucket.overdue, ...byBucket.new]) {
    setsWithDue.add(entry.card.setId);
  }
  return { totalDue: counts.all, perSetCount: setsWithDue.size };
}

/** Cross-set review filter. Determines which slice of cards to include. */
export type ReviewFilter = "all" | "lapses" | "due" | "new";

/** Bucketing helper used both for filtering and for per-card categorization. */
type ReviewBucket = "lapse" | "overdue" | "new";

interface CategorizedCard {
  card: DueCard;
  bucket: ReviewBucket;
}

/**
 * Build a queue filtered by `filter`. Useful when the user wants to focus on
 * one category (e.g. just lapses, or just brand-new cards).
 *
 * - "all"     → all due cards (lapses + overdue + new), same priority as
 *               `buildCrossSetReviewQueue`
 * - "lapses"  → only cards the user got wrong recently (need immediate re-show)
 * - "due"     → lapses + overdue (no new cards)
 * - "new"     → only cards with no progress yet
 */
export function buildFilteredCrossSetReview(filter: ReviewFilter): CrossSetReview {
  const { counts, byBucket } = categorizeAllCards();
  const overdue: (CategorizedCard & { _weight: number })[] = byBucket.overdue.map((x) => ({
    ...x,
    _weight: computeOverdueWeight(x),
  }));

  // New cards: shuffle so the user doesn't always see the same set first.
  const newShuffled = [...byBucket.new];
  for (let i = newShuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newShuffled[i], newShuffled[j]] = [newShuffled[j], newShuffled[i]];
  }
  // Overdue: sort by weight desc (most overdue + hardest first), then strip
  // the side-channel weight field.
  overdue.sort((a, b) => b._weight - a._weight);
  const overdueClean: DueCard[] = overdue.map(({ _weight: _w, ...rest }) => rest.card);
  const newClean: DueCard[] = newShuffled.map((x) => x.card);
  const lapsesClean: DueCard[] = byBucket.lapse.map((x) => x.card);

  let cards: DueCard[];
  if (filter === "lapses") cards = lapsesClean;
  else if (filter === "due") cards = [...lapsesClean, ...overdueClean];
  else if (filter === "new") cards = newClean;
  else cards = [...lapsesClean, ...overdueClean, ...newClean];

  // Rebuild perSet summary from filtered cards
  const perSetMap = new Map<string, { setId: string; setName: string; setColor: string; due: number }>();
  for (const c of cards) {
    const cur = perSetMap.get(c.setId) ?? { setId: c.setId, setName: c.setName, setColor: c.setColor, due: 0 };
    cur.due += 1;
    perSetMap.set(c.setId, cur);
  }

  // `counts` is captured to silence the unused-variable warning — the caller
  // gets it via the separate `getCrossSetFilterCounts` helper instead, but we
  // keep the call here so the scan is shared if a caller asks for both.
  void counts;

  return {
    cards,
    totalDue: cards.length,
    perSet: Array.from(perSetMap.values()).sort((a, b) => b.due - a.due),
  };
}

/** Per-filter counts used by the filter chips on the review page. */
export function getCrossSetFilterCounts(): Record<ReviewFilter, number> {
  const { counts } = categorizeAllCards();
  return counts;
}

/** Compute the priority weight for an overdue card (used to sort the queue). */
function computeOverdueWeight(entry: CategorizedCard): number {
  const p = entry.card.progress;
  const nextAt = parseReviewAt(p.nextReviewAt);
  const overdueSec = Math.max(0, (Date.now() - nextAt) / 1000);
  const ease = typeof p.easeFactor === "number" ? p.easeFactor : 2.5;
  const easePenalty = (2.5 - ease) * 1000;
  return overdueSec + easePenalty;
}

/**
 * Internal helper: bucket every (set, card) into lapse/overdue/new and return
 * both the per-bucket arrays and the per-filter counts in one pass. Callers
 * that need both should invoke this once instead of running `buildFiltered…`
 * + `getCrossSetFilterCounts` separately.
 */
function categorizeAllCards(): {
  counts: Record<ReviewFilter, number>;
  byBucket: { lapse: CategorizedCard[]; overdue: CategorizedCard[]; new: CategorizedCard[] };
} {
  const sets = getAllFlashcardSets();
  const now = Date.now();
  const allProgress = getAllProgress();
  const progressMap = new Map(allProgress.map((p) => [p.cardId, p]));
  const lapse: CategorizedCard[] = [];
  const overdue: CategorizedCard[] = [];
  const newBucket: CategorizedCard[] = [];

  for (const set of sets) {
    for (const card of set.cards) {
      const key = makeProgressKey(set.id, card.id);
      const p = progressMap.get(key);
      const base = {
        setId: set.id,
        setName: set.name,
        setColor: set.color,
        card,
      };
      if (!p || p.bucket === "new") {
        newBucket.push({
          card: {
            ...base,
            progress: p ?? {
              cardId: key,
              bucket: "new",
              reviews: 0,
              correct: 0,
              easeFactor: 2.5,
              interval: 0,
              repetitions: 0,
            },
          },
          bucket: "new",
        });
        continue;
      }
      if (p.repetitions === 0) {
        lapse.push({ card: { ...base, progress: p }, bucket: "lapse" });
        continue;
      }
    const rawNextAt = parseReviewAt(p.nextReviewAt);
    const nextAt = Number.isFinite(rawNextAt) ? rawNextAt : 0;
    if (nextAt > 0 && nextAt <= now) {
        overdue.push({ card: { ...base, progress: p }, bucket: "overdue" });
      }
    }
  }

  return {
    counts: {
      all: lapse.length + overdue.length + newBucket.length,
      lapses: lapse.length,
      due: lapse.length + overdue.length,
      new: newBucket.length,
    },
    byBucket: { lapse, overdue, new: newBucket },
  };
}

/** Generate N distractor strings for multi-choice mode.
 * Picks from other cards' `back` text, weighted by textual similarity to the
 * correct answer (so distractors feel plausible, not random). Always returns
 * `count` unique strings — falls back to deterministic placeholders if the
 * set is tiny.
 */
export function generateDistractors(
  targetCardId: string,
  cards: { id: string; back: string }[],
  count = 3,
): string[] {
  const others = cards.filter((c) => c.id !== targetCardId);
  const targetBack = cards.find((c) => c.id === targetCardId)?.back ?? "";

  const scored = others.map((c) => {
    const sim = similarity(c.back, targetBack);
    // Similar distractors are more compelling, but never 1 (would repeat the
    // answer). Add small jitter so repeated sessions don't generate the
    // exact same choice order.
    const norm = Math.min(0.95, Math.max(0.15, sim));
    return { back: c.back, w: norm * (0.5 + Math.random() * 0.7) };
  });

  // Weighted pick without replacement
  const picked: string[] = [];
  const seen = new Set<string>();
  const pool = [...scored];
  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    let chosenIdx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].w;
      if (r <= 0) {
        chosenIdx = i;
        break;
      }
    }
    const chosen = pool[chosenIdx];
    if (!seen.has(chosen.back)) {
      picked.push(chosen.back);
      seen.add(chosen.back);
    }
    pool.splice(chosenIdx, 1);
  }

  // Padding if the set has too few unique backs (user-created tiny sets)
  let pad = 1;
  while (picked.length < count) {
    const fallback = `Lựa chọn khác ${pad}`;
    if (!seen.has(fallback)) {
      picked.push(fallback);
      seen.add(fallback);
    }
    pad += 1;
  }

  return picked;
}

/**
 * Compose a shuffled list of multi-choice options for one target card.
 * Convenience wrapper around `generateDistractors` so callers don't have to
 * re-implement the `[correct, ...distractors]` + Fisher-Yates shuffle dance.
 *
 * @param targetCardId - the card whose `back` is the correct answer
 * @param cards        - the pool of cards to draw distractors from
 * @param distractorCount - how many wrong answers to include (default 3 → 4 options total)
 * @returns shuffled `string[]` of length `distractorCount + 1` containing
 *          the correct answer at a random position
 */
export function buildChoiceOptions(
  targetCardId: string,
  cards: { id: string; back: string }[],
  distractorCount = 3,
): string[] {
  const target = cards.find((c) => c.id === targetCardId);
  if (!target) return [];
  const distractors = generateDistractors(targetCardId, cards, distractorCount);
  const options = [target.back, ...distractors];
  // Fisher-Yates shuffle so the correct answer isn't always first
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

/**
 * Lower-level variant of `buildChoiceOptions` that lets the caller supply the
 * distractor pool directly. Used by the cross-set review page so distractors
 * come from the current session (related vocabulary) rather than the full
 * target card's home set.
 *
 * If `pool` is too small to produce `distractorCount` unique strings, pads
 * with deterministic placeholders so the returned array always has the
 * requested length + 1 (correct answer included).
 */
export function buildChoiceOptionsFromPool(
  correctBack: string,
  pool: { id: string; back: string }[],
  distractorCount = 3,
): string[] {
  const scored = pool
    .filter((c) => c.back !== correctBack)
    .map((c) => ({
      back: c.back,
      w: Math.max(0.2, Math.min(0.9, similarity(c.back, correctBack))),
    }));

  const distractors: string[] = [];
  const seen = new Set<string>([correctBack]);
  while (distractors.length < distractorCount && scored.length > 0) {
    const total = scored.reduce((s, x) => s + x.w, 0);
    if (total <= 0) break;
    let r = Math.random() * total;
    let idx = 0;
    for (let j = 0; j < scored.length; j++) {
      r -= scored[j].w;
      if (r <= 0) { idx = j; break; }
    }
    const chosen = scored[idx];
    if (!chosen) break;
    if (!seen.has(chosen.back)) {
      distractors.push(chosen.back);
      seen.add(chosen.back);
    }
    scored.splice(idx, 1);
  }

  // Pad if the pool is too small
  let pad = 1;
  while (distractors.length < distractorCount) {
    const fallback = `Lựa chọn khác ${pad}`;
    if (!seen.has(fallback)) {
      distractors.push(fallback);
      seen.add(fallback);
    }
    pad += 1;
  }

  const options = [correctBack, ...distractors];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

/** Daily activity entry (one per day). Used by the stats page. */
export interface DailyActivity {
  /** YYYY-MM-DD */
  date: string;
  /** Number of card reviews on this day. */
  reviews: number;
  /** Number of correct ratings on this day. */
  correct: number;
}

/**
 * Build a per-day activity map for the last `days` calendar days.
 * Safe to call on the client; reads from localStorage.
 */
export function getDailyActivity(days = 30): DailyActivity[] {
  const all = getAllProgress();
  const map = new Map<string, { reviews: number; correct: number }>();
  for (const p of all) {
    if (!p.lastReviewedAt) continue;
    const d = toLocalDayKeyFromISO(p.lastReviewedAt);
    const entry = map.get(d) ?? { reviews: 0, correct: 0 };
    entry.reviews += 1;
    entry.correct += p.correct > 0 ? 1 : 0;
    map.set(d, entry);
  }
  const result: DailyActivity[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = localDayKey(d);
    const entry = map.get(key) ?? { reviews: 0, correct: 0 };
    result.push({ date: key, reviews: entry.reviews, correct: entry.correct });
  }
  return result;
}

/** Compute current consecutive-day streak (today counts). */
export function getStudyStreak(): number {
  const all = getAllProgress();
  const set = new Set<string>();
  for (const p of all) {
    if (p.lastReviewedAt) set.add(toLocalDayKeyFromISO(p.lastReviewedAt));
  }
  if (set.size === 0) return 0;
  let streak = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // Walk backwards from today; stop on first day with no activity
  while (true) {
    const key = localDayKey(d);
    if (set.has(key)) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    } else {
      // Allow today to be empty without breaking the streak (user may study later)
      if (streak === 0 && key === localDayKey(new Date())) {
        d.setDate(d.getDate() - 1);
        continue;
      }
      break;
    }
  }
  return streak;
}

/** Aggregate user-level stats across all sets. */
export interface OverallStats {
  totalReviews: number;
  totalCorrect: number;
  accuracy: number; // 0-100
  knownCards: number;
  learningCards: number;
  dueNow: number;
  streak: number;
  avgEase: number;
}

export function getOverallStats(): OverallStats {
  const all = getAllProgress();
  let totalReviews = 0;
  let totalCorrect = 0;
  let known = 0;
  let learning = 0;
  let easeSum = 0;
  let easeCount = 0;
  const now = Date.now();
  let dueNow = 0;
  for (const p of all) {
    totalReviews += p.reviews;
    totalCorrect += p.correct;
    if (p.bucket === "known") known += 1;
    if (p.bucket === "learning") learning += 1;
    if (typeof p.easeFactor === "number") {
      easeSum += p.easeFactor;
      easeCount += 1;
    }
    const nextAt = parseReviewAt(p.nextReviewAt);
    if (p.bucket !== "new" && nextAt > 0 && nextAt <= now) dueNow += 1;
  }
  const accuracy = totalReviews === 0 ? 0 : Math.round((totalCorrect / totalReviews) * 100);
  const avgEase = easeCount > 0 ? Math.round((easeSum / easeCount) * 100) / 100 : 2.5;
  return {
    totalReviews,
    totalCorrect,
    accuracy,
    knownCards: known,
    learningCards: learning,
    dueNow,
    streak: getStudyStreak(),
    avgEase,
  };
}

/* ─────────────────────────────────────────
   CSV / TXT import
   ───────────────────────────────────────── */

/**
 * Defensive caps for the importer. Pasting 1 GB of "a,b" into the modal
 * would otherwise freeze the parser and overflow `lsSet`, which would
 * silently lose the new set (see Quota handling). Keep these values generous
 * but bounded.
 */
const IMPORT_MAX_CARDS = 5000;
const IMPORT_MAX_FIELD_LENGTH = 200;
const IMPORT_MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB raw input

export interface ImportResult {
  ok: boolean;
  message: string;
  imported?: number;
  set?: FlashcardSet;
}

/**
 * Parse a single CSV / TSV record. Implements a small subset of RFC 4180:
 *   - supports both `,` and `\t` as the field delimiter (whichever the
 *     caller passes);
 *   - supports `"…"`-quoted fields that may contain the delimiter, e.g.
 *     `"to commit, to pledge","giao kết"`;
 *   - supports `""` inside a quoted field as a literal `"`.
 * Trailing whitespace is preserved inside quoted fields but trimmed
 * outside (matching common user expectation).
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        // Escaped quote inside a quoted field: "" → "
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        // Only enter quote mode at the very start of a field — this avoids
        // breaking user input that happens to start with a stray quote.
        if (cur.length === 0) inQuotes = true;
        else cur += ch;
      } else if (ch === delimiter) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}

/** Parse a CSV / TXT file into a FlashcardSet. Each line should look like:
 *  - `front,back`
 *  - `front,back,example`
 *  - `front\tback\texample`   (tab-separated)
 *  - `"quoted front with, comma","quoted back",example`
 *  Lines starting with `#` are treated as comments.
 *  The first non-comment line may be a `name` header. We try to detect by
 *  checking if the file has a `# name:` marker. */
export function parseFlashcardImport(raw: string, fileName: string): ImportResult {
  if (!raw || !raw.trim()) {
    return { ok: false, message: "File rỗng" };
  }
  if (raw.length > IMPORT_MAX_FILE_BYTES) {
    return {
      ok: false,
      message: `File quá lớn (>${IMPORT_MAX_FILE_BYTES / 1024 / 1024} MB). Hãy tách nhỏ trước khi import.`,
    };
  }
  const lines = raw.split(/\r?\n/);
  const cards: { front: string; back: string; example?: string }[] = [];
  let nameHint: string | null = null;
  let descriptionHint: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith("# name:")) {
      nameHint = line.replace(/^#\s*name:\s*/i, "").trim();
      continue;
    }
    if (line.startsWith("# description:")) {
      descriptionHint = line.replace(/^#\s*description:\s*/i, "").trim();
      continue;
    }
    if (line.startsWith("#")) continue;

    // Pick the delimiter per-line: a tab anywhere in the line wins, then
    // a comma. (Mixed-delimiter files are unusual; this matches the
    // existing behavior.)
    const delimiter = line.includes("\t") ? "\t" : ",";
    const parts = parseCSVLine(line, delimiter);
    if (parts.length < 2) {
      return {
        ok: false,
        message: `Dòng ${i + 1} không hợp lệ: "${line}". Định dạng: front,back[,example]`,
      };
    }
    const [frontRaw, backRaw, exampleRaw] = parts;
    const front = (frontRaw ?? "").trim();
    const back = (backRaw ?? "").trim();
    const example = (exampleRaw ?? "").trim() || undefined;
    if (!front || !back) {
      return {
        ok: false,
        message: `Dòng ${i + 1} có cột rỗng: "${line}"`,
      };
    }
    if (front.length > IMPORT_MAX_FIELD_LENGTH || back.length > IMPORT_MAX_FIELD_LENGTH) {
      return {
        ok: false,
        message: `Dòng ${i + 1} quá dài (>${IMPORT_MAX_FIELD_LENGTH} ký tự / cột).`,
      };
    }
    if (cards.length >= IMPORT_MAX_CARDS) {
      return {
        ok: false,
        message: `Vượt quá giới hạn ${IMPORT_MAX_CARDS} thẻ / lần import. Hãy tách file nhỏ hơn.`,
      };
    }
    cards.push({ front, back, example });
  }

  if (cards.length === 0) {
    return { ok: false, message: "Không tìm thấy thẻ nào hợp lệ trong file" };
  }

  // Build a set id from the file name + timestamp
  const safeName = fileName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const id = `import:${safeName || "set"}-${Date.now().toString(36)}`;

  const set: FlashcardSet = {
    id,
    name: nameHint || fileName.replace(/\.[^.]+$/, ""),
    description: descriptionHint || `Import từ ${fileName} (${cards.length} thẻ)`,
    icon: "file-text",
    color: "#f59e0b",
    cards: cards.map((c, i) => ({
      id: `c-${i + 1}`,
      front: c.front,
      back: c.back,
      example: c.example,
    })),
  };

  return { ok: true, message: `Import thành công ${cards.length} thẻ`, imported: cards.length, set };
}

/** Persist an imported set to localStorage. */
export function importFlashcardSet(set: FlashcardSet): void {
  saveUserFlashcardSet(set);
}
