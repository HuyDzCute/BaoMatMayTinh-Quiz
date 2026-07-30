/**
 * Sync State Types
 *
 * Phase 1: Core Infrastructure
 * Synchronization state and conflict handling
 */

/**
 * Overall sync status
 */
export type SyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "error"
  | "offline"
  | "conflict";

/**
 * Individual sync operation type
 */
export type SyncOperationType = "upload" | "download" | "delete";

/**
 * Individual sync operation status
 */
export type SyncOperationStatus = "pending" | "in_progress" | "completed" | "failed";

/**
 * Individual sync operation
 */
export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  slotId: SlotId;
  status: SyncOperationStatus;
  progress: number;
  startedAt: number;
  completedAt: number | null;
  error: string | null;
  retryCount: number;
}

/**
 * Synchronization state
 */
export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  pendingOperations: SyncOperation[];
  currentOperation: SyncOperation | null;
  conflict: ConflictInfo | null;
  error: SyncError | null;
  isOnline: boolean;
}

/**
 * Conflict information
 */
export interface ConflictInfo {
  slotId: SlotId;
  localVersion: SaveData;
  cloudVersion: SaveData;
  localModifiedAt: number;
  cloudModifiedAt: number;
  resolution: ConflictResolution | null;
}

/**
 * Conflict resolution strategy
 */
export type ConflictResolution =
  | "keep_local"
  | "keep_cloud"
  | "merge"
  | "keep_both";

/**
 * Sync error types
 */
export interface SyncError {
  code: SyncErrorCode;
  message: string;
  recoverable: boolean;
  retryAt: number | null;
  details?: string;
}

/**
 * Sync error codes
 */
export type SyncErrorCode =
  | "NETWORK_ERROR"
  | "AUTH_EXPIRED"
  | "QUOTA_EXCEEDED"
  | "VERSION_CONFLICT"
  | "DATA_CORRUPTED"
  | "TIMEOUT"
  | "UNKNOWN";

/**
 * Import SaveData and SlotId from save-data and save-slot
 */
import type { SaveData } from "./save-data";
import type { SlotId } from "./save-slot";

/**
 * Create initial sync state
 */
export function createInitialSyncState(): SyncState {
  return {
    status: "idle",
    lastSyncedAt: null,
    pendingOperations: [],
    currentOperation: null,
    conflict: null,
    error: null,
    isOnline: true,
  };
}

/**
 * Check if sync state indicates success
 */
export function isSyncSuccessful(state: SyncState): boolean {
  return state.status === "synced" && state.error === null;
}

/**
 * Check if sync state indicates conflict
 */
export function hasConflict(state: SyncState): boolean {
  return state.status === "conflict" && state.conflict !== null;
}

/**
 * Check if sync state indicates error
 */
export function hasSyncError(state: SyncState): boolean {
  return state.status === "error" && state.error !== null;
}
