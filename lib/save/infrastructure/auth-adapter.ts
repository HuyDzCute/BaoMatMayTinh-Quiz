/**
 * Auth Adapter
 *
 * Phase 3: Cloud Sync
 * Firebase Authentication wrapper
 */

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  type User,
} from "firebase/auth";
import { AuthError } from "../types/errors";

/**
 * Auth state callback
 */
export type AuthStateCallback = (user: AuthUser | null) => void;

/**
 * Auth user representation
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  providerId: string;
}

/**
 * Auth adapter interface
 */
export interface IAuthAdapter {
  initialize(): Promise<void>;
  getCurrentUser(): AuthUser | null;
  isAuthenticated(): boolean;
  onAuthStateChange(callback: AuthStateCallback): () => void;
  signInWithEmail(email: string, password: string): Promise<AuthUser>;
  signUpWithEmail(email: string, password: string, displayName: string): Promise<AuthUser>;
  signInWithGoogle(): Promise<AuthUser>;
  signOut(): Promise<void>;
}

/**
 * Firebase Auth adapter implementation
 */
export class FirebaseAuthAdapter implements IAuthAdapter {
  private auth = null as ReturnType<typeof import("firebase/auth").getAuth> | null;
  private currentUser: AuthUser | null = null;
  private unsubscribe: (() => void) | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the auth adapter
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      // Dynamic import to avoid SSR issues
      const { getAuth } = await import("firebase/auth");
      const { getFirebaseServices } = await import("./firebase-config");

      const services = getFirebaseServices();
      if (!services) {
        throw new AuthError("Firebase not initialized");
      }

      this.auth = getAuth(services.app);

      // Subscribe to auth state changes
      this.unsubscribe = onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user ? this.mapUser(user) : null;
      });
    } catch (error) {
      throw new AuthError(
        error instanceof Error ? error.message : "Failed to initialize auth"
      );
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null && !this.currentUser.isAnonymous;
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: AuthStateCallback): () => void {
    if (!this.auth) {
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(this.auth, (user) => {
      callback(user ? this.mapUser(user) : null);
    });

    return unsubscribe;
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    if (!this.auth) {
      throw new AuthError("Auth not initialized");
    }

    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      this.currentUser = this.mapUser(credential.user);
      return this.currentUser;
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      throw new AuthError(
        this.getAuthErrorMessage(firebaseError.code) || "Sign in failed"
      );
    }
  }

  /**
   * Sign up with email and password
   */
  async signUpWithEmail(
    email: string,
    password: string,
    displayName: string
  ): Promise<AuthUser> {
    if (!this.auth) {
      throw new AuthError("Auth not initialized");
    }

    try {
      const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);

      // Update display name
      await updateProfile(credential.user, { displayName });

      this.currentUser = this.mapUser(credential.user);
      return this.currentUser;
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      throw new AuthError(
        this.getAuthErrorMessage(firebaseError.code) || "Sign up failed"
      );
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<AuthUser> {
    if (!this.auth) {
      throw new AuthError("Auth not initialized");
    }

    try {
      const { signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(this.auth, provider);
      this.currentUser = this.mapUser(credential.user);
      return this.currentUser;
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code === "auth/popup-closed-by-user") {
        throw new AuthError("Sign in cancelled");
      }
      throw new AuthError(
        this.getAuthErrorMessage(firebaseError.code) || "Google sign in failed"
      );
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    if (!this.auth) {
      throw new AuthError("Auth not initialized");
    }

    try {
      const { signOut } = await import("firebase/auth");
      await signOut(this.auth);
      this.currentUser = null;
    } catch (error) {
      throw new AuthError(
        error instanceof Error ? error.message : "Sign out failed"
      );
    }
  }

  /**
   * Map Firebase user to AuthUser
   */
  private mapUser(user: User): AuthUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      isAnonymous: user.isAnonymous,
      providerId: user.providerId,
    };
  }

  /**
   * Get user-friendly error message
   */
  private getAuthErrorMessage(code?: string): string | null {
    const messages: Record<string, string> = {
      "auth/email-already-in-use": "This email is already registered",
      "auth/invalid-email": "Invalid email address",
      "auth/operation-not-allowed": "This sign-in method is not enabled",
      "auth/weak-password": "Password should be at least 6 characters",
      "auth/user-disabled": "This account has been disabled",
      "auth/user-not-found": "No account found with this email",
      "auth/wrong-password": "Incorrect password",
      "auth/invalid-credential": "Invalid email or password",
      "auth/too-many-requests": "Too many attempts. Please try again later",
      "auth/network-request-failed": "Network error. Check your connection",
    };

    return code ? messages[code] || null : null;
  }

  /**
   * Clean up
   */
  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.auth = null;
    this.currentUser = null;
  }
}

/**
 * Singleton instance
 */
let authAdapterInstance: FirebaseAuthAdapter | null = null;

export function getAuthAdapter(): FirebaseAuthAdapter {
  if (!authAdapterInstance) {
    authAdapterInstance = new FirebaseAuthAdapter();
  }
  return authAdapterInstance;
}
