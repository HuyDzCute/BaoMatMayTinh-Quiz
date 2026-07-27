"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInAnonymously,
  signOut as fbSignOut,
  User,
} from "firebase/auth";
import {
  ref,
  set as rtdbSet,
  get as rtdbGet,
  push as rtdbPush,
  update as rtdbUpdate,
} from "firebase/database";
import { auth, rtdb, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import {
  setPlayerName,
  getPendingSyncCount,
  retryPendingSync as doRetryPendingSync,
} from "@/lib/storage";
import { getOrCreateAnonSessionId } from "@/lib/session";
import { logger } from "@/lib/logger";

const ANON_UID_KEY = "qthtm_anon_uid";
const HISTORY_KEY = "qthtm_quiz_history";

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

/** Đồng bộ profile người dùng vào RTDB collection `users/{uid}` (best-effort). */
async function syncUserProfile(u: User) {
  if (!rtdb) return;
  try {
    const userRef = ref(rtdb, `users/${u.uid}`);
    const snap = await rtdbGet(userRef);
    if (!snap.exists()) {
      await rtdbSet(userRef, {
        displayName: u.displayName || "Người chơi",
        email: u.email ?? null,
        photoURL: u.photoURL ?? null,
        isAnonymous: u.isAnonymous,
        createdAt: Date.now(),
        totalGames: 0,
        bestScore: 0,
        bestPercentage: 0,
      });
    }
  } catch (err) {
    logger.warn("[auth] syncUserProfile failed:", err);
  }
}

/** Merge anonymous local history into the new Google account's history. */
async function mergeLocalHistoryToCloud(googleUid: string) {
  if (!rtdb) return;
  const dbi = rtdb;
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return;
    const localHistory = JSON.parse(raw);
    if (!Array.isArray(localHistory) || localHistory.length === 0) return;

    const histRef = ref(dbi, `users/${googleUid}/history`);
    const writeResults = await Promise.allSettled(
      localHistory.map((result) =>
        rtdbPush(histRef, {
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
        }),
      ),
    );
    const failedCount = writeResults.filter((r) => r.status === "rejected").length;
    if (failedCount > 0) {
      logger.warn(
        `[auth] merge failed for ${failedCount}/${localHistory.length} entries — keeping local history`,
      );
      return;
    }
    localStorage.removeItem(HISTORY_KEY);
    logger.info("[auth] merged", localHistory.length, "history entries to cloud");
  } catch (err) {
    logger.warn("[auth] mergeLocalHistoryToCloud failed:", err);
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
          logger.info(`[auth] Synced ${result.success} pending items`);
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
      logger.warn("[auth] Google sign-in blocked by API key restriction:", err);
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
      logger.warn("[auth] Anonymous sign-in blocked, continuing as offline guest:", err);
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
      logger.warn("[auth] Anonymous sign-in blocked, saving name offline:", err);
      const sid = getOrCreateAnonSessionId();
      setUser({ uid: sid, displayName: trimmed, email: null, photoURL: null, isAnonymous: true });
    }
    setPlayerName(trimmed);
    const u = auth.currentUser;
    if (u && rtdb) {
      try {
        const userRef = ref(rtdb, `users/${u.uid}`);
        await rtdbUpdate(userRef, {
          displayName: trimmed,
          isAnonymous: true,
          createdAt: Date.now(),
          totalGames: 0,
          bestScore: 0,
          bestPercentage: 0,
        });
      } catch {
        /* ignore */
      }
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
      logger.info(`[auth] Retry synced ${result.success} items, ${result.failed} failed`);
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
