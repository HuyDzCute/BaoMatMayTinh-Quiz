/**
 * Save Slot Types
 *
 * Phase 1: Core Infrastructure
 * Definitions for save slot management
 */

import type { SaveData } from "./save-data";

/**
 * Unique identifier for a save slot (1-3)
 */
export type SlotId = 1 | 2 | 3;

/**
 * Maximum number of save slots
 */
export const MAX_SLOTS: SlotId[] = [1, 2, 3];

/**
 * Slot metadata (stored separately for quick listing)
 */
export interface SaveSlotMeta {
  slotId: SlotId;
  playerName: string;
  level: number;
  totalXP: number;
  achievementsCount: number;
  lastPlayedAt: number;
  playTimeMs: number;
  saveDuration: number;
  cloudSyncedAt: number | null;
  localModifiedAt: number;
  version: string;
  isEmpty: boolean;
}

/**
 * Full save slot with data
 */
export interface SaveSlot extends SaveSlotMeta {
  data: SaveData;
}

/**
 * Active slot selection
 */
export interface ActiveSlot {
  slotId: SlotId | null;
  isLoaded: boolean;
  isDirty: boolean;
}

/**
 * Slot creation options
 */
export interface CreateSlotOptions {
  slotId: SlotId;
  playerName: string;
  initialData: SaveData;
}

/**
 * Slot summary for listing
 */
export interface SlotSummary {
  slotId: SlotId;
  playerName: string;
  level: number;
  totalXP: number;
  lastPlayedAt: number;
  isEmpty: boolean;
  hasUnsavedChanges: boolean;
  cloudStatus: "synced" | "pending" | "conflict" | "none";
}

/**
 * Create empty slot metadata
 */
export function createEmptySlotMeta(slotId: SlotId): SaveSlotMeta {
  return {
    slotId,
    playerName: "",
    level: 1,
    totalXP: 0,
    achievementsCount: 0,
    lastPlayedAt: 0,
    playTimeMs: 0,
    saveDuration: 0,
    cloudSyncedAt: null,
    localModifiedAt: 0,
    version: "1.0.0",
    isEmpty: true,
  };
}

/**
 * Check if slot ID is valid
 */
export function isValidSlotId(value: number): value is SlotId {
  return [1, 2, 3].includes(value);
}
