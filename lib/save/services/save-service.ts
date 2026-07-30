/**
 * Save Service
 *
 * Phase 1: Core Infrastructure
 * Core save orchestration logic
 */

import type { SlotId, SaveSlotMeta, SaveSlot } from "../types/save-slot";
import type { SaveData } from "../types/save-data";
import {
  SaveError,
  type SaveResult,
  successResult,
  failureResult,
} from "../types/errors";
import { getIndexedDBAdapter, type IndexedDBAdapter } from "../infrastructure/indexeddb-adapter";
import { getValidationService, type ValidationService } from "./validation-service";
import { createEmptySlotMeta } from "../types/save-slot";

/**
 * Save options
 */
export interface SaveOptions {
  forceCloud?: boolean;
  skipValidation?: boolean;
  backupBefore?: boolean;
  updateMetadata?: Partial<SaveSlotMeta>;
}

/**
 * Save service interface
 */
export interface ISaveService {
  saveLocal(slotId: SlotId, data: SaveData): Promise<void>;
  save(slotId: SlotId, data: SaveData, options?: SaveOptions): Promise<SaveResult<void>>;
  backup(slotId: SlotId): Promise<string>;
  getAllSlots(): Promise<SaveSlotMeta[]>;
  getSlot(slotId: SlotId): Promise<SaveSlot | null>;
  deleteSlot(slotId: SlotId): Promise<SaveResult<void>>;
  createSlot(slotId: SlotId, data: SaveData): Promise<SaveResult<void>>;
}

/**
 * Default save service implementation
 */
export class SaveService implements ISaveService {
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
   * Save to local storage only (synchronous from user's perspective)
   */
  async saveLocal(slotId: SlotId, data: SaveData): Promise<void> {
    // Validate
    const validationResult = this.validation.validate(data);
    if (!validationResult.success) {
      throw validationResult.error;
    }

    // Update metadata
    const meta = this.createMetaFromData(slotId, data);
    meta.localModifiedAt = Date.now();

    // Write to IndexedDB
    await this.db.put(slotId, data);
    await this.db.putMeta(slotId, meta);
  }

  /**
   * Full save operation with validation and optional backup
   */
  async save(
    slotId: SlotId,
    data: SaveData,
    options: SaveOptions = {}
  ): Promise<SaveResult<void>> {
    const startTime = Date.now();

    try {
      // 1. Create backup if requested
      if (options.backupBefore) {
        await this.backup(slotId);
      }

      // 2. Validate data
      if (!options.skipValidation) {
        const validationResult = this.validation.validate(data);
        if (!validationResult.success) {
          return validationResult;
        }
      }

      // 3. Update metadata
      const meta = this.createMetaFromData(slotId, data);
      meta.localModifiedAt = Date.now();
      meta.version = data.version;

      // Apply any provided metadata updates
      if (options.updateMetadata) {
        Object.assign(meta, options.updateMetadata);
      }

      // 4. Write to local storage
      await this.db.put(slotId, data);
      await this.db.putMeta(slotId, meta);

      // 5. Update save duration
      meta.saveDuration = Date.now() - startTime;

      return successResult(undefined);
    } catch (error) {
      return failureResult(
        error instanceof SaveError
          ? error
          : new SaveError(
              error instanceof Error ? error.message : "Save failed",
              "SAVE_FAILED",
              true
            )
      );
    }
  }

  /**
   * Create a backup of the current slot
   */
  async backup(slotId: SlotId): Promise<string> {
    const data = await this.db.get(slotId);
    const meta = await this.db.getMeta(slotId);

    if (!data || !meta) {
      throw new SaveError(`No save data found for slot ${slotId}`, "NOT_FOUND", true);
    }

    const backupId = `backup_${slotId}_${Date.now()}`;
    await this.db.putBackup(backupId, data, meta);

    // Prune old backups (keep last 5)
    await this.db.pruneBackups(5);

    return backupId;
  }

  /**
   * Get metadata for all slots
   */
  async getAllSlots(): Promise<SaveSlotMeta[]> {
    const metas = await this.db.getAllMeta();
    const result: SaveSlotMeta[] = [];

    // Ensure all 3 slots are represented
    for (const slotId of [1, 2, 3] as SlotId[]) {
      const existing = metas.find((m) => m.slotId === slotId);
      result.push(existing || createEmptySlotMeta(slotId));
    }

    return result;
  }

  /**
   * Get complete slot with data
   */
  async getSlot(slotId: SlotId): Promise<SaveSlot | null> {
    const data = await this.db.get(slotId);
    const meta = await this.db.getMeta(slotId);

    if (!data || !meta) {
      return null;
    }

    return { ...meta, data };
  }

  /**
   * Delete a slot
   */
  async deleteSlot(slotId: SlotId): Promise<SaveResult<void>> {
    try {
      await this.db.delete(slotId);
      return successResult(undefined);
    } catch (error) {
      return failureResult(
        error instanceof SaveError
          ? error
          : new SaveError(
              error instanceof Error ? error.message : "Delete failed",
              "DELETE_FAILED",
              true
            )
      );
    }
  }

  /**
   * Create a new slot with initial data
   */
  async createSlot(slotId: SlotId, data: SaveData): Promise<SaveResult<void>> {
    try {
      // Validate data first
      const validationResult = this.validation.validate(data);
      if (!validationResult.success) {
        return validationResult;
      }

      // Create metadata
      const meta = this.createMetaFromData(slotId, data);
      meta.isEmpty = false;
      meta.localModifiedAt = Date.now();

      // Write both data and metadata
      await this.db.put(slotId, data);
      await this.db.putMeta(slotId, meta);

      return successResult(undefined);
    } catch (error) {
      return failureResult(
        error instanceof SaveError
          ? error
          : new SaveError(
              error instanceof Error ? error.message : "Create slot failed",
              "CREATE_FAILED",
              true
            )
      );
    }
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private createMetaFromData(slotId: SlotId, data: SaveData): SaveSlotMeta {
    return {
      slotId,
      playerName: data.player.name,
      level: data.progression.level.currentLevel,
      totalXP: data.progression.lifetimeXP,
      achievementsCount: Object.keys(data.progression.achievements).length,
      lastPlayedAt: data.metadata.modifiedAt,
      playTimeMs: data.metadata.saveDuration,
      saveDuration: data.metadata.saveDuration,
      cloudSyncedAt: null,
      localModifiedAt: data.metadata.modifiedAt,
      version: data.version,
      isEmpty: false,
    };
  }
}

/**
 * Singleton instance
 */
let instance: SaveService | null = null;

export function getSaveService(): SaveService {
  if (!instance) {
    instance = new SaveService();
  }
  return instance;
}
