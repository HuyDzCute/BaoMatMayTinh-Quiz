/**
 * Load Service
 *
 * Phase 1: Core Infrastructure
 * Core load orchestration logic
 */

import type { SlotId, SaveSlot } from "../types/save-slot";
import type { SaveData } from "../types/save-data";
import {
  SaveError,
  type SaveResult,
  successResult,
  failureResult,
} from "../types/errors";
import { getIndexedDBAdapter, type IndexedDBAdapter } from "../infrastructure/indexeddb-adapter";
import { getValidationService, type ValidationService } from "./validation-service";

/**
 * Load options
 */
export interface LoadOptions {
  preferCloud?: boolean;
  forceRefresh?: boolean;
  allowStale?: boolean;
  validate?: boolean;
}

/**
 * Load service interface
 */
export interface ILoadService {
  loadLocal(slotId: SlotId): Promise<SaveData | null>;
  load(slotId: SlotId, options?: LoadOptions): Promise<SaveResult<SaveData>>;
  loadLatest(): Promise<SaveResult<SaveSlot>>;
  restoreFromBackup(backupId: string): Promise<SaveResult<void>>;
}

/**
 * Default load service implementation
 */
export class LoadService implements ILoadService {
  private readonly db: IndexedDBAdapter;
  private readonly validation: ValidationService;

  constructor(
    db?: IndexedDBAdapter,
    validation?: ValidationService
  ) {
    this.db = db || getIndexedDBAdapter();
    this.validation = validation || getValidationService();
  }

  /**
   * Load from local storage only
   */
  async loadLocal(slotId: SlotId): Promise<SaveData | null> {
    const data = await this.db.get(slotId);

    if (!data) {
      return null;
    }

    // Validate and migrate if needed
    if (this.validation.needsMigration(data)) {
      const result = this.validation.migrate(data);
      if (result.success) {
        // Update local storage with migrated data
        await this.db.put(slotId, result.data);
        return result.data;
      }
      // If migration fails, return original data
      return data;
    }

    return data;
  }

  /**
   * Full load operation with validation and migration
   */
  async load(
    slotId: SlotId,
    options: LoadOptions = {}
  ): Promise<SaveResult<SaveData>> {
    try {
      // Load local data
      let data = await this.loadLocal(slotId);

      if (!data) {
        return failureResult(
          new SaveError(`No save found in slot ${slotId}`, "NOT_FOUND", true)
        );
      }

      // Validate if requested
      if (options.validate !== false) {
        const validationResult = this.validation.validate(data);
        if (!validationResult.success) {
          // Try to sanitize and recover
          const sanitized = this.validation.sanitize(data);
          data = sanitized;
        }
      }

      // Check integrity
      if (!this.validation.checkIntegrity(data)) {
        return failureResult(
          new SaveError("Save data integrity check failed", "INTEGRITY_FAILED", true)
        );
      }

      return successResult(data);
    } catch (error) {
      return failureResult(
        error instanceof SaveError
          ? error
          : new SaveError(
              error instanceof Error ? error.message : "Load failed",
              "LOAD_FAILED",
              true
            )
      );
    }
  }

  /**
   * Load the most recently played slot
   */
  async loadLatest(): Promise<SaveResult<SaveSlot>> {
    try {
      const metas = await this.db.getAllMeta();

      // Filter out empty slots
      const validSlots = metas.filter((m) => !m.isEmpty);

      if (validSlots.length === 0) {
        return failureResult(
          new SaveError("No saves found", "NO_SAVES", true)
        );
      }

      // Sort by last played time
      validSlots.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);

      const latestMeta = validSlots[0];
      const loadResult = await this.load(latestMeta.slotId);

      if (!loadResult.success) {
        return loadResult;
      }

      return successResult({
        ...latestMeta,
        data: loadResult.data,
      });
    } catch (error) {
      return failureResult(
        error instanceof SaveError
          ? error
          : new SaveError(
              error instanceof Error ? error.message : "Load latest failed",
              "LOAD_LATEST_FAILED",
              true
            )
      );
    }
  }

  /**
   * Restore from a backup
   */
  async restoreFromBackup(backupId: string): Promise<SaveResult<void>> {
    try {
      const backup = await this.db.getBackup(backupId);

      if (!backup) {
        return failureResult(
          new SaveError(`Backup ${backupId} not found`, "BACKUP_NOT_FOUND", true)
        );
      }

      // Validate backup data
      const validationResult = this.validation.validate(backup.data);
      if (!validationResult.success) {
        return failureResult(
          new SaveError("Backup data is corrupted", "BACKUP_CORRUPTED", true)
        );
      }

      // Determine which slot this backup belongs to
      const slotId = backup.meta.slotId;

      // Save to local storage
      await this.db.put(slotId, backup.data);
      await this.db.putMeta(slotId, backup.meta);

      return successResult(undefined);
    } catch (error) {
      return failureResult(
        error instanceof SaveError
          ? error
          : new SaveError(
              error instanceof Error ? error.message : "Restore failed",
              "RESTORE_FAILED",
              true
            )
      );
    }
  }
}

/**
 * Singleton instance
 */
let instance: LoadService | null = null;

export function getLoadService(): LoadService {
  if (!instance) {
    instance = new LoadService();
  }
  return instance;
}
