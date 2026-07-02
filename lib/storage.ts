import { QuizResult, LeaderboardEntry, QuizState } from "./types";
import {
  collection,
  addDoc,
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
  if (isFirebaseConfigured && _auth) {
    await new Promise<void>((resolve) => {
      if (_auth.currentUser) { resolve(); return; }
      const unsub = _auth.onAuthStateChanged(() => {
        unsub();
        resolve();
      });
      setTimeout(resolve, 3000);
    });
  }

  const currentUser = isFirebaseConfigured && _auth ? _auth.currentUser : null;
  const uid = currentUser ? currentUser.uid : `local-${getOrCreateAnonSessionId()}`;
  const isAnon = currentUser ? currentUser.isAnonymous : false;

  const playerName = (result.playerName && result.playerName.trim().length >= 2)
    ? result.playerName.trim().slice(0, 30)
    : "Anonymouse";

  const history = getHistory();
  const exists = history.some((h) => h.id === result.id);
  if (!exists) {
    history.unshift({ ...result, playerName });
    lsSet(HISTORY_KEY, history.slice(0, 100));
  }

  let cloudSaved = false;

  if (isFirebaseConfigured && db) {
    try {
      await addDoc(collection(db, "leaderboard"), {
        playerName,
        score: result.score,
        percentage: result.percentage,
        setName: result.setName,
        date: result.date,
        uid,
        timestamp: Date.now(),
      });

      if (!isAnon) {
        await addDoc(collection(db, "users", uid, "history"), {
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
      } else if (currentUser) {
        // Anonymous Firebase user: save to their anonymous Firebase UID
        await addDoc(collection(db, "users", currentUser.uid, "history"), {
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
      }

      // Update user stats — both anonymous and non-anonymous Firebase users
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        try {
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
        } catch (err) {
          console.warn("[storage] user stats update failed:", err);
        }
      }

      cloudSaved = true;
    } catch (err) {
      console.warn("[storage] saveResult cloud failed:", err);
    }
  }

  const local = getLeaderboardLocal();
  const newEntry: LeaderboardEntry = {
    playerName,
    score: result.score,
    percentage: result.percentage,
    setName: result.setName,
    date: result.date,
    uid,
  };
  const updated = deduplicateByBest([...local, newEntry]);
  lsSet(LEADERBOARD_KEY, updated.slice(0, 50));

  return { cloud: cloudSaved, local: true };
}

function getLeaderboardLocal(): LeaderboardEntry[] {
  return lsGet<LeaderboardEntry[]>(LEADERBOARD_KEY, []);
}

function deduplicateByBest(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const map = new Map<string, LeaderboardEntry>();
  for (const e of entries) {
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
 */
export function subscribeLeaderboard(
  cb: (entries: LeaderboardEntry[]) => void,
  max = 50,
): () => void {
  let active = true;

  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, "leaderboard"),
        orderBy("timestamp", "desc"),
        limit(max * 3),
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