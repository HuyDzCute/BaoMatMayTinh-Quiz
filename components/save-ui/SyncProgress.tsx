"use client";

/**
 * Sync Progress
 *
 * Phase 4: UI Components
 * Shows sync progress, pending changes, and retry actions
 */

import { memo, useCallback } from "react";
import {
  Cloud,
  Upload,
  Download,
  Loader2,
  RefreshCw,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useCloudSync } from "@/lib/save";
import type { SyncOperation } from "@/lib/save";

/**
 * Props for SyncProgress
 */
export interface SyncProgressProps {
  /** Show detailed information */
  showDetails?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Custom className */
  className?: string;
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
 * Operation icon component
 */
const OperationIcon = memo(function OperationIcon({
  type,
  status,
}: {
  type: "upload" | "download" | "delete";
  status: "pending" | "in_progress" | "completed" | "failed";
}) {
  const icons = {
    upload: Upload,
    download: Download,
    delete: RefreshCw,
  };
  const Icon = icons[type] || Upload;

  const colorClass =
    status === "completed"
      ? "text-green-600"
      : status === "failed"
        ? "text-red-600"
        : status === "in_progress"
          ? "text-blue-600"
          : "text-gray-400";

  return (
    <Icon
      className={[
        "w-4 h-4",
        colorClass,
        status === "in_progress" ? "animate-pulse" : "",
      ].join(" ")}
      aria-hidden="true"
    />
  );
});

/**
 * Sync progress component
 */
export const SyncProgress = memo(function SyncProgress({
  showDetails = true,
  compact = false,
  className = "",
}: SyncProgressProps) {
  const {
    status,
    isOnline,
    isSyncing,
    lastSyncedAt,
    pendingChanges,
    currentOperation,
    error,
    sync,
    hasConflict,
  } = useCloudSync();

  const handleRetry = useCallback(async () => {
    try {
      await sync();
    } catch (err) {
      // Error handled by hook
    }
  }, [sync]);

  // Offline state
  if (!isOnline) {
    return (
      <div
        className={[
          "flex items-center gap-2 p-3 rounded-lg",
          "bg-gray-50 dark:bg-gray-800/50",
          "border border-gray-200 dark:border-gray-700",
          className,
        ].join(" ")}
        role="status"
        aria-live="polite"
      >
        <WifiOff className="w-5 h-5 text-gray-500" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Đang offline
          </p>
          <p className="text-xs text-gray-500">
            {pendingChanges > 0
              ? `${pendingChanges} thay đổi đang chờ đồng bộ`
              : "Kết nối sẽ tự động khôi phục"}
          </p>
        </div>
      </div>
    );
  }

  // Syncing state
  if (isSyncing) {
    return (
      <div
        className={[
          "flex items-center gap-2 p-3 rounded-lg",
          "bg-blue-50 dark:bg-blue-900/20",
          "border border-blue-200 dark:border-blue-800",
          className,
        ].join(" ")}
        role="status"
        aria-live="polite"
      >
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Đang đồng bộ...
          </p>
          {currentOperation && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {currentOperation.type === "upload" ? "Đang tải lên" : "Đang tải xuống"} slot{" "}
              {currentOperation.slotId}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Conflict state
  if (hasConflict) {
    return (
      <div
        className={[
          "flex items-center gap-2 p-3 rounded-lg",
          "bg-yellow-50 dark:bg-yellow-900/20",
          "border border-yellow-200 dark:border-yellow-800",
          className,
        ].join(" ")}
        role="alert"
        aria-live="assertive"
      >
        <AlertCircle className="w-5 h-5 text-yellow-600" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            Xung đột dữ liệu
          </p>
          <p className="text-xs text-yellow-700 dark:text-yellow-400">
            Dữ liệu cục bộ và đám mây khác nhau
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={[
          "flex items-center gap-2 p-3 rounded-lg",
          "bg-red-50 dark:bg-red-900/20",
          "border border-red-200 dark:border-red-800",
          className,
        ].join(" ")}
        role="alert"
        aria-live="assertive"
      >
        <AlertCircle className="w-5 h-5 text-red-600" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            Lỗi đồng bộ
          </p>
          <p className="text-xs text-red-600 dark:text-red-400">{error.message}</p>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          className={[
            "p-2 rounded-lg",
            "text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30",
            "transition-colors",
          ].join(" ")}
          aria-label="Thử lại"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Synced state
  if (status === "synced" || status === "idle") {
    if (compact) {
      return (
        <div
          className={[
            "flex items-center gap-1.5",
            "text-green-600 dark:text-green-400",
            className,
          ].join(" ")}
          role="status"
          aria-label="Đã đồng bộ"
        >
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          {showDetails && lastSyncedAt && (
            <span className="text-xs">{formatRelativeTime(lastSyncedAt)}</span>
          )}
        </div>
      );
    }

    return (
      <div
        className={[
          "flex items-center gap-2 p-3 rounded-lg",
          "bg-green-50 dark:bg-green-900/20",
          "border border-green-200 dark:border-green-800",
          className,
        ].join(" ")}
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 className="w-5 h-5 text-green-600" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-700 dark:text-green-300">
            Đã đồng bộ
          </p>
          {lastSyncedAt && (
            <p className="text-xs text-green-600 dark:text-green-400">
              Lần cuối: {formatRelativeTime(lastSyncedAt)}
            </p>
          )}
        </div>
        <Cloud className="w-5 h-5 text-green-600" aria-hidden="true" />
      </div>
    );
  }

  // Pending changes state
  if (pendingChanges > 0) {
    return (
      <div
        className={[
          "flex items-center gap-2 p-3 rounded-lg",
          "bg-orange-50 dark:bg-orange-900/20",
          "border border-orange-200 dark:border-orange-800",
          className,
        ].join(" ")}
        role="status"
        aria-live="polite"
      >
        <Clock className="w-5 h-5 text-orange-600" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
            {pendingChanges} thay đổi chờ đồng bộ
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400">
            Nhấn để đồng bộ ngay
          </p>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          className={[
            "p-2 rounded-lg",
            "text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30",
            "transition-colors",
          ].join(" ")}
          aria-label="Đồng bộ ngay"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Default - synced
  return (
    <div
      className={[
        "flex items-center gap-2 p-3 rounded-lg",
        "bg-gray-50 dark:bg-gray-800/50",
        "border border-gray-200 dark:border-gray-700",
        className,
      ].join(" ")}
      role="status"
    >
      <Cloud className="w-5 h-5 text-gray-400" aria-hidden="true" />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Sẵn sàng đồng bộ
        </p>
      </div>
    </div>
  );
});

/**
 * Pending operations list component
 */
export const PendingOperationsList = memo(function PendingOperationsList({
  className = "",
}: {
  className?: string;
}) {
  const { pendingOperations, status, isSyncing } = useCloudSync();

  if (pendingOperations.length === 0) {
    return null;
  }

  return (
    <div
      className={[
        "p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50",
        "border border-gray-200 dark:border-gray-700",
        className,
      ].join(" ")}
      role="list"
      aria-label="Các thao tác đang chờ"
    >
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Thao tác đang chờ ({pendingOperations.length})
      </h4>
      <ul className="space-y-2">
        {pendingOperations.map((op: SyncOperation) => (
          <li
            key={op.id}
            className="flex items-center gap-2 text-sm"
            role="listitem"
          >
            <OperationIcon
              type={op.type}
              status={status === "syncing" && op.id === pendingOperations[0]?.id ? "in_progress" : "pending"}
            />
            <span className="text-gray-600 dark:text-gray-400">
              {op.type === "upload" ? "Tải lên" : "Tải xuống"} slot {op.slotId}
            </span>
            {op.retryCount > 0 && (
              <span className="text-xs text-orange-500">
                (thử lại {op.retryCount})
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
});
