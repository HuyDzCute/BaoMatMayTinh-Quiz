/**
 * Cloud Save System - Public API
 *
 * Phase 3: Cloud Sync with Firebase
 *
 * Provides offline-first cloud save functionality with:
 * - Local IndexedDB storage
 * - Firebase Authentication
 * - Firestore cloud persistence
 * - Multiple save slots
 * - Data validation and migration
 * - Conflict resolution
 * - Bidirectional sync
 *
 * Usage:
 * ```typescript
 * import { SaveManager, initializeFirebase } from "@/lib/save";
 *
 * // Initialize Firebase first
 * initializeFirebase(firebaseConfig);
 *
 * const saveManager = new SaveManager();
 * await saveManager.initialize();
 *
 * // Save
 * await saveManager.save(1, gameState);
 *
 * // Load
 * const data = await saveManager.load(1);
 * ```
 */

// Types
export * from "./types";

// Hooks
export * from "./hooks";

// Services
export { SaveService, getSaveService } from "./services/save-service";
export { LoadService, getLoadService } from "./services/load-service";
export { ValidationService, getValidationService } from "./services/validation-service";
export { ConflictResolver, getConflictResolver } from "./services/conflict-resolver";

// Infrastructure - Sync
export {
  SyncService,
  getSyncService,
  type ISyncService,
  type SyncConfig,
} from "./infrastructure/sync-service";

// Infrastructure - Firebase
export {
  initializeFirebase,
  getFirebaseServices,
  isFirebaseInitialized,
  cleanupFirebase,
  type FirebaseConfig,
  type FirebaseServices,
} from "./infrastructure/firebase-config";

export {
  FirebaseAuthAdapter,
  getAuthAdapter,
  type AuthUser,
  type AuthStateCallback,
} from "./infrastructure/auth-adapter";

export {
  FirestoreAdapter,
  getFirestoreAdapter,
} from "./infrastructure/firestore-adapter";

// Infrastructure - Local Storage
export { IndexedDBAdapter, getIndexedDBAdapter } from "./infrastructure/indexeddb-adapter";

/**
 * Save Manager - Main facade class
 *
 * Combines all services into a single easy-to-use interface
 */
import type { SlotId, SaveSlot, SaveSlotMeta } from "./types/save-slot";
import type { SaveData } from "./types/save-data";
import type { SyncState, ConflictResolution } from "./types/sync-state";
import { SaveService } from "./services/save-service";
import { LoadService } from "./services/load-service";
import { getSyncService, type SyncService } from "./infrastructure/sync-service";
import { IndexedDBAdapter } from "./infrastructure/indexeddb-adapter";

export interface SaveManagerConfig {
  autoSync?: boolean;
  syncInterval?: number;
}

export class SaveManager {
  private readonly saveService: SaveService;
  private readonly loadService: LoadService;
  private readonly syncService: SyncService;
  private readonly db: IndexedDBAdapter;
  private initialized = false;

  constructor(config: SaveManagerConfig = {}) {
    this.saveService = new SaveService();
    this.loadService = new LoadService();
    this.syncService = getSyncService();
    this.db = new IndexedDBAdapter();
  }

  /**
   * Initialize the save manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.db.initialize();
    this.initialized = true;
  }

  /**
   * Ensure initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // ─── Save Operations ─────────────────────────────────────────────────────────

  /**
   * Save game data to a slot
   */
  async save(slotId: SlotId, data: SaveData): Promise<void> {
    await this.ensureInitialized();
    await this.saveService.saveLocal(slotId, data);
    await this.syncService.queueOperation("upload", slotId, data);
  }

  /**
   * Save with options
   */
  async saveWithOptions(
    slotId: SlotId,
    data: SaveData,
    options: { backup?: boolean }
  ): Promise<void> {
    await this.ensureInitialized();
    await this.saveService.save(slotId, data, { backupBefore: options.backup });
    await this.syncService.queueOperation("upload", slotId, data);
  }

  // ─── Load Operations ─────────────────────────────────────────────────────────

  /**
   * Load game data from a slot
   */
  async load(slotId: SlotId): Promise<SaveData | null> {
    await this.ensureInitialized();
    const result = await this.loadService.load(slotId);
    return result.success ? result.data : null;
  }

  /**
   * Load the most recently played slot
   */
  async loadLatest(): Promise<SaveSlot | null> {
    await this.ensureInitialized();
    const result = await this.loadService.loadLatest();
    return result.success ? result.data : null;
  }

  // ─── Slot Operations ─────────────────────────────────────────────────────────

  /**
   * Get all save slots
   */
  async getAllSlots(): Promise<SaveSlotMeta[]> {
    await this.ensureInitialized();
    return this.saveService.getAllSlots();
  }

  /**
   * Get a specific slot
   */
  async getSlot(slotId: SlotId): Promise<SaveSlot | null> {
    await this.ensureInitialized();
    return this.saveService.getSlot(slotId);
  }

  /**
   * Create a new save slot
   */
  async createSlot(slotId: SlotId, data: SaveData): Promise<void> {
    await this.ensureInitialized();
    await this.saveService.createSlot(slotId, data);
  }

  /**
   * Delete a save slot
   */
  async deleteSlot(slotId: SlotId): Promise<void> {
    await this.ensureInitialized();
    await this.saveService.deleteSlot(slotId);
  }

  /**
   * Backup a slot
   */
  async backup(slotId: SlotId): Promise<string> {
    await this.ensureInitialized();
    return this.saveService.backup(slotId);
  }

  // ─── Sync Operations ─────────────────────────────────────────────────────────

  /**
   * Get current sync state
   */
  getSyncState(): SyncState {
    return this.syncService.getState();
  }

  /**
   * Force sync with cloud
   */
  async sync(): Promise<void> {
    await this.syncService.forceSync();
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(resolution: ConflictResolution): Promise<void> {
    await this.syncService.resolveConflict(resolution);
  }

  /**
   * Subscribe to sync state changes
   */
  onSyncStateChange(listener: (state: SyncState) => void): () => void {
    return this.syncService.onStateChange(listener);
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────────

  /**
   * Clean up resources
   */
  dispose(): void {
    this.db.close();
    this.syncService.dispose();
  }
}

// Singleton instance
let managerInstance: SaveManager | null = null;

export function getSaveManager(): SaveManager {
  if (!managerInstance) {
    managerInstance = new SaveManager();
  }
  return managerInstance;
}
