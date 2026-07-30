"use client";

/**
 * Conflict Dialog
 *
 * Phase 4: UI Components
 * Allows users to resolve save conflicts between local and cloud versions
 */

import { memo, useCallback, useState, useEffect, useRef } from "react";
import {
  Monitor,
  Cloud,
  GitMerge,
  AlertTriangle,
  Clock,
  User,
  Gamepad2,
  X,
  Loader2,
} from "lucide-react";
import type { ConflictResolution, ConflictInfo } from "@/lib/save";
import { useCloudSync } from "@/lib/save";

/**
 * Resolution option
 */
interface ResolutionOption {
  value: ConflictResolution;
  label: string;
  description: string;
  icon: typeof Monitor;
  variant: "primary" | "secondary" | "warning" | "danger";
}

/**
 * Props for ConflictDialog
 */
export interface ConflictDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Conflict information */
  conflict?: ConflictInfo | null;
  /** Confirm handler */
  onConfirm: (resolution: ConflictResolution) => Promise<void>;
  /** Cancel handler */
  onCancel: () => void;
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} ngày`;
  if (hours > 0) return `${hours} giờ`;
  if (minutes > 0) return `${minutes} phút`;
  return "Vừa xong";
}

/**
 * Resolution options
 */
const RESOLUTION_OPTIONS: ResolutionOption[] = [
  {
    value: "keep_local",
    label: "Giữ dữ liệu cục bộ",
    description: "Sử dụng phiên bản đã lưu trên máy này",
    icon: Monitor,
    variant: "primary",
  },
  {
    value: "keep_cloud",
    label: "Giữ dữ liệu đám mây",
    description: "Sử dụng phiên bản đã lưu trên server",
    icon: Cloud,
    variant: "secondary",
  },
  {
    value: "merge",
    label: "Ghép dữ liệu",
    description: "Kết hợp cả hai phiên bản (ưu tiên thành tựu cao nhất)",
    icon: GitMerge,
    variant: "warning",
  },
];

/**
 * Conflict dialog component
 */
export const ConflictDialog = memo(function ConflictDialog({
  isOpen,
  conflict,
  onConfirm,
  onCancel,
}: ConflictDialogProps) {
  const { resolveConflict } = useCloudSync();
  const [selectedResolution, setSelectedResolution] = useState<ConflictResolution | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedResolution(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isProcessing) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, isProcessing, onCancel]);

  // Focus trap
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  /**
   * Handle confirm
   */
  const handleConfirm = useCallback(async () => {
    if (!selectedResolution || isProcessing) return;

    setIsProcessing(true);
    try {
      await onConfirm(selectedResolution);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedResolution, isProcessing, onConfirm]);

  if (!isOpen || !conflict) {
    return null;
  }

  // Get version info
  const localVersion = conflict.localVersion;
  const cloudVersion = conflict.cloudVersion;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          onCancel();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-dialog-title"
      aria-describedby="conflict-dialog-description"
    >
      <div
        ref={dialogRef}
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-500" aria-hidden="true" />
            <div>
              <h2 id="conflict-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                Xung đột dữ liệu
              </h2>
              <p id="conflict-dialog-description" className="text-sm text-gray-500 dark:text-gray-400">
                Slot {conflict.slotId} - Chọn phiên bản muốn giữ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Version comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Local version */}
            <div className="p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-2 mb-3">
                <Monitor className="w-5 h-5 text-blue-600" aria-hidden="true" />
                <h3 className="font-medium text-blue-900 dark:text-blue-300">
                  Máy này
                </h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {localVersion.player.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Level {localVersion.progression.level.currentLevel}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {formatRelativeTime(conflict.localModifiedAt)}
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {localVersion.progression.lifetimeXP.toLocaleString()} XP
                </p>
              </div>
            </div>

            {/* Cloud version */}
            <div className="p-4 rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-2 mb-3">
                <Cloud className="w-5 h-5 text-green-600" aria-hidden="true" />
                <h3 className="font-medium text-green-900 dark:text-green-300">
                  Đám mây
                </h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {cloudVersion.player.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Level {cloudVersion.progression.level.currentLevel}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {formatRelativeTime(conflict.cloudModifiedAt)}
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                <p className="text-xs text-green-600 dark:text-green-400">
                  {cloudVersion.progression.lifetimeXP.toLocaleString()} XP
                </p>
              </div>
            </div>
          </div>

          {/* Resolution options */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Chọn cách xử lý
            </h4>
            {RESOLUTION_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedResolution === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedResolution(option.value)}
                  disabled={isProcessing}
                  className={[
                    "w-full p-4 rounded-lg border-2 text-left transition-all",
                    isSelected
                      ? option.variant === "primary"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                        : option.variant === "secondary"
                          ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                          : "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={[
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                        isSelected
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300 dark:border-gray-600",
                      ].join(" ")}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon
                          className={[
                            "w-5 h-5",
                            isSelected
                              ? "text-blue-600"
                              : "text-gray-400",
                          ].join(" ")}
                          aria-hidden="true"
                        />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {option.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Warning */}
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Lưu ý:</strong> Sau khi xác nhận, phiên bản không được chọn sẽ bị mất.
              Đảm bảo bạn đã chọn đúng phiên bản trước khi tiếp tục.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 flex items-center justify-end gap-3">
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
            disabled={!selectedResolution || isProcessing}
            className={[
              "px-6 py-2 rounded-lg font-medium transition-colors",
              "bg-blue-600 text-white hover:bg-blue-700",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xử lý...
              </span>
            ) : (
              "Xác nhận"
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
