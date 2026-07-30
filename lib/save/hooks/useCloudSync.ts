/**
 * Cloud Sync Hook
 *
 * Phase 2: Save/Load Hooks
 * Hook for observing and controlling sync state
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import type { SyncState, SyncStatus, ConflictInfo, ConflictResolution } from "../types/sync-state";
import { getSyncService, type SyncService } from "../infrastructure/sync-service";
import { SaveSyncError, type SyncErrorCode } from "../types/errors";

/**
 * Cloud sync hook state
 */
export interface UseCloudSyncState {
  status: SyncStatus;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  pendingChanges: number;
  pendingOperations: SyncState["pendingOperations"];
  currentOperation: SyncState["currentOperation"];
  conflict: ConflictInfo | null;
  error: SyncState["error"];
}

/**
 * Cloud sync hook return type
 */
export interface UseCloudSyncReturn extends UseCloudSyncState {
  // Operations
  sync: () => Promise<void>;
  forcePush: () => Promise<void>;
  forcePull: () => Promise<void>;
  resolveConflict: (resolution: ConflictResolution) => Promise<void>;
  clearConflict: () => void;

  // Utilities
  isSynced: boolean;
  hasConflict: boolean;
  hasError: boolean;
}

/**
 * Default sync state
 */
function createDefaultState(): UseCloudSyncState {
  return {
    status: "idle",
    isOnline: true,
    isSyncing: false,
    lastSyncedAt: null,
    pendingChanges: 0,
    pendingOperations: [],
    currentOperation: null,
    conflict: null,
    error: null,
  };
}

/**
 * Get or create sync service singleton
 */
function getSyncServiceInstance(): SyncService {
  return getSyncService();
}

/**
 * Cloud sync hook
 */
export function useCloudSync(): UseCloudSyncReturn {
  const [state, setState] = useState<UseCloudSyncState>(createDefaultState);

  // Service instance - created once via useMemo
  const syncService = useMemo(() => getSyncServiceInstance(), []);

  /**
   * Update state from sync service
   */
  const updateFromService = useCallback(() => {
    const syncState = syncService.getState();
    setState({
      status: syncState.status,
      isOnline: syncState.isOnline,
      isSyncing: syncState.status === "syncing",
      lastSyncedAt: syncState.lastSyncedAt,
      pendingChanges: syncState.pendingOperations.length,
      pendingOperations: syncState.pendingOperations,
      currentOperation: syncState.currentOperation,
      conflict: syncState.conflict,
      error: syncState.error,
    });
  }, [syncService]);

  // Subscribe to sync state changes
  useEffect(() => {
    // Initial state
    updateFromService();

    // Subscribe to state changes
    const unsubscribe = syncService.onStateChange(() => {
      updateFromService();
    });

    return () => {
      unsubscribe();
    };
  }, [syncService, updateFromService]);

  /**
   * Force sync
   */
  const sync = useCallback(async () => {
    try {
      await syncService.forceSync();
      updateFromService();
    } catch (error) {
      const err = error instanceof Error ? error.message : "Sync failed";
      setState((prev) => ({
        ...prev,
        error: {
          code: "UNKNOWN" as SyncErrorCode,
          message: err,
          recoverable: true,
          retryAt: Date.now() + 60000,
        },
      }));
    }
  }, [syncService, updateFromService]);

  /**
   * Force push local changes
   */
  const forcePush = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, status: "syncing" }));
      await syncService.forceSync();
      updateFromService();
    } catch (error) {
      const err = error instanceof Error ? error.message : "Push failed";
      setState((prev) => ({
        ...prev,
        error: {
          code: "UNKNOWN" as SyncErrorCode,
          message: err,
          recoverable: true,
          retryAt: Date.now() + 60000,
        },
      }));
    }
  }, [syncService, updateFromService]);

  /**
   * Force pull from cloud
   */
  const forcePull = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, status: "syncing" }));
      await syncService.forceSync();
      updateFromService();
    } catch (error) {
      const err = error instanceof Error ? error.message : "Pull failed";
      setState((prev) => ({
        ...prev,
        error: {
          code: "UNKNOWN" as SyncErrorCode,
          message: err,
          recoverable: true,
          retryAt: Date.now() + 60000,
        },
      }));
    }
  }, [syncService, updateFromService]);

  /**
   * Resolve conflict
   */
  const resolveConflict = useCallback(
    async (resolution: ConflictResolution) => {
      try {
        await syncService.resolveConflict(resolution);
        updateFromService();
      } catch (error) {
        const err = error instanceof Error ? error.message : "Conflict resolution failed";
        setState((prev) => ({
          ...prev,
          error: {
            code: "UNKNOWN" as SyncErrorCode,
            message: err,
            recoverable: false,
            retryAt: null,
          },
        }));
        throw error;
      }
    },
    [syncService, updateFromService]
  );

  /**
   * Clear conflict
   */
  const clearConflict = useCallback(() => {
    syncService.clearConflict();
    updateFromService();
  }, [syncService, updateFromService]);

  // Computed values
  const isSynced = state.status === "synced" || state.status === "idle";
  const hasConflict = state.status === "conflict";
  const hasError = state.status === "error";

  return {
    ...state,
    sync,
    forcePush,
    forcePull,
    resolveConflict,
    clearConflict,
    isSynced,
    hasConflict,
    hasError,
  };
}
