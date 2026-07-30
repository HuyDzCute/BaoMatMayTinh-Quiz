"use client";

/**
 * Save Status Indicator
 *
 * Phase 4: UI Components
 * Shows current save/sync status with icons and accessibility
 */

import { memo } from "react";
import {
  Cloud,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { useCloudSync } from "@/lib/save";
import type { SyncStatus } from "@/lib/save";

/**
 * Status display configuration
 */
const STATUS_CONFIG: Record<
  SyncStatus,
  {
    icon: typeof Cloud;
    label: string;
    ariaLabel: string;
    color: string;
    animate?: boolean;
  }
> = {
  idle: {
    icon: Cloud,
    label: "Đã đồng bộ",
    ariaLabel: "Trạng thái: Đã đồng bộ với đám mây",
    color: "text-green-600",
  },
  syncing: {
    icon: Loader2,
    label: "Đang đồng bộ...",
    ariaLabel: "Đang đồng bộ với đám mây",
    color: "text-blue-600",
    animate: true,
  },
  synced: {
    icon: CheckCircle2,
    label: "Đã đồng bộ",
    ariaLabel: "Đã đồng bộ thành công với đám mây",
    color: "text-green-600",
  },
  offline: {
    icon: WifiOff,
    label: "Offline",
    ariaLabel: "Đang offline - dữ liệu sẽ đồng bộ khi có kết nối",
    color: "text-gray-500",
  },
  error: {
    icon: AlertCircle,
    label: "Lỗi đồng bộ",
    ariaLabel: "Lỗi đồng bộ - nhấn để thử lại",
    color: "text-red-600",
  },
  conflict: {
    icon: RefreshCw,
    label: "Xung đột dữ liệu",
    ariaLabel: "Phát hiện xung đột dữ liệu - cần xử lý",
    color: "text-yellow-600",
  },
};

/**
 * Props for SaveStatusIndicator
 */
export interface SaveStatusIndicatorProps {
  /** Show label text */
  showLabel?: boolean;
  /** Show detailed tooltip */
  showTooltip?: boolean;
  /** Size of the icon */
  size?: "sm" | "md" | "lg";
  /** Custom className */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Save status indicator component
 */
export const SaveStatusIndicator = memo(function SaveStatusIndicator({
  showLabel = true,
  showTooltip = false,
  size = "md",
  className = "",
  onClick,
}: SaveStatusIndicatorProps) {
  const { status, isOnline, error, hasConflict } = useCloudSync();

  // Determine actual status considering online state
  const actualStatus: SyncStatus = !isOnline
    ? "offline"
    : hasConflict
      ? "conflict"
      : status;

  const config = STATUS_CONFIG[actualStatus];
  const Icon = config.icon;

  // Size classes
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const containerClasses = [
    "inline-flex items-center gap-1.5",
    "transition-colors duration-200",
    config.color,
    onClick ? "cursor-pointer hover:opacity-80" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const tooltipContent = showTooltip
    ? error
      ? `Lỗi: ${error.message}`
      : config.ariaLabel
    : undefined;

  return (
    <button
      type="button"
      className={containerClasses}
      onClick={onClick}
      disabled={!onClick}
      aria-label={config.ariaLabel}
      title={tooltipContent}
    >
      <Icon
        className={[
          sizeClasses[size],
          config.animate ? "animate-spin" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      />
      {showLabel && (
        <span className={textSizeClasses[size]}>{config.label}</span>
      )}
    </button>
  );
});

/**
 * Compact status badge variant
 */
export const SaveStatusBadge = memo(function SaveStatusBadge({
  className = "",
}: {
  className?: string;
}) {
  const { status, isOnline, hasConflict } = useCloudSync();

  const actualStatus: SyncStatus = !isOnline
    ? "offline"
    : hasConflict
      ? "conflict"
      : status;

  const config = STATUS_CONFIG[actualStatus];
  const Icon = config.icon;

  const badgeClasses = [
    "inline-flex items-center justify-center",
    "rounded-full",
    "bg-gray-100 dark:bg-gray-800",
    "p-1",
    config.color,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={badgeClasses} aria-label={config.ariaLabel}>
      <Icon className="w-3 h-3" aria-hidden="true" />
    </span>
  );
});
