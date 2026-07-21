"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInAnonymously,
  signOut as fbSignOut,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { auth, db, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import { setPlayerName, getPendingSyncCount, retryPendingSync as doRetryPendingSync } from "@/lib/storage";

const ANON_UID_KEY = "qthtm_anon_uid";
const ANON_SESSION_KEY = "qthtm_anon_session_id";
const HISTORY_KEY = "qthtm_quiz_history";

/** Tạo/mã hóa session ID ngẫu nhiên cho anonymous user. */
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

export type AppUser = {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
};

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  isCloudEnabled: boolean;
  isOnline: boolean;
  pendingSyncCount: number;
  signInWithGoogle: () => Promise<void>;
  signInAnon: () => Promise<void>;
  signInAnonWithName: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
  retryPendingSync: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toAppUser(u: User): AppUser {
  return {
    uid: u.uid,
    displayName: u.displayName || (u.isAnonymous ? "Khách" : "Người chơi"),
    email: u.email,
    photoURL: u.photoURL,
    isAnonymous: u.isAnonymous,
  };
}

/** Đồng bộ profile người dùng vào Firestore collection `users/{uid}` (best-effort). */
async function syncUserProfile(u: User) {
  if (!db) return;
  try {
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        displayName: u.displayName || "Người chơi",
        email: u.email ?? null,
        photoURL: u.photoURL ?? null,
        isAnonymous: u.isAnonymous,
        createdAt: serverTimestamp(),
        totalGames: 0,
        bestScore: 0,
        bestPercentage: 0,
      });
    }
  } catch (err) {
    console.warn("[auth] syncUserProfile failed:", err);
  }
}

/** Doc: Merge anonymous local history into the new Google account's Firestore history. */
async function mergeLocalHistoryToCloud(googleUid: string) {
  if (!db) return;
  const firestore = db;
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return;
    const localHistory = JSON.parse(raw);
    if (!Array.isArray(localHistory) || localHistory.length === 0) return;

    // Write all entries in parallel; if any fail, continue with the rest
    const writeResults = await Promise.allSettled(
      localHistory.map((result) =>
        addDoc(collection(firestore, "users", googleUid, "history"), {
          playerName: result.playerName ?? "Nguoi choi",
          setId: result.setId ?? "",
          setName: result.setName ?? "",
          score: result.score ?? 0,
          totalQuestions: result.totalQuestions ?? 0,
          correctCount: result.correctCount ?? 0,
          wrongCount: result.wrongCount ?? 0,
          percentage: result.percentage ?? 0,
          answers: result.answers ?? [],
          speakingAnswers: result.speakingAnswers ?? [],
          timeSpent: result.timeSpent ?? 0,
          date: result.date ?? new Date().toISOString(),
          timestamp: Date.now(),
        })
      )
    );
    const failedCount = writeResults.filter((r) => r.status === "rejected").length;
    if (failedCount > 0) {
      console.warn(`[auth] merge failed for ${failedCount}/${localHistory.length} entries — keeping local history`);
      return; // Don't clear local history if merge partially failed
    }
    localStorage.removeItem(HISTORY_KEY);
    console.info("[auth] merged", localHistory.length, "history entries to cloud");
  } catch (err) {
    console.warn("[auth] mergeLocalHistoryToCloud failed:", err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    // Skip Firebase on server or when not configured
    if (!isFirebaseConfigured || !auth) return null;
    return null; // real user comes from onAuthStateChanged
  });
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Track online/offline status
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleOnline = async () => {
      setIsOnline(true);
      // Retry pending syncs when coming back online
      if (isFirebaseConfigured) {
        const result = await doRetryPendingSync();
        if (result.success > 0) {
          console.info(`[auth] Synced ${result.success} pending items`);
        }
        setPendingSyncCount(getPendingSyncCount());
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    // Set initial state
    setIsOnline(navigator.onLine);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    // Update pending count on mount
    setPendingSyncCount(getPendingSyncCount());
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      return;
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Check if this Google user previously had an anonymous session → merge history
        const prevAnonUid = localStorage.getItem(ANON_UID_KEY);
        if (!u.isAnonymous && prevAnonUid && prevAnonUid !== u.uid) {
          await mergeLocalHistoryToCloud(u.uid);
          localStorage.removeItem(ANON_UID_KEY);
        }
        // Track anonymous uid so we can merge on future Google upgrade
        if (u.isAnonymous) {
          localStorage.setItem(ANON_UID_KEY, u.uid);
        } else {
          localStorage.removeItem(ANON_UID_KEY);
        }
        setUser(toAppUser(u));
        syncUserProfile(u);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) throw new Error("Firebase chưa được cấu hình");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.warn("[auth] Google sign-in blocked by API key restriction:", err);
      throw err;
    }
  }, []);

  const signInAnon = useCallback(async () => {
    if (!auth) {
      const sid = getOrCreateAnonSessionId();
      setUser({ uid: sid, displayName: "Khach", email: null, photoURL: null, isAnonymous: true });
      setLoading(false);
      return;
    }
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.warn("[auth] Anonymous sign-in blocked, continuing as offline guest:", err);
      const sid = getOrCreateAnonSessionId();
      setUser({ uid: sid, displayName: "Khach", email: null, photoURL: null, isAnonymous: true });
      setLoading(false);
    }
  }, []);

  /** Sign-in anonymous + immediately save the player's chosen name + sync to Firestore. */
  const signInAnonWithName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!auth) {
      const sid = getOrCreateAnonSessionId();
      setUser({ uid: sid, displayName: trimmed, email: null, photoURL: null, isAnonymous: true });
      setPlayerName(trimmed);
      setLoading(false);
      return;
    }
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.warn("[auth] Anonymous sign-in blocked, saving name offline:", err);
      const sid = getOrCreateAnonSessionId();
      setUser({ uid: sid, displayName: trimmed, email: null, photoURL: null, isAnonymous: true });
    }
    setPlayerName(trimmed);
    const u = auth.currentUser;
    if (u && db) {
      try {
        const userRef = doc(db, "users", u.uid);
        await setDoc(userRef, {
          displayName: trimmed,
          isAnonymous: true,
          createdAt: serverTimestamp(),
          totalGames: 0,
          bestScore: 0,
          bestPercentage: 0,
        }, { merge: true });
      } catch { /* ignore */ }
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await fbSignOut(auth);
  }, []);

  const retryPendingSync = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    const result = await doRetryPendingSync();
    setPendingSyncCount(getPendingSyncCount());
    if (result.success > 0) {
      console.info(`[auth] Retry synced ${result.success} items, ${result.failed} failed`);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isCloudEnabled: isFirebaseConfigured,
        isOnline,
        pendingSyncCount,
        signInWithGoogle,
        signInAnon,
        signInAnonWithName,
        signOut,
        retryPendingSync,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}