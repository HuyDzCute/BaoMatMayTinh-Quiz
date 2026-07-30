"use client";

/**
 * Save Slot Card
 *
 * Phase 4: UI Components
 * Displays a single save slot with metadata
 */

import { memo, useCallback } from "react";
import {
  User,
  Gamepad2,
  Clock,
  Trash2,
  Copy,
  Edit3,
  Play,
  Cloud,
  CloudOff,
} from "lucide-react";
import type { SaveSlotMeta, SlotId } from "@/lib/save";

/**
 * Props for SaveSlotCard
 */
export interface SaveSlotCardProps {
  /** Slot metadata */
  slot: SaveSlotMeta;
  /** Whether this slot is currently active */
  isActive?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Show action buttons */
  showActions?: boolean;
  /** Click handler for loading the slot */
  onLoad?: (slotId: SlotId) => void;
  /** Click handler for deleting the slot */
  onDelete?: (slotId: SlotId) => void;
  /** Click handler for duplicating the slot */
  onDuplicate?: (slotId: SlotId) => void;
  /** Click handler for renaming the slot */
  onRename?: (slotId: SlotId) => void;
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

  if (days > 0) return `${days} ngày trước`;
  if (hours > 0) return `${hours} giờ trước`;
  if (minutes > 0) return `${minutes} phút trước`;
  return "Vừa xong";
}

/**
 * Format play time
 */
function formatPlayTime(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} phút`;
}

/**
 * Save slot card component
 */
export const SaveSlotCard = memo(function SaveSlotCard({
  slot,
  isActive = false,
  isLoading = false,
  showActions = true,
  onLoad,
  onDelete,
  onDuplicate,
  onRename,
}: SaveSlotCardProps) {
  const handleLoad = useCallback(() => {
    if (!isLoading && onLoad) {
      onLoad(slot.slotId);
    }
  }, [isLoading, onLoad, slot.slotId]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onDelete) {
        onDelete(slot.slotId);
      }
    },
    [onDelete, slot.slotId]
  );

  const handleDuplicate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onDuplicate) {
        onDuplicate(slot.slotId);
      }
    },
    [onDuplicate, slot.slotId]
  );

  const handleRename = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onRename) {
        onRename(slot.slotId);
      }
    },
    [onRename, slot.slotId]
  );

  // Empty slot state
  if (slot.isEmpty) {
    return (
      <button
        type="button"
        onClick={handleLoad}
        disabled={isLoading}
        className={[
          "w-full p-4 rounded-lg border-2 border-dashed",
          "border-gray-300 dark:border-gray-600",
          "hover:border-blue-500 dark:hover:border-blue-400",
          "transition-colors duration-200",
          "flex flex-col items-center justify-center gap-2",
          "text-gray-500 dark:text-gray-400",
          "min-h-[160px]",
        ].join(" ")}
        aria-label={`Slot ${slot.slotId}: Trống - tạo game mới`}
      >
        <span className="text-lg font-medium">Slot {slot.slotId}</span>
        <span className="text-sm">+ Tạo game mới</span>
      </button>
    );
  }

  // Filled slot card
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleLoad}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleLoad();
        }
      }}
      className={[
        "w-full p-4 rounded-lg border-2",
        "bg-white dark:bg-gray-800",
        "transition-all duration-200",
        isActive
          ? "border-blue-500 ring-2 ring-blue-500 ring-offset-2"
          : "border-gray-200 dark:border-gray-700",
        "hover:border-blue-400 dark:hover:border-blue-500",
        "hover:shadow-md",
        "cursor-pointer",
        "min-h-[160px]",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`Slot ${slot.slotId}: ${slot.playerName}, Level ${slot.level}`}
      aria-pressed={isActive}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            Slot {slot.slotId}
          </span>
          {slot.cloudSyncedAt ? (
            <Cloud className="w-4 h-4 text-green-600" aria-label="Đã đồng bộ đám mây" />
          ) : (
            <CloudOff className="w-4 h-4 text-gray-400" aria-label="Chưa đồng bộ" />
          )}
        </div>

        {/* Action buttons */}
        {showActions && (
          <div className="flex items-center gap-1" role="group" aria-label="Hành động">
            <button
              type="button"
              onClick={handleRename}
              className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              aria-label="Đổi tên"
              disabled={isLoading}
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDuplicate}
              className="p-1.5 rounded-md text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
              aria-label="Sao chép"
              disabled={isLoading}
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              aria-label="Xóa"
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Player info */}
      <div className="flex items-center gap-2 mb-2">
        <User className="w-4 h-4 text-gray-400" aria-hidden="true" />
        <span className="font-medium text-gray-900 dark:text-white truncate">
          {slot.playerName}
        </span>
      </div>

      {/* Level and XP */}
      <div className="flex items-center gap-2 mb-2">
        <Gamepad2 className="w-4 h-4 text-gray-400" aria-hidden="true" />
        <span className="text-sm text-gray-600 dark:text-gray-300">
          Level {slot.level} • {slot.totalXP.toLocaleString()} XP
        </span>
      </div>

      {/* Last played */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Clock className="w-4 h-4" aria-hidden="true" />
        <span>{formatRelativeTime(slot.lastPlayedAt)}</span>
        {slot.playTimeMs > 0 && (
          <span className="text-gray-400">• {formatPlayTime(slot.playTimeMs)}</span>
        )}
      </div>

      {/* Achievements badge */}
      {slot.achievementsCount > 0 && (
        <div className="mt-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            {slot.achievementsCount} thành tựu
          </span>
        </div>
      )}

      {/* Active indicator */}
      {isActive && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <span className="inline-flex items-center text-xs font-medium text-blue-600 dark:text-blue-400">
            <Play className="w-3 h-3 mr-1" />
            Đang chơi
          </span>
        </div>
      )}
    </div>
  );
});
