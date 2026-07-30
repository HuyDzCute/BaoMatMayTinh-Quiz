/**
 * Save Manager Hook
 *
 * Phase 2: Save/Load Hooks
 * Main hook for save operations with auto-save support
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { SlotId, SaveSlot, SaveSlotMeta } from "../types/save-slot";
import type { SaveData } from "../types/save-data";
import type { SyncState, ConflictResolution } from "../types/sync-state";
import { SaveError } from "../types/errors";
import {
  SaveService,
  LoadService,
  ValidationService,
} from "../services";
import { getSyncService, type SyncService } from "../infrastructure/sync-service";
import { createDefaultSaveData } from "../types/save-data";

/**
 * Save manager hook state
 */
export interface UseSaveManagerState {
  activeSlotId: SlotId | null;
  currentData: SaveData | null;
  isLoading: boolean;
  isSaving: boolean;
  isInitialized: boolean;
  error: SaveError | null;
  lastSavedAt: number | null;
  unsavedChanges: boolean;
}

/**
 * Save manager hook return type
 */
export interface UseSaveManagerReturn extends UseSaveManagerState {
  // Initialization
  initialize: () => Promise<void>;

  // Save operations
  save: (data?: Partial<SaveData>) => Promise<void>;
  saveToSlot: (slotId: SlotId, data: SaveData) => Promise<void>;
  autoSave: () => Promise<void>;

  // Load operations
  load: (slotId: SlotId) => Promise<SaveData | null>;
  loadLatest: () => Promise<SaveSlot | null>;
  createNewGame: (playerName: string, slotId: SlotId) => Promise<void>;

  // Slot operations
  getAllSlots: () => Promise<SaveSlotMeta[]>;
  deleteSlot: (slotId: SlotId) => Promise<void>;
  duplicateSlot: (sourceSlotId: SlotId, targetSlotId: SlotId) => Promise<void>;

  // Sync operations
  sync: () => Promise<void>;
  resolveConflict: (resolution: ConflictResolution) => Promise<void>;

  // Utilities
  setActiveSlot: (slotId: SlotId | null) => void;
  clearError: () => void;
  getSyncState: () => SyncState;
}

/**
 * Default state
 */
function createInitialState(): UseSaveManagerState {
  return {
    activeSlotId: null,
    currentData: null,
    isLoading: false,
    isSaving: false,
    isInitialized: false,
    error: null,
    lastSavedAt: null,
    unsavedChanges: false,
  };
}

/**
 * Save manager hook
 */
export function useSaveManager(): UseSaveManagerReturn {
  const [state, setState] = useState<UseSaveManagerState>(createInitialState);

  // Service instances
  const saveServiceRef = useRef<SaveService | null>(null);
  const loadServiceRef = useRef<LoadService | null>(null);
  const syncServiceRef = useRef<SyncService | null>(null);
  const validationServiceRef = useRef<ValidationService | null>(null);

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Initialize services
   */
  const initialize = useCallback(async () => {
    if (state.isInitialized) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Create service instances
      saveServiceRef.current = new SaveService();
      loadServiceRef.current = new LoadService();
      syncServiceRef.current = getSyncService();
      validationServiceRef.current = new ValidationService();

      // Initialize sync service listener
      syncServiceRef.current.onStateChange(() => {
        // Force re-render on sync state change
        setState((prev) => ({ ...prev }));
      });

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isInitialized: true,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof SaveError
            ? error
            : new SaveError(
                error instanceof Error ? error.message : "Initialization failed",
                "INIT_FAILED"
              ),
      }));
    }
  }, [state.isInitialized]);

  /**
   * Save current game state
   */
  const save = useCallback(
    async (data?: Partial<SaveData>) => {
      if (!state.activeSlotId || !state.currentData) {
        return;
      }

      const slotId = state.activeSlotId;
      const saveData = data
        ? { ...state.currentData, ...data }
        : state.currentData;

      setState((prev) => ({ ...prev, isSaving: true, error: null }));

      try {
        // Update metadata
        saveData.metadata = {
          ...saveData.metadata,
          modifiedAt: Date.now(),
        };

        await saveServiceRef.current?.save(slotId, saveData);

        setState((prev) => ({
          ...prev,
          currentData: saveData,
          isSaving: false,
          lastSavedAt: Date.now(),
          unsavedChanges: false,
        }));

        // Queue cloud sync
        await syncServiceRef.current?.queueOperation("upload", slotId, saveData);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isSaving: false,
          error:
            error instanceof SaveError
              ? error
              : new SaveError(
                  error instanceof Error ? error.message : "Save failed",
                  "SAVE_FAILED"
                ),
        }));
      }
    },
    [state.activeSlotId, state.currentData]
  );

  /**
   * Save to specific slot
   */
  const saveToSlot = useCallback(
    async (slotId: SlotId, data: SaveData) => {
      setState((prev) => ({ ...prev, isSaving: true, error: null }));

      try {
        await saveServiceRef.current?.save(slotId, data);

        setState((prev) => ({
          ...prev,
          isSaving: false,
          lastSavedAt: Date.now(),
        }));

        // Queue cloud sync
        await syncServiceRef.current?.queueOperation("upload", slotId, data);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isSaving: false,
          error:
            error instanceof SaveError
              ? error
              : new SaveError(
                  error instanceof Error ? error.message : "Save failed",
                  "SAVE_FAILED"
                ),
        }));
      }
    },
    []
  );

  /**
   * Auto-save (debounced)
   */
  const autoSave = useCallback(async () => {
    if (state.unsavedChanges) {
      await save();
    }
  }, [save, state.unsavedChanges]);

  /**
   * Load game from slot
   */
  const load = useCallback(async (slotId: SlotId): Promise<SaveData | null> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await loadServiceRef.current?.load(slotId);

      if (result?.success) {
        setState((prev) => ({
          ...prev,
          currentData: result.data,
          activeSlotId: slotId,
          isLoading: false,
          unsavedChanges: false,
        }));
        return result.data;
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result?.error || new SaveError("Load failed", "LOAD_FAILED"),
        }));
        return null;
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof SaveError
            ? error
            : new SaveError(
                error instanceof Error ? error.message : "Load failed",
                "LOAD_FAILED"
              ),
      }));
      return null;
    }
  }, []);

  /**
   * Load most recent save
   */
  const loadLatest = useCallback(async (): Promise<SaveSlot | null> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await loadServiceRef.current?.loadLatest();

      if (result?.success) {
        setState((prev) => ({
          ...prev,
          currentData: result.data.data,
          activeSlotId: result.data.slotId,
          isLoading: false,
          unsavedChanges: false,
        }));
        return result.data;
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));
        return null;
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof SaveError
            ? error
            : new SaveError(
                error instanceof Error ? error.message : "Load failed",
                "LOAD_FAILED"
              ),
      }));
      return null;
    }
  }, []);

  /**
   * Create new game
   */
  const createNewGame = useCallback(
    async (playerName: string, slotId: SlotId) => {
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

        await saveServiceRef.current?.createSlot(slotId, newData);

        setState((prev) => ({
          ...prev,
          currentData: newData,
          activeSlotId: slotId,
          isLoading: false,
          unsavedChanges: false,
          lastSavedAt: Date.now(),
        }));

        // Queue cloud sync
        await syncServiceRef.current?.queueOperation("upload", slotId, newData);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof SaveError
              ? error
              : new SaveError(
                  error instanceof Error ? error.message : "Create failed",
                  "CREATE_FAILED"
                ),
        }));
      }
    },
    []
  );

  /**
   * Get all slots
   */
  const getAllSlots = useCallback(async (): Promise<SaveSlotMeta[]> => {
    try {
      return (await saveServiceRef.current?.getAllSlots()) || [];
    } catch {
      return [];
    }
  }, []);

  /**
   * Delete slot
   */
  const deleteSlot = useCallback(async (slotId: SlotId) => {
    try {
      await saveServiceRef.current?.deleteSlot(slotId);

      setState((prev) => ({
        ...prev,
        activeSlotId:
          prev.activeSlotId === slotId ? null : prev.activeSlotId,
        currentData:
          prev.activeSlotId === slotId ? null : prev.currentData,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof SaveError
            ? error
            : new SaveError(
                error instanceof Error ? error.message : "Delete failed",
                "DELETE_FAILED"
              ),
      }));
    }
  }, []);

  /**
   * Duplicate slot
   */
  const duplicateSlot = useCallback(
    async (sourceSlotId: SlotId, targetSlotId: SlotId) => {
      try {
        const sourceSlot = await saveServiceRef.current?.getSlot(sourceSlotId);
        if (!sourceSlot) {
          throw new SaveError("Source slot not found", "NOT_FOUND");
        }

        await saveServiceRef.current?.createSlot(targetSlotId, sourceSlot.data);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof SaveError
              ? error
              : new SaveError(
                  error instanceof Error ? error.message : "Duplicate failed",
                  "DUPLICATE_FAILED"
                ),
        }));
      }
    },
    []
  );

  /**
   * Trigger manual sync
   */
  const sync = useCallback(async () => {
    try {
      await syncServiceRef.current?.forceSync();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof SaveError
            ? error
            : new SaveError(
                error instanceof Error ? error.message : "Sync failed",
                "SYNC_FAILED"
              ),
      }));
    }
  }, []);

  /**
   * Resolve conflict
   */
  const resolveConflict = useCallback(
    async (resolution: ConflictResolution) => {
      try {
        await syncServiceRef.current?.resolveConflict(resolution);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof SaveError
              ? error
              : new SaveError(
                  error instanceof Error
                    ? error.message
                    : "Conflict resolution failed",
                  "CONFLICT_FAILED"
                ),
        }));
      }
    },
    []
  );

  /**
   * Set active slot without loading
   */
  const setActiveSlot = useCallback((slotId: SlotId | null) => {
    setState((prev) => ({
      ...prev,
      activeSlotId: slotId,
      currentData: slotId === null ? null : prev.currentData,
    }));
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Get sync state
   */
  const getSyncState = useCallback((): SyncState => {
    return syncServiceRef.current?.getState() || {
      status: "idle",
      lastSyncedAt: null,
      pendingOperations: [],
      currentOperation: null,
      conflict: null,
      error: null,
      isOnline: true,
    };
  }, []);

  // Auto-save effect (every 30 seconds if there are unsaved changes)
  useEffect(() => {
    if (state.isInitialized && state.unsavedChanges) {
      autoSaveTimerRef.current = setTimeout(() => {
        autoSave();
      }, 30000); // 30 seconds
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [state.isInitialized, state.unsavedChanges, autoSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      syncServiceRef.current?.dispose();
    };
  }, []);

  return {
    ...state,
    initialize,
    save,
    saveToSlot,
    autoSave,
    load,
    loadLatest,
    createNewGame,
    getAllSlots,
    deleteSlot,
    duplicateSlot,
    sync,
    resolveConflict,
    setActiveSlot,
    clearError,
    getSyncState,
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
