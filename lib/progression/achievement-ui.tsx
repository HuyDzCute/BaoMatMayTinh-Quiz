/**
 * Achievement System - UI Components
 *
 * Feature 14: Achievement System
 *
 * Integrates with existing progression system (Feature 13)
 * Provides complete achievement UI: panel, gallery, notifications
 */

"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ACHIEVEMENTS,
  getAchievementById,
  getAchievementsByCategory,
} from "./achievements";
import {
  LevelDisplay,
  XPProgressBar,
  StreakDisplay,
  MasteryGrid,
  AchievementCard,
  AchievementNotification,
} from "./components";
import {
  useProgression,
  useMasterySummary,
  useAchievementSummary,
} from "./hooks";
import type { AchievementDefinition, AchievementCategory } from "./types";
import type { Locale } from "../dialogue/types";

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENT PANEL
// ─────────────────────────────────────────────────────────────────────────────

export interface AchievementPanelProps {
  isOpen: boolean;
  onClose: () => void;
  locale?: Locale;
  totalCards?: number;
}

export const AchievementPanel = memo(function AchievementPanel({
  isOpen,
  onClose,
  locale = "en",
  totalCards = 100,
}: AchievementPanelProps) {
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | "all">("all");
  const [showOnlyLocked, setShowOnlyLocked] = useState(false);

  const progression = useProgression({ autoLoad: true, autoSave: true, locale });

  const achievementSummary = useAchievementSummary(progression.achievements);
  const masterySummary = useMasterySummary(totalCards, progression.mastery);

  // Filter achievements by category
  const filteredAchievements = useMemo(() => {
    let filtered = activeCategory === "all"
      ? ACHIEVEMENTS
      : getAchievementsByCategory(activeCategory);

    if (showOnlyLocked) {
      filtered = filtered.filter((a) => !progression.achievements[a.id]?.unlockedAt);
    }

    // Sort: unlocked first, then by tier
    return filtered.sort((a, b) => {
      const aUnlocked = progression.achievements[a.id]?.unlockedAt > 0;
      const bUnlocked = progression.achievements[b.id]?.unlockedAt > 0;

      if (aUnlocked && !bUnlocked) return -1;
      if (!aUnlocked && bUnlocked) return 1;

      // Same unlock status, sort by tier
      const tierOrder = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
      return tierOrder[a.tier] - tierOrder[b.tier];
    });
  }, [activeCategory, showOnlyLocked, progression.achievements]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories: { id: AchievementCategory | "all"; label: string }[] = [
    { id: "all", label: "All" },
    { id: "vocabulary", label: "Vocabulary" },
    { id: "mastery", label: "Mastery" },
    { id: "streak", label: "Streak" },
    { id: "exploration", label: "Exploration" },
    { id: "speed", label: "Speed" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2, 6, 23, 0.95)",
        backdropFilter: "blur(16px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          maxHeight: "90vh",
          background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: 20,
          border: "1px solid rgba(59, 130, 246, 0.3)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 28px",
            borderBottom: "1px solid rgba(148, 163, 184, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#f1f5f9",
                margin: "0 0 8px 0",
                fontFamily: "var(--font-orbitron, monospace)",
              }}
            >
              Achievements
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "#94a3b8",
                margin: 0,
              }}
            >
              {achievementSummary.unlocked} / {achievementSummary.total} unlocked
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(51, 65, 85, 0.5)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              color: "#94a3b8",
              fontSize: 20,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Progress Header */}
        <div
          style={{
            padding: "20px 28px",
            background: "rgba(15, 23, 42, 0.5)",
            borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
            display: "flex",
            gap: 24,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <LevelDisplay level={progression.level} size="medium" />
          <XPProgressBar
            currentXP={progression.level.currentXP}
            xpToNextLevel={progression.level.xpToNextLevel}
            progress={progression.level.progress}
            level={progression.level.currentLevel}
            showLabel={false}
          />
          <StreakDisplay
            currentStreak={progression.stats.currentStreak}
            longestStreak={progression.stats.longestStreak}
          />
          <MasteryGrid
            mastered={masterySummary.mastered}
            reviewing={masterySummary.reviewing}
            learning={masterySummary.learning}
            newCards={masterySummary.new}
          />
        </div>

        {/* Category Tabs */}
        <div
          style={{
            padding: "16px 28px 0",
            display: "flex",
            gap: 8,
            borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
            overflowX: "auto",
          }}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            const count = cat.id === "all"
              ? achievementSummary.total
              : achievementSummary.byCategory[cat.id]?.total ?? 0;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px 8px 0 0",
                  background: isActive
                    ? "rgba(59, 130, 246, 0.15)"
                    : "transparent",
                  border: "none",
                  borderBottom: isActive
                    ? "2px solid #3b82f6"
                    : "2px solid transparent",
                  color: isActive ? "#60a5fa" : "#64748b",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                }}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Achievement Grid */}
        <div
          style={{
            padding: 24,
            overflowY: "auto",
            flex: 1,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {filteredAchievements.map((achievement) => {
              const isUnlocked = progression.achievements[achievement.id]?.unlockedAt > 0;
              const progress = progression.getAchievementProgress(achievement.id);

              return (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  progress={progress}
                  isUnlocked={isUnlocked}
                />
              );
            })}
          </div>
        </div>

        {/* Stats Footer */}
        <div
          style={{
            padding: "16px 28px",
            borderTop: "1px solid rgba(148, 163, 184, 0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                color: "#94a3b8",
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={showOnlyLocked}
                onChange={(e) => setShowOnlyLocked(e.target.checked)}
                style={{ accentColor: "#3b82f6" }}
              />
              Show locked only
            </label>
          </div>
          <div
            style={{
              color: "#64748b",
              fontSize: 12,
            }}
          >
            {achievementSummary.progress}% Complete
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENT BADGE (Compact)
// ─────────────────────────────────────────────────────────────────────────────

export interface AchievementBadgeProps {
  unlockedCount: number;
  totalCount: number;
  onClick?: () => void;
}

export const AchievementBadge = memo(function AchievementBadge({
  unlockedCount,
  totalCount,
  onClick,
}: AchievementBadgeProps) {
  const progress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 20,
        background: "rgba(251, 191, 36, 0.15)",
        border: "1px solid rgba(251, 191, 36, 0.3)",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.background = "rgba(251, 191, 36, 0.25)";
          e.currentTarget.style.transform = "scale(1.05)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(251, 191, 36, 0.15)";
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <span style={{ fontSize: 16 }}>🏆</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#fbbf24",
          fontFamily: "var(--font-orbitron, monospace)",
        }}
      >
        {unlockedCount}/{totalCount}
      </span>
      <div
        style={{
          width: 40,
          height: 4,
          background: "rgba(30, 41, 59, 0.8)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "#fbbf24",
            borderRadius: 2,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </button>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS OVERLAY (Mini HUD)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProgressOverlayProps {
  level: ReturnType<typeof useProgression>["level"];
  stats: ReturnType<typeof useProgression>["stats"];
  onOpenAchievements?: () => void;
}

export const ProgressOverlay = memo(function ProgressOverlay({
  level,
  stats,
  onOpenAchievements,
}: ProgressOverlayProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      <LevelDisplay level={level} showTitle={false} size="small" />
      <XPProgressBar
        currentXP={level.currentXP}
        xpToNextLevel={level.xpToNextLevel}
        progress={level.progress}
        level={level.currentLevel}
        showLabel={false}
      />
      {stats.currentStreak > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            borderRadius: 12,
            background: "rgba(245, 158, 11, 0.15)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
          }}
        >
          <span>🔥</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#f59e0b",
            }}
          >
            {stats.currentStreak}
          </span>
        </div>
      )}
      {onOpenAchievements && (
        <AchievementBadgeWrapper onClick={onOpenAchievements} stats={stats} />
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Achievement Badge Wrapper with Hook Integration
// ─────────────────────────────────────────────────────────────────────────────

const AchievementBadgeWrapper = memo(function AchievementBadgeWrapper({
  onClick,
  stats,
}: {
  onClick?: () => void;
  stats: ReturnType<typeof useProgression>["stats"];
}) {
  // This component uses hooks, so it needs to be separate
  return <AchievementBadgeInternal onClick={onClick} stats={stats} />;
});

function AchievementBadgeInternal({
  onClick,
  stats,
}: {
  onClick?: () => void;
  stats: ReturnType<typeof useProgression>["stats"];
}) {
  // Could integrate with useAchievementSummary here
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENT TOAST MANAGER
// ─────────────────────────────────────────────────────────────────────────────

export interface AchievementToastManagerProps {
  achievements: Record<string, { unlockedAt: number }>;
  onDismiss: () => void;
}

export const AchievementToastManager = memo(function AchievementToastManager({
  achievements,
  onDismiss,
}: AchievementToastManagerProps) {
  const [visibleAchievements, setVisibleAchievements] = useState<
    AchievementDefinition[]
  >([]);

  // Check for new achievements
  useEffect(() => {
    const newAchievements = Object.entries(achievements)
      .filter(([_, data]) => {
        // Show achievements unlocked in the last 5 seconds
        return data.unlockedAt > Date.now() - 5000;
      })
      .map(([id]) => getAchievementById(id))
      .filter(Boolean) as AchievementDefinition[];

    if (newAchievements.length > 0) {
      setVisibleAchievements((prev) => [...prev, ...newAchievements]);
    }
  }, [achievements]);

  const handleDismiss = useCallback((achievement: AchievementDefinition) => {
    setVisibleAchievements((prev) =>
      prev.filter((a) => a.id !== achievement.id)
    );
    onDismiss();
  }, [onDismiss]);

  if (visibleAchievements.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        zIndex: 1000,
      }}
    >
      {visibleAchievements.map((achievement) => (
        <AchievementNotification
          key={achievement.id}
          achievement={achievement}
          onDismiss={() => handleDismiss(achievement)}
        />
      ))}
    </div>
  );
});
