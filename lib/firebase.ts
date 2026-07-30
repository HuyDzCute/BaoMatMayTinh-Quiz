/**
 * Firebase initialization & service exports.
 *
 * - `auth`: Firebase Authentication
 * - `rtdb`: Realtime Database (dùng cho chat realtime, leaderboard, presence)
 * - `db`:   legacy alias = rtdb (để tương thích với các file cũ: auth.tsx, storage.ts)
 *
 * Nếu các biến NEXT_PUBLIC_FIREBASE_* chưa được set, mọi export sẽ trả về `null`
 * → app tự fallback về localStorage. Cho phép dev chạy được app mà chưa cần Firebase.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase, Database } from "firebase/database";
import { logger } from "./logger";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://bao-mat-may-tinh-default-rtdb.asia-southeast1.firebasedatabase.app",
};

/** True nếu đang chạy trên browser VÀ đã cấu hình Firebase. */
const isClientConfigured =
  typeof window !== "undefined" &&
  Boolean(
    firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
  );

export const isFirebaseConfigured = isClientConfigured;

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _rtdb: Database | null = null;

if (isClientConfigured) {
  try {
    _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    _auth = getAuth(_app);
    _rtdb = getDatabase(_app);
  } catch (err) {
    logger.warn("[Firebase] Init failed, falling back to localStorage:", err);
  }
}

/** Firebase app instance (null nếu chưa config). */
export const firebaseApp = _app;

/** Firebase Auth instance. */
export const auth = _auth;

/** Realtime Database instance (null nếu chưa config). */
export const rtdb = _rtdb;

/** @deprecated — không còn dùng. Giữ comment để tham khảo. */

/** Google Auth provider - lazy load để tránh lỗi SSR */
let _googleProvider: GoogleAuthProvider | null = null;

export function getGoogleProvider(): GoogleAuthProvider {
  if (!_googleProvider) {
    _googleProvider = new GoogleAuthProvider();
    _googleProvider.setCustomParameters({ prompt: "select_account" });
  }
  return _googleProvider;
}

/** @deprecated — dùng getGoogleProvider() thay vì truy cập trực tiếp */
export const googleProvider = typeof window !== "undefined" ? getGoogleProvider() : (null as unknown as GoogleAuthProvider);
