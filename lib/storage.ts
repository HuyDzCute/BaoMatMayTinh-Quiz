import { QuizResult, LeaderboardEntry, QuizState } from "./types";
import {
  ref as rtdbRef,
  set as rtdbSet,
  get as rtdbGet,
  onValue as rtdbOnValue,
  update as rtdbUpdate,
  query as rtdbQuery,
  orderByChild as rtdbOrderByChild,
  limitToLast as rtdbLimitToLast,
} from "firebase/database";
import { rtdb, auth, isFirebaseConfigured } from "./firebase";
import { getOrCreateAnonSessionId } from "./session";
import { logger } from "./logger";

const HISTORY_KEY = "qthtm_quiz_history";
const LEADERBOARD_KEY = "qthtm_leaderboard";
const PLAYER_KEY = "qthtm_player_name";
const QUIZ_STATE_KEY = "qthtm_quiz_state";
const PENDING_SYNC_KEY = "qthtm_pending_sync";

// ─────────────────────────────────────────
//   Pending sync queue (retry when offline/failed)
// ─────────────────────────────────────────
interface PendingSyncItem {
  id: string;
  result: QuizResult;
  timestamp: number;
  retryCount: number;
}

function getPendingSync(): PendingSyncItem[] {
  return lsGet<PendingSyncItem[]>(PENDING_SYNC_KEY, []);
}

function addToPendingSync(result: QuizResult): void {
  const pending = getPendingSync();
  const exists = pending.some((p) => p.id === result.id);
  if (!exists) {
    pending.push({
      id: result.id,
      result,
      timestamp: Date.now(),
      retryCount: 0,
    });
    lsSet(PENDING_SYNC_KEY, pending.slice(0, 50));
  }
}

function removeFromPendingSync(id: string): void {
  const pending = getPendingSync().filter((p) => p.id !== id);
  lsSet(PENDING_SYNC_KEY, pending);
}

function incrementPendingRetry(id: string): number {
  const pending = getPendingSync();
  const item = pending.find((p) => p.id === id);
  if (item) {
    item.retryCount++;
    lsSet(PENDING_SYNC_KEY, pending);
    return item.retryCount;
  }
  return 0;
}

// ─────────────────────────────────────────
//   LocalStorage helpers (offline fallback)
// ─────────────────────────────────────────
function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key: string, val: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
}

export function getHistory(): QuizResult[] {
  return lsGet<QuizResult[]>(HISTORY_KEY, []);
}

export function getPlayerName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(PLAYER_KEY) || "";
}

export function setPlayerName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAYER_KEY, name.slice(0, 30));
}

export function saveQuizState(state: QuizState): void {
  lsSet(QUIZ_STATE_KEY, state);
}

export function getQuizState(): QuizState | null {
  return lsGet<QuizState | null>(QUIZ_STATE_KEY, null);
}

export function clearQuizState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(QUIZ_STATE_KEY);
}

// ─────────────────────────────────────────
//   Save result (cloud-first, local fallback)
// ─────────────────────────────────────────
export async function saveResult(result: QuizResult): Promise<{ cloud: boolean; local: boolean }> {
  const _auth = auth;

  // Wait for auth state with timeout
  if (isFirebaseConfigured && _auth) {
    const maxWait = 5000; // Increased from 3s to 5s
    const waited = await new Promise<boolean>((resolve) => {
      if (_auth!.currentUser) {
        resolve(true);
        return;
      }
      const unsub = _auth!.onAuthStateChanged(() => {
        unsub();
        resolve(true);
      });
      setTimeout(() => resolve(false), maxWait);
    });
    if (!waited) {
      logger.warn("[storage] Auth wait timeout - proceeding without user context");
    }
  }

  const currentUser = isFirebaseConfigured && _auth ? _auth.currentUser : null;
  const uid = currentUser ? currentUser.uid : `local-${getOrCreateAnonSessionId()}`;
  const isAnon = currentUser ? currentUser.isAnonymous : false;

  const playerName =
    result.playerName && result.playerName.trim().length >= 2
      ? result.playerName.trim().slice(0, 30)
      : "Anonymouse";

  // Always save to local history first
  const history = getHistory();
  const exists = history.some((h) => h.id === result.id);
  if (!exists) {
    history.unshift({ ...result, playerName });
    lsSet(HISTORY_KEY, history.slice(0, 100));
  }

  let cloudLeaderboardSaved = false;
  let cloudHistorySaved = false;
  let cloudUserStatsSaved = false;

  if (isFirebaseConfigured && rtdb) {
    // 1. Save to leaderboard with deduplication
    try {
      const leaderboardDocId = `${uid}_${result.id}`;
      await rtdbSet(rtdbRef(rtdb, `leaderboard/${leaderboardDocId}`), {
        playerName,
        score: result.score,
        percentage: result.percentage,
        setName: result.setName,
        date: result.date,
        uid,
        timestamp: Date.now(),
      });
      cloudLeaderboardSaved = true;
    } catch (err) {
      logger.warn("[storage] saveResult leaderboard failed:", err);
      addToPendingSync(result);
    }

    // 2. Save to user history
    if (currentUser) {
      try {
        await rtdbSet(rtdbRef(rtdb, `users/${currentUser.uid}/history/${result.id}`), {
          playerName,
          setId: result.setId,
          setName: result.setName,
          score: result.score,
          totalQuestions: result.totalQuestions,
          correctCount: result.correctCount,
          wrongCount: result.wrongCount,
          percentage: result.percentage,
          answers: result.answers ?? [],
          speakingAnswers: result.speakingAnswers ?? [],
          timeSpent: result.timeSpent,
          date: result.date,
          timestamp: Date.now(),
        });
        cloudHistorySaved = true;
      } catch (err) {
        logger.warn("[storage] saveResult history failed:", err);
        addToPendingSync(result);
      }

      // 3. Update user stats
      try {
        const userRef = rtdbRef(rtdb, `users/${currentUser.uid}`);
        const snap = await rtdbGet(userRef);
        if (snap.exists()) {
          const cur = snap.val();
          await rtdbUpdate(userRef, {
            totalGames: (cur.totalGames ?? 0) + 1,
            bestScore: Math.max(result.score, cur.bestScore ?? 0),
            bestPercentage: Math.max(result.percentage, cur.bestPercentage ?? 0),
          });
        } else {
          await rtdbSet(userRef, {
            displayName: playerName,
            totalGames: 1,
            bestScore: result.score,
            bestPercentage: result.percentage,
            isAnonymous: currentUser.isAnonymous,
            createdAt: Date.now(),
          });
        }
        cloudUserStatsSaved = true;
      } catch (err) {
        logger.warn("[storage] user stats update failed:", err);
      }
    }
  }

  // Update local leaderboard with deduplication
  const localLeaderboard = getLeaderboardLocal();
  const newEntry: LeaderboardEntry = {
    playerName,
    score: result.score,
    percentage: result.percentage,
    setName: result.setName,
    date: result.date,
    uid,
  };
  const updated = deduplicateByBest(localLeaderboard, newEntry);
  lsSet(LEADERBOARD_KEY, updated.slice(0, 50));

  // Return overall cloud status
  const cloudSaved =
    cloudLeaderboardSaved && (currentUser ? cloudHistorySaved && cloudUserStatsSaved : true);

  // If cloud failed partially, add to retry queue
  if (!cloudSaved) {
    addToPendingSync(result);
  } else {
    // Remove from pending if it was there (success retry)
    removeFromPendingSync(result.id);
  }

  return { cloud: cloudSaved, local: true };
}

function getLeaderboardLocal(): LeaderboardEntry[] {
  return lsGet<LeaderboardEntry[]>(LEADERBOARD_KEY, []);
}

function deduplicateByBest(
  entries: LeaderboardEntry[],
  newEntry?: LeaderboardEntry,
): LeaderboardEntry[] {
  // Add new entry if provided
  const all = newEntry ? [...entries, newEntry] : entries;

  const map = new Map<string, LeaderboardEntry>();
  for (const e of all) {
    const key = e.uid ? e.uid : e.playerName.toLowerCase().trim();
    const existing = map.get(key);
    if (
      !existing ||
      e.percentage > existing.percentage ||
      (e.percentage === existing.percentage && e.score > existing.score)
    ) {
      map.set(key, e);
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    return b.score - a.score;
  });
}

/**
 * Lay top leaderboard.
 * - Neu co cloud + listener → dung callback (real-time).
 * - Neu khong → tra ve cache local.
 *
 * FIX: Order by percentage desc first (best scores), then by timestamp for ties
 */
export function subscribeLeaderboard(
  cb: (entries: LeaderboardEntry[]) => void,
  max = 50,
): () => void {
  let active = true;

  if (isFirebaseConfigured && rtdb) {
    try {
      const lbRef = rtdbQuery(rtdbRef(rtdb, "leaderboard"), rtdbLimitToLast(max * 5));
      const unsub = rtdbOnValue(
        lbRef,
        (snap) => {
          if (!active) return;
          const data = snap.val();
          if (!data) {
            cb([]);
            return;
          }
          const all: LeaderboardEntry[] = Object.values(data).map((d) => {
            const v = d as Record<string, unknown>;
            return {
              playerName: String(v.playerName ?? "Nguoi choi"),
              score: Number(v.score ?? 0),
              percentage: Number(v.percentage ?? 0),
              setName: String(v.setName ?? ""),
              date: String(v.date ?? new Date().toISOString()),
              uid: v.uid as string | undefined,
            };
          });
          const seen = new Map<string, LeaderboardEntry>();
          for (const e of all) {
            const key = e.uid ? e.uid : e.playerName.toLowerCase().trim();
            const prev = seen.get(key);
            if (
              !prev ||
              e.percentage > prev.percentage ||
              (e.percentage === prev.percentage && e.score > prev.score)
            ) {
              seen.set(key, e);
            }
          }
          const unique = Array.from(seen.values());
          unique.sort((a, b) => {
            if (b.percentage !== a.percentage) return b.percentage - a.percentage;
            return b.score - a.score;
          });
          cb(unique.slice(0, max));
        },
        (err) => {
          if (!active) return;
          logger.warn("[storage] leaderboard snapshot failed:", err);
          const local = deduplicateByBest(getLeaderboardLocal()).slice(0, max);
          cb(local);
        },
      );
      return () => {
        active = false;
        unsub();
      };
    } catch (err) {
      logger.warn("[storage] subscribeLeaderboard cloud failed:", err);
    }
  }
  cb(deduplicateByBest(getLeaderboardLocal()).slice(0, max));
  return () => {};
}

/** Backwards-compatible sync getter (tra ve local cache). */
export function getLeaderboard(): LeaderboardEntry[] {
  return getLeaderboardLocal();
}

// ─────────────────────────────────────────
//   Pending sync retry functions
// ─────────────────────────────────────────
/** Get count of pending sync items */
export function getPendingSyncCount(): number {
  return getPendingSync().length;
}

/** Retry all pending sync items (called when coming back online) */
export async function retryPendingSync(): Promise<{ success: number; failed: number }> {
  if (!isFirebaseConfigured || !rtdb) {
    return { success: 0, failed: 0 };
  }

  const pending = getPendingSync();
  if (pending.length === 0) return { success: 0, failed: 0 };

  let success = 0;
  let failed = 0;
  const _auth = auth;
  const currentUser = _auth?.currentUser ?? null;

  for (const item of pending) {
    // Skip if max retries exceeded (5 retries)
    if (item.retryCount >= 5) {
      failed++;
      continue;
    }

    try {
      const uid = currentUser ? currentUser.uid : `local-${getOrCreateAnonSessionId()}`;
      const isAnon = currentUser?.isAnonymous ?? false;
      const playerName = item.result.playerName?.trim() || "Anonymouse";

      // Retry leaderboard save
      const leaderboardDocId = `${uid}_${item.result.id}`;
      await rtdbSet(rtdbRef(rtdb, `leaderboard/${leaderboardDocId}`), {
        playerName,
        score: item.result.score,
        percentage: item.result.percentage,
        setName: item.result.setName,
        date: item.result.date,
        uid,
        timestamp: Date.now(),
      });

      // Retry history save if user is logged in
      if (currentUser) {
        await rtdbSet(rtdbRef(rtdb, `users/${currentUser.uid}/history/${item.result.id}`), {
          playerName,
          setId: item.result.setId,
          setName: item.result.setName,
          score: item.result.score,
          totalQuestions: item.result.totalQuestions,
          correctCount: item.result.correctCount,
          wrongCount: item.result.wrongCount,
          percentage: item.result.percentage,
          answers: item.result.answers ?? [],
          speakingAnswers: item.result.speakingAnswers ?? [],
          timeSpent: item.result.timeSpent,
          date: item.result.date,
          timestamp: Date.now(),
        });
      }

      removeFromPendingSync(item.id);
      success++;
    } catch (err) {
      logger.warn(`[storage] retry failed for ${item.id}:`, err);
      incrementPendingRetry(item.id);
      failed++;
    }
  }

  return { success, failed };
}

// ─────────────────────────────────────────
//   History cloud sync (user-specific)
// ─────────────────────────────────────────
export function subscribeHistory(uid: string, cb: (entries: QuizResult[]) => void): () => void {
  let active = true;

  if (isFirebaseConfigured && rtdb) {
    try {
      const histRef = rtdbQuery(
        rtdbRef(rtdb, `users/${uid}/history`),
        rtdbOrderByChild("timestamp"),
        rtdbLimitToLast(100),
      );
      const unsub = rtdbOnValue(
        histRef,
        (snap) => {
          if (!active) return;
          const data = snap.val();
          if (!data) {
            cb([]);
            return;
          }
          const arr: QuizResult[] = Object.entries(data).map(([id, d]) => {
            const v = d as Record<string, unknown>;
            const rawAnswers = (v.answers as unknown[]) ?? [];
            const answers: (number | string)[] = rawAnswers.map((a) =>
              typeof a === "number"
                ? String(a)
                : typeof a === "string" && !a.startsWith("{")
                  ? a
                  : (a as number | string),
            );
            return {
              id,
              playerName: String(v.playerName ?? "Nguoi choi"),
              setId: String(v.setId ?? ""),
              setName: String(v.setName ?? ""),
              score: Number(v.score ?? 0),
              totalQuestions: Number(v.totalQuestions ?? 0),
              correctCount: Number(v.correctCount ?? 0),
              wrongCount: Number(v.wrongCount ?? 0),
              percentage: Number(v.percentage ?? 0),
              answers,
              speakingAnswers: Array.isArray(v.speakingAnswers)
                ? (v.speakingAnswers as QuizResult["speakingAnswers"])
                : [],
              timeSpent: Number(v.timeSpent ?? 0),
              date: String(v.date ?? ""),
            };
          });
          arr.sort((a, b) => Number(b.date ? 0 : 0) - 0);
          cb(arr);
        },
        (err) => {
          if (!active) return;
          logger.warn("[storage] history snapshot failed:", err);
          cb(getHistory());
        },
      );
      return () => {
        active = false;
        unsub();
      };
    } catch (err) {
      logger.warn("[storage] subscribeHistory cloud failed:", err);
    }
  }
  cb(getHistory());
  return () => {};
}
