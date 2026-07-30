/**
 * Cloud Sync Service
 *
 * Phase 3: Cloud Sync
 * Complete sync implementation with Firebase
 */

import type { SlotId } from "../types/save-slot";
import type { SaveData } from "../types/save-data";
import type {
  SyncState,
  SyncStatus,
  SyncOperation,
  ConflictInfo,
  ConflictResolution,
} from "../types/sync-state";
import {
  createInitialSyncState,
} from "../types/sync-state";
import { SaveSyncError, type SyncErrorCode } from "../types/errors";
import { getIndexedDBAdapter } from "./indexeddb-adapter";
import { getConflictResolver } from "../services/conflict-resolver";
import {
  type IFirestoreAdapter,
  getFirestoreAdapter,
} from "./firestore-adapter";
import {
  type IAuthAdapter,
  getAuthAdapter,
} from "./auth-adapter";

/**
 * Sync operation queue item
 */
interface QueuedOperation {
  id: string;
  type: "upload" | "download" | "delete";
  slotId: SlotId;
  data?: SaveData;
  createdAt: number;
  retryCount: number;
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  maxRetries?: number;
  retryDelayMs?: number;
  maxBatchSize?: number;
}

/**
 * Default sync configuration
 */
const DEFAULT_CONFIG: Required<SyncConfig> = {
  maxRetries: 3,
  retryDelayMs: 1000,
  maxBatchSize: 5,
};

/**
 * Sync service interface
 */
export interface ISyncService {
  getState(): SyncState;
  getStatus(): SyncStatus;
  isOnline(): boolean;
  isAuthenticated(): boolean;
  queueOperation(
    type: "upload" | "download",
    slotId: SlotId,
    data?: SaveData
  ): Promise<void>;
  processQueue(): Promise<void>;
  resolveConflict(resolution: ConflictResolution): Promise<void>;
  onStateChange(listener: (state: SyncState) => void): () => void;
  clearConflict(): void;
  forceSync(): Promise<void>;
  dispose(): void;
}

/**
 * Cloud sync service implementation
 */
export class SyncService implements ISyncService {
  private state: SyncState;
  private listeners: Set<(state: SyncState) => void> = new Set();
  private operationQueue: QueuedOperation[] = [];
  private pendingConflict: ConflictInfo | null = null;
  private readonly config: Required<SyncConfig>;
  private readonly firestore: IFirestoreAdapter;
  private readonly auth: IAuthAdapter;

  constructor(config?: SyncConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = createInitialSyncState();
    this.state.isOnline = typeof window !== "undefined" ? navigator.onLine : true;

    // Get adapter instances
    this.firestore = getFirestoreAdapter();
    this.auth = getAuthAdapter();

    // Listen for online/offline events
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
    }

    // Subscribe to auth state changes
    this.auth.onAuthStateChange((user) => {
      if (user) {
        this.state = { ...this.state, status: "idle" };
        this.processQueue();
      } else {
        this.state = { ...this.state, status: "idle", error: null };
      }
      this.emitStateChange();
    });
  }

  /**
   * Get current sync state
   */
  getState(): SyncState {
    return { ...this.state };
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return this.state.status;
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return this.state.isOnline;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  /**
   * Queue an operation for processing
   */
  async queueOperation(
    type: "upload" | "download",
    slotId: SlotId,
    data?: SaveData
  ): Promise<void> {
    const operation: QueuedOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      slotId,
      data,
      createdAt: Date.now(),
      retryCount: 0,
    };

    this.operationQueue.push(operation);
    this.state.pendingOperations = this.operationQueue.map(this.queuedToSyncOperation);
    this.state.currentOperation = this.queuedToSyncOperation(operation);

    // Emit state change
    this.emitStateChange();

    // If online and authenticated, process immediately
    if (this.isOnline() && this.isAuthenticated()) {
      this.processQueue();
    }
  }

  /**
   * Process queued operations
   */
  async processQueue(): Promise<void> {
    if (!this.isOnline()) {
      this.setState({ status: "offline" });
      return;
    }

    if (!this.isAuthenticated()) {
      this.setState({ status: "idle" });
      return;
    }

    if (this.operationQueue.length === 0) {
      this.setState({ status: "synced", lastSyncedAt: Date.now() });
      return;
    }

    this.setState({ status: "syncing" });

    const failedOps: QueuedOperation[] = [];

    for (const op of this.operationQueue) {
      this.state.currentOperation = this.createSyncOperation(op);

      try {
        switch (op.type) {
          case "upload":
            await this.processUpload(op);
            break;
          case "download":
            await this.processDownload(op);
            break;
          case "delete":
            await this.processDelete(op);
            break;
        }

        this.state.currentOperation = {
          ...this.state.currentOperation,
          status: "completed",
          completedAt: Date.now(),
          progress: 100,
        };
      } catch (error) {
        op.retryCount++;

        if (op.retryCount < this.config.maxRetries) {
          failedOps.push(op);
          // Apply exponential backoff
          await this.delay(
            this.config.retryDelayMs * Math.pow(2, op.retryCount - 1)
          );
        }

        this.state.currentOperation = {
          ...this.state.currentOperation,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    this.operationQueue = failedOps;
    this.state.pendingOperations = failedOps.map(this.queuedToSyncOperation);
    this.state.currentOperation = null;

    if (failedOps.length > 0) {
      this.setState({
        status: "error",
        error: {
          code: "NETWORK_ERROR",
          message: `${failedOps.length} operation(s) failed`,
          recoverable: true,
          retryAt: Date.now() + 60000,
        },
      });
    } else {
      this.setState({
        status: "synced",
        lastSyncedAt: Date.now(),
        error: null,
      });
    }
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(resolution: ConflictResolution): Promise<void> {
    if (!this.pendingConflict) {
      throw new SaveSyncError("No conflict to resolve", "UNKNOWN");
    }

    const resolver = getConflictResolver();
    const result = resolver.applyResolution(this.pendingConflict, resolution);

    if (!result.success) {
      throw result.error;
    }

    // Save the resolved data locally
    const db = getIndexedDBAdapter();
    await db.put(this.pendingConflict.slotId, result.data);

    // Upload resolved version to cloud
    const userId = this.auth.getCurrentUser()?.uid;
    if (userId) {
      const meta = await db.getMeta(this.pendingConflict.slotId);
      if (meta) {
        await this.firestore.saveSlot(userId, this.pendingConflict.slotId, result.data, meta);
      }
    }

    // Clear the conflict
    this.pendingConflict = null;
    this.clearConflict();
  }

  /**
   * Subscribe to sync state changes
   */
  onStateChange(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Clear current conflict
   */
  clearConflict(): void {
    this.pendingConflict = null;
    this.state.conflict = null;
    this.emitStateChange();
  }

  /**
   * Force a sync attempt
   */
  async forceSync(): Promise<void> {
    await this.processQueue();
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private setState(updates: Partial<SyncState>): void {
    this.state = { ...this.state, ...updates };
    this.emitStateChange();
  }

  private emitStateChange(): void {
    const stateCopy = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(stateCopy);
      } catch {
        // Ignore listener errors
      }
    }
  }

  private handleOnline = (): void => {
    this.state.isOnline = true;
    this.setState({ isOnline: true });
    this.processQueue();
  };

  private handleOffline = (): void => {
    this.state.isOnline = false;
    this.setState({ status: "offline", isOnline: false });
  };

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private createSyncOperation(op: QueuedOperation): SyncOperation {
    return {
      id: op.id,
      type: op.type,
      slotId: op.slotId,
      status: "in_progress",
      progress: 0,
      startedAt: Date.now(),
      completedAt: null,
      error: null,
      retryCount: op.retryCount,
    };
  }

  private queuedToSyncOperation = (op: QueuedOperation): SyncOperation => {
    return {
      id: op.id,
      type: op.type,
      slotId: op.slotId,
      status: "pending" as const,
      progress: 0,
      startedAt: op.createdAt,
      completedAt: null,
      error: null,
      retryCount: op.retryCount,
    };
  };

  // ─── Cloud operations ─────────────────────────────────────────────────────────

  private async processUpload(op: QueuedOperation): Promise<void> {
    if (!op.data) {
      throw new SaveSyncError("No data to upload", "UNKNOWN");
    }

    const userId = this.auth.getCurrentUser()?.uid;
    if (!userId) {
      throw new SaveSyncError("Not authenticated", "AUTH_EXPIRED");
    }

    // Check for conflicts
    const cloudData = await this.firestore.loadSlot(userId, op.slotId);
    const db = getIndexedDBAdapter();
    const localData = await db.get(op.slotId);
    const localMeta = await db.getMeta(op.slotId);

    if (cloudData && localData && localMeta) {
      // Detect conflict
      if (
        cloudData.meta.cloudSyncedAt &&
        localMeta.localModifiedAt > cloudData.meta.cloudSyncedAt &&
        cloudData.data.metadata.modifiedAt !== localData.metadata.modifiedAt
      ) {
        // Conflict detected
        const conflict: ConflictInfo = {
          slotId: op.slotId,
          localVersion: localData,
          cloudVersion: cloudData.data,
          localModifiedAt: localMeta.localModifiedAt,
          cloudModifiedAt: cloudData.meta.cloudSyncedAt,
          resolution: null,
        };

        this.pendingConflict = conflict;
        this.state.conflict = conflict;
        this.setState({ status: "conflict" });
        return;
      }
    }

    // Upload to cloud
    await this.firestore.saveSlot(userId, op.slotId, op.data, {
      ...(localMeta || {
        slotId: op.slotId,
        playerName: op.data.player.name,
        level: op.data.progression.level.currentLevel,
        totalXP: op.data.progression.lifetimeXP,
        achievementsCount: Object.keys(op.data.progression.achievements).length,
        lastPlayedAt: op.data.metadata.modifiedAt,
        playTimeMs: op.data.metadata.saveDuration,
        saveDuration: op.data.metadata.saveDuration,
        cloudSyncedAt: null,
        localModifiedAt: op.data.metadata.modifiedAt,
        version: op.data.version,
        isEmpty: false,
      }),
      cloudSyncedAt: Date.now(),
    });

    // Update local metadata
    if (localMeta) {
      localMeta.cloudSyncedAt = Date.now();
      await db.putMeta(op.slotId, localMeta);
    }
  }

  private async processDownload(op: QueuedOperation): Promise<void> {
    const userId = this.auth.getCurrentUser()?.uid;
    if (!userId) {
      throw new SaveSyncError("Not authenticated", "AUTH_EXPIRED");
    }

    const cloudData = await this.firestore.loadSlot(userId, op.slotId);
    if (!cloudData) {
      return; // No data in cloud
    }

    const db = getIndexedDBAdapter();
    const localData = await db.get(op.slotId);
    const localMeta = await db.getMeta(op.slotId);

    if (localData && localMeta) {
      // Check for conflicts
      if (
        localMeta.cloudSyncedAt &&
        localMeta.localModifiedAt > localMeta.cloudSyncedAt &&
        cloudData.data.metadata.modifiedAt !== localData.metadata.modifiedAt
      ) {
        // Conflict detected
        const conflict: ConflictInfo = {
          slotId: op.slotId,
          localVersion: localData,
          cloudVersion: cloudData.data,
          localModifiedAt: localMeta.localModifiedAt,
          cloudModifiedAt: localMeta.cloudSyncedAt || 0,
          resolution: null,
        };

        this.pendingConflict = conflict;
        this.state.conflict = conflict;
        this.setState({ status: "conflict" });
        return;
      }
    }

    // Download to local
    await db.put(op.slotId, cloudData.data);
    await db.putMeta(op.slotId, {
      ...cloudData.meta,
      cloudSyncedAt: Date.now(),
    });
  }

  private async processDelete(op: QueuedOperation): Promise<void> {
    const userId = this.auth.getCurrentUser()?.uid;
    if (!userId) {
      throw new SaveSyncError("Not authenticated", "AUTH_EXPIRED");
    }

    await this.firestore.deleteSlot(userId, op.slotId);

    const db = getIndexedDBAdapter();
    await db.delete(op.slotId);
  }

  /**
   * Clean up event listeners
   */
  dispose(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }
    this.listeners.clear();
    this.operationQueue = [];
  }
}

/**
 * Singleton instance
 */
let instance: SyncService | null = null;

/**
 * Get singleton instance
 */
export function getSyncService(): SyncService {
  if (!instance) {
    instance = new SyncService();
  }
  return instance;
}
