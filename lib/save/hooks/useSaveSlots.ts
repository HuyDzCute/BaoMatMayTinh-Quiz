/**
 * Save Slots Hook
 *
 * Phase 2: Save/Load Hooks
 * Hook for managing save slots
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { SlotId, SaveSlotMeta, SaveSlot } from "../types/save-slot";
import { SaveService, LoadService } from "../services";
import { SaveError } from "../types/errors";
import { createDefaultSaveData } from "../types/save-data";

/**
 * Save slots hook state
 */
export interface UseSaveSlotsState {
  slots: SaveSlotMeta[];
  isLoading: boolean;
  error: SaveError | null;
}

/**
 * Save slots hook return type
 */
export interface UseSaveSlotsReturn extends UseSaveSlotsState {
  // Operations
  refreshSlots: () => Promise<void>;
  getSlot: (slotId: SlotId) => Promise<SaveSlot | null>;
  createSlot: (slotId: SlotId, playerName: string) => Promise<void>;
  deleteSlot: (slotId: SlotId) => Promise<void>;
  renameSlot: (slotId: SlotId, newName: string) => Promise<void>;
  duplicateSlot: (sourceSlotId: SlotId, targetSlotId: SlotId) => Promise<void>;

  // Utilities
  hasEmptySlot: boolean;
  getEmptySlots: () => SlotId[];
  getSlotById: (slotId: SlotId) => SaveSlotMeta | undefined;
}

/**
 * Default state
 */
function createInitialState(): UseSaveSlotsState {
  return {
    slots: [],
    isLoading: true,
    error: null,
  };
}

/**
 * Save slots hook
 */
export function useSaveSlots(): UseSaveSlotsReturn {
  const [state, setState] = useState<UseSaveSlotsState>(createInitialState);

  // Service instances using refs for stability
  const saveServiceRef = useRef<SaveService>(new SaveService());
  const loadServiceRef = useRef<LoadService>(new LoadService());

  /**
   * Refresh slots list
   */
  const refreshSlots = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const slots = await saveServiceRef.current.getAllSlots();
      setState({
        slots,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof SaveError
            ? error
            : new SaveError(
                error instanceof Error ? error.message : "Failed to load slots",
                "LOAD_SLOTS_FAILED"
              ),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Refs are stable, intentionally not in deps

  /**
   * Get specific slot
   */
  const getSlot = useCallback(
    async (slotId: SlotId): Promise<SaveSlot | null> => {
      try {
        return await saveServiceRef.current.getSlot(slotId);
      } catch {
        return null;
      }
    },
    []
  );

  /**
   * Create new slot
   */
  const createSlot = useCallback(
    async (slotId: SlotId, playerName: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Generate device ID
        const deviceId = getDeviceId();

        // Create default save data
        const newData = createDefaultSaveData(
          `player_${Date.now()}`,
          playerName,
          deviceId
        );

        await saveServiceRef.current.createSlot(slotId, newData);

        // Refresh slots
        await refreshSlots();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof SaveError
              ? error
              : new SaveError(
                  error instanceof Error ? error.message : "Failed to create slot",
                  "CREATE_SLOT_FAILED"
                ),
        }));
        throw error;
      }
    },
    [refreshSlots]
  );

  /**
   * Delete slot
   */
  const deleteSlot = useCallback(
    async (slotId: SlotId) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        await saveServiceRef.current.deleteSlot(slotId);
        await refreshSlots();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof SaveError
              ? error
              : new SaveError(
                  error instanceof Error ? error.message : "Failed to delete slot",
                  "DELETE_SLOT_FAILED"
                ),
        }));
        throw error;
      }
    },
    [refreshSlots]
  );

  /**
   * Rename slot
   */
  const renameSlot = useCallback(
    async (slotId: SlotId, newName: string) => {
      try {
        const slot = await saveServiceRef.current.getSlot(slotId);
        if (!slot) {
          throw new SaveError("Slot not found", "NOT_FOUND");
        }

        // Update player name
        slot.data.player.name = newName;
        slot.data.metadata.modifiedAt = Date.now();

        await saveServiceRef.current.save(slotId, slot.data);
        await refreshSlots();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof SaveError
              ? error
              : new SaveError(
                  error instanceof Error ? error.message : "Failed to rename slot",
                  "RENAME_SLOT_FAILED"
                ),
        }));
        throw error;
      }
    },
    [refreshSlots]
  );

  /**
   * Duplicate slot
   */
  const duplicateSlot = useCallback(
    async (sourceSlotId: SlotId, targetSlotId: SlotId) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const sourceSlot = await saveServiceRef.current.getSlot(sourceSlotId);
        if (!sourceSlot) {
          throw new SaveError("Source slot not found", "NOT_FOUND");
        }

        await saveServiceRef.current.createSlot(targetSlotId, sourceSlot.data);
        await refreshSlots();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof SaveError
              ? error
              : new SaveError(
                  error instanceof Error
                    ? error.message
                    : "Failed to duplicate slot",
                  "DUPLICATE_SLOT_FAILED"
                ),
        }));
        throw error;
      }
    },
    [refreshSlots]
  );

  // Load slots on mount
  useEffect(() => {
    refreshSlots();
  }, [refreshSlots]);

  /**
   * Check if there's an empty slot
   */
  const hasEmptySlot = state.slots.some((slot) => slot.isEmpty);

  /**
   * Get list of empty slots
   */
  const getEmptySlots = useCallback((): SlotId[] => {
    return state.slots.filter((slot) => slot.isEmpty).map((slot) => slot.slotId);
  }, [state.slots]);

  /**
   * Get slot by ID
   */
  const getSlotById = useCallback(
    (slotId: SlotId): SaveSlotMeta | undefined => {
      return state.slots.find((slot) => slot.slotId === slotId);
    },
    [state.slots]
  );

  return {
    ...state,
    refreshSlots,
    getSlot,
    createSlot,
    deleteSlot,
    renameSlot,
    duplicateSlot,
    hasEmptySlot,
    getEmptySlots,
    getSlotById,
  };
}

/**
 * Get or create device ID
 */
function getDeviceId(): string {
  if (typeof window === "undefined") return "server";

  let deviceId = localStorage.getItem("wordrun_device_id");
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("wordrun_device_id", deviceId);
  }
  return deviceId;
}
