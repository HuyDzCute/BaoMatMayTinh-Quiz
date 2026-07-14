import { QuizResult, LeaderboardEntry, QuizState } from "./types";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  increment,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "./firebase";

const HISTORY_KEY = "qthtm_quiz_history";
const LEADERBOARD_KEY = "qthtm_leaderboard";
const PLAYER_KEY = "qthtm_player_name";
const QUIZ_STATE_KEY = "qthtm_quiz_state";
const ANON_SESSION_KEY = "qthtm_anon_session_id";
const PENDING_SYNC_KEY = "qthtm_pending_sync";

function getOrCreateAnonSessionId(): string {
  if (typeof window === "undefined") return "anon-unknown";
  try {
    let sid = localStorage.getItem(ANON_SESSION_KEY);
    if (!sid) {
      sid = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(ANON_SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

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
      if (_auth!.currentUser) { resolve(true); return; }
      const unsub = _auth!.onAuthStateChanged(() => {
        unsub();
        resolve(true);
      });
      setTimeout(() => resolve(false), maxWait);
    });
    if (!waited) {
      console.warn("[storage] Auth wait timeout - proceeding without user context");
    }
  }

  const currentUser = isFirebaseConfigured && _auth ? _auth.currentUser : null;
  const uid = currentUser ? currentUser.uid : `local-${getOrCreateAnonSessionId()}`;
  const isAnon = currentUser ? currentUser.isAnonymous : false;

  const playerName = (result.playerName && result.playerName.trim().length >= 2)
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

  if (isFirebaseConfigured && db) {
    // 1. Save to leaderboard with deduplication (use setDoc with predictable ID)
    try {
      // Create a deterministic doc ID based on uid and the specific result
      // This prevents duplicates for the same user+result combination
      const leaderboardDocId = `${uid}_${result.id}`;
      await setDoc(doc(db, "leaderboard", leaderboardDocId), {
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
      console.warn("[storage] saveResult leaderboard failed:", err);
      // Add to retry queue
      addToPendingSync(result);
    }

    // 2. Save to user history (only for non-anonymous users or anonymous Firebase users)
    if (currentUser) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "history", result.id), {
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
        console.warn("[storage] saveResult history failed:", err);
        addToPendingSync(result);
      }

      // 3. Update user stats
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          await updateDoc(userRef, {
            totalGames: increment(1),
            bestScore: Math.max(result.score, snap.data().bestScore ?? 0),
            bestPercentage: Math.max(result.percentage, snap.data().bestPercentage ?? 0),
          });
        } else {
          await setDoc(userRef, {
            displayName: playerName,
            totalGames: 1,
            bestScore: result.score,
            bestPercentage: result.percentage,
            isAnonymous: currentUser.isAnonymous,
            createdAt: serverTimestamp(),
          }, { merge: true });
        }
        cloudUserStatsSaved = true;
      } catch (err) {
        console.warn("[storage] user stats update failed:", err);
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
  const cloudSaved = cloudLeaderboardSaved && (currentUser ? (cloudHistorySaved && cloudUserStatsSaved) : true);
  
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

function deduplicateByBest(entries: LeaderboardEntry[], newEntry?: LeaderboardEntry): LeaderboardEntry[] {
  // Add new entry if provided
  let all = newEntry ? [...entries, newEntry] : entries;
  
  const map = new Map<string, LeaderboardEntry>();
  for (const e of all) {
    const key = e.uid ? e.uid : e.playerName.toLowerCase().trim();
    const existing = map.get(key);
    if (!existing || e.percentage > existing.percentage || (e.percentage === existing.percentage && e.score > existing.score)) {
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

  if (isFirebaseConfigured && db) {
    try {
      // Query all entries and sort client-side by percentage (best scores first)
      // This ensures users with the best percentage appear at top
      const q = query(
        collection(db, "leaderboard"),
        limit(max * 5), // Fetch more to ensure we have enough after deduplication
      );
      const unsub: Unsubscribe = onSnapshot(
        q,
        (snap) => {
          if (!active) return;
          if (!snap?.docs) { cb([]); return; }
          const all: LeaderboardEntry[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              playerName: data.playerName ?? "Nguoi choi",
              score: data.score ?? 0,
              percentage: data.percentage ?? 0,
              setName: data.setName ?? "",
              date: data.date ?? new Date().toISOString(),
              uid: data.uid,
            };
          });
          // Deduplicate: keep best score per uid
          const seen = new Map<string, LeaderboardEntry>();
          for (const e of all) {
            const key = e.uid ? e.uid : e.playerName.toLowerCase().trim();
            const prev = seen.get(key);
            if (!prev || e.percentage > prev.percentage || (e.percentage === prev.percentage && e.score > prev.score)) {
              seen.set(key, e);
            }
          }
          const unique = Array.from(seen.values());
          // Sort by percentage desc, then by score desc
          unique.sort((a, b) => {
            if (b.percentage !== a.percentage) return b.percentage - a.percentage;
            return b.score - a.score;
          });
          cb(unique.slice(0, max));
        },
        (err) => {
          if (!active) return;
          console.warn("[storage] leaderboard snapshot failed:", err);
          const local = deduplicateByBest(getLeaderboardLocal()).slice(0, max);
          cb(local);
        },
      );
      return () => {
        active = false;
        unsub();
      };
    } catch (err) {
      console.warn("[storage] subscribeLeaderboard cloud failed:", err);
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
  if (!isFirebaseConfigured || !db) {
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
      await setDoc(doc(db, "leaderboard", leaderboardDocId), {
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
        await setDoc(doc(db, "users", currentUser.uid, "history", item.result.id), {
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
      console.warn(`[storage] retry failed for ${item.id}:`, err);
      incrementPendingRetry(item.id);
      failed++;
    }
  }

  return { success, failed };
}

// ─────────────────────────────────────────
//   History cloud sync (user-specific)
// ─────────────────────────────────────────
export function subscribeHistory(
  uid: string,
  cb: (entries: QuizResult[]) => void,
): () => void {
  let active = true;

  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, "users", uid, "history"),
        orderBy("timestamp", "desc"),
        limit(100),
      );
      const unsub: Unsubscribe = onSnapshot(
        q,
        (snap) => {
          if (!active) return;
          const arr: QuizResult[] = snap.docs.map((d) => {
            const data = d.data();
            const rawAnswers = data.answers ?? [];
            const answers: (number | string)[] = rawAnswers.map((a: unknown) =>
              typeof a === "number" ? String(a) : typeof a === "string" && !a.startsWith("{") ? a : a
            );
            return {
              id: d.id,
              playerName: data.playerName ?? "Nguoi choi",
              setId: data.setId ?? "",
              setName: data.setName ?? "",
              score: data.score ?? 0,
              totalQuestions: data.totalQuestions ?? 0,
              correctCount: data.correctCount ?? 0,
              wrongCount: data.wrongCount ?? 0,
              percentage: data.percentage ?? 0,
              answers,
              speakingAnswers: Array.isArray(data.speakingAnswers) ? data.speakingAnswers : [],
              timeSpent: data.timeSpent ?? 0,
              date: data.date ?? "",
            };
          });
          cb(arr);
        },
        (err) => {
          if (!active) return;
          console.warn("[storage] history snapshot failed:", err);
          // Snapshot failed: fall back to local history
          const local = getHistory();
          cb(local);
        },
      );
      return () => {
        active = false;
        unsub();
      };
    } catch (err) {
      console.warn("[storage] subscribeHistory cloud failed:", err);
    }
  }
  cb(getHistory());
  return () => {};
}