/**
 * Auth Hook
 *
 * Phase 3: Cloud Sync
 * Hook for Firebase Authentication
 */

import { useState, useCallback, useEffect } from "react";
import { type AuthUser, type IAuthAdapter } from "../infrastructure/auth-adapter";

/**
 * Auth hook state
 */
export interface UseAuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

/**
 * Auth hook return type
 */
export interface UseAuthReturn extends UseAuthState {
  // Operations
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;

  // Utilities
  clearError: () => void;
}

/**
 * Default state
 */
function createInitialState(): UseAuthState {
  return {
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  };
}

/**
 * Auth hook
 */
export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<UseAuthState>(createInitialState);

  // Auth adapter
  const [authAdapter, setAuthAdapter] = useState<IAuthAdapter | null>(null);

  /**
   * Initialize auth adapter
   */
  const initialize = useCallback(async () => {
    if (authAdapter) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      // Dynamic import to avoid SSR issues
      const { FirebaseAuthAdapter } = await import("../infrastructure/auth-adapter");
      const adapter = new FirebaseAuthAdapter();
      await adapter.initialize();

      setAuthAdapter(adapter);

      // Set initial user
      const user = adapter.getCurrentUser();
      setState({
        user,
        isLoading: false,
        isAuthenticated: user !== null && !user.isAnonymous,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Auth initialization failed",
      }));
    }
  }, [authAdapter]);

  // Subscribe to auth state changes
  useEffect(() => {
    if (!authAdapter) return;

    const unsubscribe = authAdapter.onAuthStateChange((user) => {
      setState({
        user,
        isLoading: false,
        isAuthenticated: user !== null && !user.isAnonymous,
        error: null,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [authAdapter]);

  /**
   * Sign in with email
   */
  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!authAdapter) {
        throw new Error("Auth not initialized");
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        await authAdapter.signInWithEmail(email, password);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Sign in failed",
        }));
        throw error;
      }
    },
    [authAdapter]
  );

  /**
   * Sign up with email
   */
  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string) => {
      if (!authAdapter) {
        throw new Error("Auth not initialized");
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        await authAdapter.signUpWithEmail(email, password, displayName);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Sign up failed",
        }));
        throw error;
      }
    },
    [authAdapter]
  );

  /**
   * Sign in with Google
   */
  const signInWithGoogle = useCallback(async () => {
    if (!authAdapter) {
      throw new Error("Auth not initialized");
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await authAdapter.signInWithGoogle();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Google sign in failed",
      }));
      throw error;
    }
  }, [authAdapter]);

  /**
   * Sign out
   */
  const signOut = useCallback(async () => {
    if (!authAdapter) {
      throw new Error("Auth not initialized");
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await authAdapter.signOut();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Sign out failed",
      }));
      throw error;
    }
  }, [authAdapter]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    initialize,
    clearError,
  };
}
