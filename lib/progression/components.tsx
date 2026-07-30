/**
 * Progression System - UI Components
 *
 * Feature 13: Player Progression
 *
 * Presentation Layer: UI components for displaying progression
 */

"use client";

import { memo, useMemo } from "react";
import type { PlayerLevel, GameplayStats, AchievementDefinition, AchievementTier } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL DISPLAY
// ─────────────────────────────────────────────────────────────────────────────

export interface LevelDisplayProps {
  level: PlayerLevel;
  showTitle?: boolean;
  size?: "small" | "medium" | "large";
}

export const LevelDisplay = memo(function LevelDisplay({
  level,
  showTitle = true,
  size = "medium",
}: LevelDisplayProps) {
  const sizeStyles = {
    small: { fontSize: 14, padding: "6px 12px" },
    medium: { fontSize: 18, padding: "8px 16px" },
    large: { fontSize: 24, padding: "12px 24px" },
  };

  const style = sizeStyles[size];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        alignItems: "center",
      }}
    >
      {/* Level badge */}
      <div
        style={{
          ...style,
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          borderRadius: 12,
          fontWeight: 700,
          color: "#ffffff",
          fontFamily: "var(--font-orbitron, monospace)",
          boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
          minWidth: 60,
          textAlign: "center",
        }}
      >
        Lv.{level.currentLevel}
      </div>

      {/* Title */}
      {showTitle && level.title && (
        <div
          style={{
            fontSize: 12,
            color: "#a78bfa",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          {level.title}
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// XP PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────

export interface XPProgressBarProps {
  currentXP: number;
  xpToNextLevel: number;
  progress: number;
  level: number;
  showLabel?: boolean;
}

export const XPProgressBar = memo(function XPProgressBar({
  currentXP,
  xpToNextLevel,
  progress,
  level,
  showLabel = true,
}: XPProgressBarProps) {
  return (
    <div style={{ width: "100%", maxWidth: 300 }}>
      {showLabel && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
            fontSize: 12,
            color: "#94a3b8",
          }}
        >
          <span>Level {level}</span>
          <span>{currentXP} / {xpToNextLevel} XP</span>
        </div>
      )}
      <div
        style={{
          height: 8,
          background: "rgba(30, 41, 59, 0.8)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #6366f1, #a78bfa)",
            borderRadius: 4,
            transition: "width 0.3s ease",
            boxShadow: "0 0 8px rgba(99, 102, 241, 0.5)",
          }}
        />
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// STATS GRID
// ─────────────────────────────────────────────────────────────────────────────

export interface StatsGridProps {
  stats: GameplayStats;
  columns?: 2 | 3 | 4;
}

export const StatsGrid = memo(function StatsGrid({
  stats,
  columns = 2,
}: StatsGridProps) {
  const statItems = useMemo(
    () => [
      { label: "Quizzes", value: stats.totalQuizzesTaken.toLocaleString() },
      { label: "Correct", value: stats.totalCorrectAnswers.toLocaleString() },
      { label: "Accuracy", value: `${stats.averageAccuracy}%` },
      { label: "Streak", value: `${stats.currentStreak} days` },
      { label: "Cards Mastered", value: stats.cardsMastered.toLocaleString() },
      { label: "Highest Combo", value: `${stats.highestCombo}x` },
      { label: "Time Played", value: formatTime(stats.totalTimeSpentMs) },
      { label: "Highest Level", value: stats.highestLevel.toString() },
    ],
    [stats]
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 12,
      }}
    >
      {statItems.map((item, index) => (
        <div
          key={index}
          style={{
            background: "rgba(15, 23, 42, 0.6)",
            borderRadius: 10,
            padding: "12px 16px",
            border: "1px solid rgba(148, 163, 184, 0.15)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "#64748b",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 4,
            }}
          >
            {item.label}
          </div>
          <div
            style={{
              color: "#f1f5f9",
              fontSize: 18,
              fontWeight: 700,
              fontFamily: "var(--font-orbitron, monospace)",
            }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENT CARD
// ─────────────────────────────────────────────────────────────────────────────

export interface AchievementCardProps {
  achievement: AchievementDefinition;
  progress: number;
  isUnlocked: boolean;
  onClick?: () => void;
}

export const AchievementCard = memo(function AchievementCard({
  achievement,
  progress,
  isUnlocked,
  onClick,
}: AchievementCardProps) {
  const tierColors: Record<AchievementTier, { bg: string; border: string; glow: string }> = {
    bronze: { bg: "rgba(205, 127, 50, 0.15)", border: "rgba(205, 127, 50, 0.4)", glow: "rgba(205, 127, 50, 0.2)" },
    silver: { bg: "rgba(192, 192, 192, 0.15)", border: "rgba(192, 192, 192, 0.4)", glow: "rgba(192, 192, 192, 0.2)" },
    gold: { bg: "rgba(255, 215, 0, 0.15)", border: "rgba(255, 215, 0, 0.4)", glow: "rgba(255, 215, 0, 0.2)" },
    platinum: { bg: "rgba(229, 228, 226, 0.15)", border: "rgba(229, 228, 226, 0.4)", glow: "rgba(229, 228, 226, 0.2)" },
  };

  const colors = tierColors[achievement.tier];

  return (
    <div
      onClick={onClick}
      style={{
        background: colors.bg,
        border: `1px solid ${isUnlocked ? colors.border : "rgba(148, 163, 184, 0.2)"}`,
        borderRadius: 12,
        padding: 16,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease",
        opacity: isUnlocked ? 1 : 0.7,
        boxShadow: isUnlocked ? `0 4px 20px ${colors.glow}` : "none",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: isUnlocked ? colors.border : "rgba(71, 85, 105, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
          }}
        >
          {isUnlocked ? achievement.icon : "🔒"}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: 700,
              color: "#f1f5f9",
              fontSize: 14,
              marginBottom: 2,
            }}
          >
            {achievement.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {achievement.tier}
          </div>
        </div>
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 13,
          color: "#94a3b8",
          marginBottom: 12,
          lineHeight: 1.4,
        }}
      >
        {achievement.secret && !isUnlocked
          ? "??? Secret Achievement"
          : achievement.description}
      </div>

      {/* Progress bar */}
      {!isUnlocked && (
        <>
          <div
            style={{
              height: 4,
              background: "rgba(30, 41, 59, 0.8)",
              borderRadius: 2,
              overflow: "hidden",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: colors.border,
                borderRadius: 2,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              textAlign: "right",
            }}
          >
            {progress}% complete
          </div>
        </>
      )}

      {/* Rewards */}
      {isUnlocked && achievement.rewards && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {achievement.rewards.xp && (
            <span
              style={{
                fontSize: 11,
                color: "#a78bfa",
                fontWeight: 600,
              }}
            >
              ⚡ {achievement.rewards.xp} XP
            </span>
          )}
          {achievement.rewards.coins && (
            <span
              style={{
                fontSize: 11,
                color: "#fbbf24",
                fontWeight: 600,
              }}
            >
              🪙 {achievement.rewards.coins}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENT NOTIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export interface AchievementNotificationProps {
  achievement: AchievementDefinition;
  onDismiss: () => void;
}

export const AchievementNotification = memo(function AchievementNotification({
  achievement,
  onDismiss,
}: AchievementNotificationProps) {
  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        border: "1px solid rgba(255, 215, 0, 0.5)",
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 215, 0, 0.2)",
        zIndex: 1000,
        animation: "slideIn 0.3s ease",
        maxWidth: 320,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            boxShadow: "0 4px 16px rgba(251, 191, 36, 0.3)",
          }}
        >
          {achievement.icon}
        </div>
        <div>
          <div
            style={{
              fontSize: 10,
              color: "#fbbf24",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              fontWeight: 700,
              marginBottom: 2,
            }}
          >
            Achievement Unlocked!
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#f1f5f9",
            }}
          >
            {achievement.name}
          </div>
        </div>
      </div>

      <div
        style={{
          fontSize: 13,
          color: "#94a3b8",
          marginBottom: 16,
          lineHeight: 1.5,
        }}
      >
        {achievement.description}
      </div>

      {/* Rewards */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {achievement.rewards.xp && (
          <div
            style={{
              background: "rgba(167, 139, 250, 0.15)",
              borderRadius: 8,
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>⚡</span>
            <span
              style={{
                color: "#a78bfa",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              +{achievement.rewards.xp} XP
            </span>
          </div>
        )}
        {achievement.rewards.coins && (
          <div
            style={{
              background: "rgba(251, 191, 36, 0.15)",
              borderRadius: 8,
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>🪙</span>
            <span
              style={{
                color: "#fbbf24",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              +{achievement.rewards.coins}
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        style={{
          width: "100%",
          padding: "10px 16px",
          borderRadius: 10,
          background: "rgba(255, 215, 0, 0.2)",
          border: "1px solid rgba(255, 215, 0, 0.4)",
          color: "#fbbf24",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        Awesome!
      </button>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// MASTERY GRID
// ─────────────────────────────────────────────────────────────────────────────

export interface MasteryGridProps {
  mastered: number;
  reviewing: number;
  learning: number;
  newCards: number;
}

export const MasteryGrid = memo(function MasteryGrid({
  mastered,
  reviewing,
  learning,
  newCards,
}: MasteryGridProps) {
  const masteryData = [
    { label: "Mastered", count: mastered, color: "#22c55e", icon: "🌟" },
    { label: "Reviewing", count: reviewing, color: "#3b82f6", icon: "📚" },
    { label: "Learning", count: learning, color: "#f59e0b", icon: "📖" },
    { label: "New", count: newCards, color: "#64748b", icon: "✨" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 8,
      }}
    >
      {masteryData.map((item) => (
        <div
          key={item.label}
          style={{
            background: "rgba(15, 23, 42, 0.6)",
            borderRadius: 10,
            padding: "12px 8px",
            textAlign: "center",
            border: "1px solid rgba(148, 163, 184, 0.1)",
          }}
        >
          <div
            style={{
              fontSize: 20,
              marginBottom: 4,
            }}
          >
            {item.icon}
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: item.color,
              fontFamily: "var(--font-orbitron, monospace)",
            }}
          >
            {item.count}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// STREAK DISPLAY
// ─────────────────────────────────────────────────────────────────────────────

export interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
}

export const StreakDisplay = memo(function StreakDisplay({
  currentStreak,
  longestStreak,
}: StreakDisplayProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "center",
      }}
    >
      {/* Current streak */}
      <div
        style={{
          background: currentStreak > 0
            ? "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)"
            : "rgba(71, 85, 105, 0.3)",
          borderRadius: 12,
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: currentStreak > 0
            ? "0 4px 16px rgba(245, 158, 11, 0.3)"
            : "none",
        }}
      >
        <span style={{ fontSize: 24 }}>🔥</span>
        <div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#ffffff",
              fontFamily: "var(--font-orbitron, monospace)",
            }}
          >
            {currentStreak}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "rgba(255, 255, 255, 0.7)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Day Streak
          </div>
        </div>
      </div>

      {/* Longest streak */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.6)",
          borderRadius: 12,
          padding: "12px 16px",
          border: "1px solid rgba(148, 163, 184, 0.15)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 2,
          }}
        >
          Best
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#94a3b8",
            fontFamily: "var(--font-orbitron, monospace)",
          }}
        >
          {longestStreak} days
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}
