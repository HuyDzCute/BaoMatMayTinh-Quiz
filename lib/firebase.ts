/**
 * Firebase initialization & service exports.
 *
 * Nếu các biến NEXT_PUBLIC_FIREBASE_* chưa được set, mọi export sẽ trả về `null`
 * → app tự fallback về localStorage. Cho phép dev chạy được app mà chưa cần Firebase.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/** True nếu đã cấu hình đầy đủ Firebase config. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

if (isFirebaseConfigured && typeof window !== "undefined") {
  try {
    _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    _auth = getAuth(_app);
    _db = getFirestore(_app);
  } catch (err) {
    console.warn("[Firebase] Init failed, falling back to localStorage:", err);
  }
}

/** Firebase app instance (null nếu chưa config). */
export const firebaseApp = _app;

/** Firebase Auth instance. */
export const auth = _auth;

/** Firestore DB instance. */
export const db = _db;

/** Google Auth provider. */
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });