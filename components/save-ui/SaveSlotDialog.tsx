"use client";

/**
 * Save Slot Dialog
 *
 * Phase 4: UI Components
 * Reusable dialog for save slot operations
 */

import { memo, useCallback, useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { SlotId, SaveSlotMeta } from "@/lib/save";

/**
 * Dialog mode
 */
export type SaveSlotDialogMode =
  | "new-game"
  | "rename"
  | "duplicate"
  | "delete";

/**
 * Props for SaveSlotDialog
 */
export interface SaveSlotDialogProps {
  /** Dialog mode */
  mode: SaveSlotDialogMode;
  /** Target slot ID */
  slotId: SlotId | null;
  /** Current slot name (for rename/delete) */
  currentName?: string;
  /** Target slot ID (for duplicate) */
  targetSlotId?: SlotId | null;
  /** Empty slots available (for duplicate) */
  emptySlots?: SaveSlotMeta[];
  /** Slot name for delete confirmation */
  slotName?: string;
  /** Input value */
  inputValue: string;
  /** Input change handler */
  onInputChange: (value: string) => void;
  /** Confirm handler */
  onConfirm: (input?: string) => void | Promise<void>;
  /** Cancel handler */
  onCancel: () => void;
  /** Processing state */
  isProcessing?: boolean;
}

/**
 * Dialog configuration by mode
 */
const DIALOG_CONFIG: Record<
  SaveSlotDialogMode,
  {
    title: string;
    confirmLabel: string;
    confirmVariant: "primary" | "danger";
    showInput: boolean;
    inputLabel: string;
    inputPlaceholder: string;
  }
> = {
  "new-game": {
    title: "Tạo game mới",
    confirmLabel: "Tạo",
    confirmVariant: "primary",
    showInput: true,
    inputLabel: "Tên người chơi",
    inputPlaceholder: "Nhập tên của bạn",
  },
  rename: {
    title: "Đổi tên",
    confirmLabel: "Lưu",
    confirmVariant: "primary",
    showInput: true,
    inputLabel: "Tên mới",
    inputPlaceholder: "Nhập tên mới",
  },
  duplicate: {
    title: "Sao chép slot",
    confirmLabel: "Sao chép",
    confirmVariant: "primary",
    showInput: false,
    inputLabel: "",
    inputPlaceholder: "",
  },
  delete: {
    title: "Xóa slot",
    confirmLabel: "Xóa",
    confirmVariant: "danger",
    showInput: false,
    inputLabel: "",
    inputPlaceholder: "",
  },
};

/**
 * Save slot dialog component
 */
export const SaveSlotDialog = memo(function SaveSlotDialog({
  mode,
  slotId,
  currentName,
  targetSlotId,
  emptySlots = [],
  slotName,
  inputValue,
  onInputChange,
  onConfirm,
  onCancel,
  isProcessing = false,
}: SaveSlotDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const config = DIALOG_CONFIG[mode];

  // Focus input on mount
  useEffect(() => {
    if (config.showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [config.showInput]);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    if (mode === "duplicate") {
      onConfirm(targetSlotId?.toString() ?? "");
    } else {
      onConfirm(inputValue);
    }
  }, [mode, inputValue, targetSlotId, onConfirm]);

  // Check if confirm should be disabled
  const canConfirm = () => {
    switch (mode) {
      case "new-game":
      case "rename":
        return inputValue.trim().length > 0;
      case "duplicate":
        return targetSlotId !== null && targetSlotId !== undefined;
      case "delete":
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="w-full">
      {/* Title */}
      <h3
        id="dialog-title"
        className="text-lg font-semibold text-gray-900 dark:text-white mb-4"
      >
        {config.title}
      </h3>

      {/* Slot info */}
      {slotId && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Slot {slotId}
        </p>
      )}

      {/* Warning for destructive actions */}
      {mode === "delete" && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Bạn có chắc muốn xóa?
              </p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                {slotName ? (
                  <>
                    Slot &quot;{slotName}&quot; sẽ bị xóa vĩnh viễn. Dữ liệu không thể khôi phục.
                  </>
                ) : (
                  <>Slot này sẽ bị xóa vĩnh viễn. Dữ liệu không thể khôi phục.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate info */}
      {mode === "duplicate" && currentName && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Sao chép &quot;{currentName}&quot; sang slot mới
          </p>
          {emptySlots.length === 0 ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              Không có slot trống nào
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {emptySlots.map((slot) => (
                <button
                  key={slot.slotId}
                  type="button"
                  onClick={() => onInputChange(slot.slotId.toString())}
                  className={[
                    "p-3 rounded-lg border-2 text-center transition-colors",
                    targetSlotId === slot.slotId
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300",
                  ].join(" ")}
                >
                  <span className="text-sm font-medium">Slot {slot.slotId}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input field */}
      {config.showInput && (
        <div className="mb-4">
          <label
            htmlFor="slot-input"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {config.inputLabel}
          </label>
          <input
            ref={inputRef}
            id="slot-input"
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={config.inputPlaceholder}
            maxLength={50}
            className={[
              "w-full px-4 py-2 rounded-lg border-2",
              "bg-white dark:bg-gray-800",
              "text-gray-900 dark:text-white",
              "placeholder-gray-400 dark:placeholder-gray-500",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "transition-colors",
            ].join(" ")}
            aria-describedby="input-hint"
          />
          <p id="input-hint" className="mt-1 text-xs text-gray-500">
            {inputValue.length}/50 ký tự
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className={[
            "px-4 py-2 rounded-lg font-medium transition-colors",
            "border border-gray-300 dark:border-gray-600",
            "text-gray-700 dark:text-gray-300",
            "hover:bg-gray-50 dark:hover:bg-gray-800",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm() || isProcessing}
          className={[
            "px-4 py-2 rounded-lg font-medium transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            config.confirmVariant === "primary"
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-red-600 text-white hover:bg-red-700",
          ].join(" ")}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang xử lý...
            </span>
          ) : (
            config.confirmLabel
          )}
        </button>
      </div>
    </div>
  );
});
