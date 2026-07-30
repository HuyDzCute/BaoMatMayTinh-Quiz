"use client";

/**
 * Save Slot Manager
 *
 * Phase 4: UI Components
 * Main UI for managing save slots
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useSaveSlots, type SlotId, type SaveSlotMeta } from "@/lib/save";
import { SaveSlotCard } from "./SaveSlotCard";
import { SaveSlotDialog } from "./SaveSlotDialog";

/**
 * Props for SaveSlotManager
 */
export interface SaveSlotManagerProps {
  /** Currently active slot ID */
  activeSlotId?: SlotId | null;
  /** Callback when a slot is selected to load */
  onLoadSlot?: (slotId: SlotId) => void;
  /** Callback when creating new game */
  onNewGame?: (playerName: string, slotId: SlotId) => void;
  /** Callback when starting game */
  onStartGame?: () => void;
  /** Maximum number of slots */
  maxSlots?: number;
  /** Show header */
  showHeader?: boolean;
  /** Custom title */
  title?: string;
}

/**
 * Dialog mode
 */
type DialogMode = "load" | "rename" | "duplicate" | "delete" | null;

/**
 * Save slot manager component
 */
export function SaveSlotManager({
  activeSlotId,
  onLoadSlot,
  onNewGame,
  onStartGame,
  maxSlots = 6,
  showHeader = true,
  title = "Quản lý lưu game",
}: SaveSlotManagerProps) {
  const {
    slots,
    isLoading,
    error,
    refreshSlots,
    createSlot,
    deleteSlot,
    renameSlot,
    duplicateSlot,
  } = useSaveSlots();

  // Dialog state
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [dialogSlotId, setDialogSlotId] = useState<SlotId | null>(null);
  const [dialogInput, setDialogInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Dialog ref for focus trap
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close dialog callback (defined before useEffect)
  const closeDialog = useCallback(() => {
    setDialogMode(null);
    setDialogSlotId(null);
    setDialogInput("");
    setIsProcessing(false);
  }, []);

  // Open dialog callback
  const openDialog = useCallback((mode: DialogMode, slotId?: SlotId) => {
    setDialogMode(mode);
    setDialogSlotId(slotId ?? null);
    setDialogInput("");
  }, []);

  // Close dialog on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dialogMode) {
        closeDialog();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dialogMode, closeDialog]);

  // Focus trap for dialog
  useEffect(() => {
    if (dialogMode && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [dialogMode]);

  /**
   * Handle load slot
   */
  const handleLoadSlot = useCallback(
    (slotId: SlotId) => {
      const slot = slots.find((s: SaveSlotMeta) => s.slotId === slotId);

      if (!slot) return;

      if (slot.isEmpty) {
        openDialog("load", slotId);
      } else {
        onLoadSlot?.(slotId);
      }
    },
    [slots, onLoadSlot, openDialog]
  );

  /**
   * Handle delete slot
   */
  const handleDeleteSlot = useCallback(
    async (slotId: SlotId) => {
      setIsProcessing(true);
      try {
        await deleteSlot(slotId);
        closeDialog();
      } catch (err) {
        // Error handled by hook
      } finally {
        setIsProcessing(false);
      }
    },
    [deleteSlot, closeDialog]
  );

  /**
   * Handle rename slot
   */
  const handleRenameSlot = useCallback(
    async (slotId: SlotId, newName: string) => {
      setIsProcessing(true);
      try {
        await renameSlot(slotId, newName);
        closeDialog();
      } catch (err) {
        // Error handled by hook
      } finally {
        setIsProcessing(false);
      }
    },
    [renameSlot, closeDialog]
  );

  /**
   * Handle duplicate slot
   */
  const handleDuplicateSlot = useCallback(
    async (sourceSlotId: SlotId, targetSlotId: SlotId) => {
      setIsProcessing(true);
      try {
        await duplicateSlot(sourceSlotId, targetSlotId);
        closeDialog();
      } catch (err) {
        // Error handled by hook
      } finally {
        setIsProcessing(false);
      }
    },
    [duplicateSlot, closeDialog]
  );

  /**
   * Handle new game creation
   */
  const handleNewGame = useCallback(
    async (playerName: string) => {
      if (!dialogSlotId) return;

      setIsProcessing(true);
      try {
        await createSlot(dialogSlotId, playerName);
        closeDialog();
        onNewGame?.(playerName, dialogSlotId);
        onStartGame?.();
      } catch (err) {
        // Error handled by hook
      } finally {
        setIsProcessing(false);
      }
    },
    [dialogSlotId, createSlot, closeDialog, onNewGame, onStartGame]
  );

  /**
   * Dialog content based on mode
   */
  const renderDialogContent = () => {
    const slot = slots.find((s: SaveSlotMeta) => s.slotId === dialogSlotId);

    switch (dialogMode) {
      case "load":
        return (
          <SaveSlotDialog
            mode="new-game"
            slotId={dialogSlotId}
            onConfirm={(name) => handleNewGame(name ?? "")}
            onCancel={closeDialog}
            isProcessing={isProcessing}
            inputValue={dialogInput}
            onInputChange={setDialogInput}
          />
        );

      case "rename":
        return (
          <SaveSlotDialog
            mode="rename"
            slotId={dialogSlotId}
            currentName={slot?.playerName}
            onConfirm={(name) => handleRenameSlot(dialogSlotId!, name ?? "")}
            onCancel={closeDialog}
            isProcessing={isProcessing}
            inputValue={dialogInput}
            onInputChange={setDialogInput}
          />
        );

      case "duplicate":
        return (
          <SaveSlotDialog
            mode="duplicate"
            slotId={dialogSlotId}
            targetSlotId={dialogInput ? (parseInt(dialogInput, 10) as SlotId) : null}
            emptySlots={slots.filter((s: SaveSlotMeta) => s.isEmpty)}
            onConfirm={(targetId) =>
              handleDuplicateSlot(dialogSlotId!, (parseInt(targetId ?? "0", 10)) as SlotId)
            }
            onCancel={closeDialog}
            isProcessing={isProcessing}
            inputValue={dialogInput}
            onInputChange={setDialogInput}
          />
        );

      case "delete":
        return (
          <SaveSlotDialog
            mode="delete"
            slotId={dialogSlotId}
            slotName={slot?.playerName}
            onConfirm={() => handleDeleteSlot(dialogSlotId!)}
            onCancel={closeDialog}
            isProcessing={isProcessing}
            inputValue=""
            onInputChange={() => {}}
          />
        );

      default:
        return null;
    }
  };

  // Generate all slot IDs
  const allSlotIds: SlotId[] = Array.from({ length: maxSlots }, (_, i) => (i + 1) as SlotId);

  // Get slot metadata or empty slot
  const getSlotData = (slotId: SlotId): SaveSlotMeta => {
    const existing = slots.find((s: SaveSlotMeta) => s.slotId === slotId);
    if (existing) return existing;

    return {
      slotId,
      playerName: "",
      level: 0,
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
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4" role="region" aria-label={title}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={() => refreshSlots()}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Làm mới danh sách"
            disabled={isLoading}
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          role="alert"
        >
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>{error.message}</span>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && slots.length === 0 && (
        <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Đang tải...</span>
        </div>
      )}

      {/* Slot grid */}
      {!isLoading || slots.length > 0 ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          role="list"
          aria-label="Danh sách slot lưu game"
        >
          {allSlotIds.map((slotId) => (
            <SaveSlotCard
              key={slotId}
              slot={getSlotData(slotId)}
              isActive={activeSlotId === slotId}
              isLoading={isProcessing && dialogSlotId === slotId}
              onLoad={handleLoadSlot}
              onDelete={(id) => openDialog("delete", id)}
              onDuplicate={(id) => openDialog("duplicate", id)}
              onRename={(id) => openDialog("rename", id)}
            />
          ))}
        </div>
      ) : null}

      {/* Empty state */}
      {!isLoading && slots.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Chưa có game nào được lưu
          </p>
          <button
            type="button"
            onClick={() => openDialog("load", 1 as SlotId)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tạo game mới
          </button>
        </div>
      )}

      {/* Dialog overlay */}
      {dialogMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeDialog();
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
        >
          <div
            ref={dialogRef}
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
            tabIndex={-1}
          >
            {renderDialogContent()}
          </div>
        </div>
      )}
    </div>
  );
}
