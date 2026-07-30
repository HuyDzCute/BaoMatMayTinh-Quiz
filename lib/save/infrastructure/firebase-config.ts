/**
 * Firebase Configuration
 *
 * Phase 3: Cloud Sync
 * Firebase initialization and configuration
 */

import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase configuration interface
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * Firebase service container
 */
export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

/**
 * Default Firebase configuration (for development)
 * Replace with actual config in production
 */
export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/**
 * Firebase app instance (singleton)
 */
let firebaseApp: FirebaseApp | null = null;
let firebaseServices: FirebaseServices | null = null;

/**
 * Initialize Firebase
 */
export function initializeFirebase(config?: FirebaseConfig): FirebaseServices {
  if (firebaseServices) {
    return firebaseServices;
  }

  const finalConfig = config || DEFAULT_FIREBASE_CONFIG;

  firebaseApp = initializeApp(finalConfig);
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);

  firebaseServices = {
    app: firebaseApp,
    auth,
    firestore,
  };

  return firebaseServices;
}

/**
 * Get Firebase services (must call initializeFirebase first)
 */
export function getFirebaseServices(): FirebaseServices | null {
  return firebaseServices;
}

/**
 * Check if Firebase is initialized
 */
export function isFirebaseInitialized(): boolean {
  return firebaseServices !== null;
}

/**
 * Clean up Firebase (mainly for testing)
 */
export function cleanupFirebase(): void {
  firebaseApp = null;
  firebaseServices = null;
}
