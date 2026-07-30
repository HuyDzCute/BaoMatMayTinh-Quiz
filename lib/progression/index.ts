/**
 * Progression System - Public API
 *
 * Feature 13: Player Progression
 *
 * Clean Architecture Layers:
 *
 * Domain Layer:
 *   - types.ts: Core entities (PlayerLevel, Achievement, Stats)
 *
 * Application Layer:
 *   - achievements.ts: Achievement definitions & XP calculations
 *   - progression-service.ts: Business logic (ProgressionService)
 *
 * Infrastructure Layer:
 *   - (integrated into hooks.ts for persistence)
 *
 * Presentation Layer:
 *   - hooks.ts: React state management
 *   - components.tsx: UI components
 *
 * Integration Points:
 *   - Flashcard System: Card mastery tracking
 *   - Dialogue System: NPC interaction tracking
 *   - Game State: XP & level synchronization
 *
 * Usage:
 *
 * ```tsx
 * import { useProgression, LevelDisplay, XPProgressBar, AchievementCard } from "@/lib/progression";
 *
 * function Game() {
 *   const { level, stats, recordQuiz, achievements } = useProgression();
 *
 *   // After quiz completion
 *   const result = recordQuiz({
 *     correctAnswers: 8,
 *     totalQuestions: 10,
 *     timeSpentMs: 45000,
 *     combo: 5,
 *     difficulty: "medium",
 *   });
 *
 *   return (
 *     <div>
 *       <LevelDisplay level={level} />
 *       <XPProgressBar {...level} />
 *       <StatsGrid stats={stats} />
 *     </div>
 *   );
 * }
 * ```
 */

// ─── Domain Layer ────────────────────────────────────────────────────────────────

export type {
  XPRewardSource,
  XPReward,
  LevelConfig,
  PlayerLevel,
  XPMultiplierType,
  XPMultiplier,
  AchievementCategory,
  AchievementTier,
  AchievementDefinition,
  AchievementRequirement,
  AchievementRewards,
  UnlockedAchievement,
  GameplayStats,
  DailyStats,
  WeeklyStats,
  CardMasteryLevel,
  MasteryThresholds,
  CardMastery,
  NPCMastery,
  ProgressionState,
  ProgressionSaveData,
  SaveSlot,
  ProgressionEventType,
  ProgressionEvent,
  ProgressionEventListener,
} from "./types";

export {
  createInitialProgressionState,
  calculateXPForLevel,
  getLevelTitle,
  DEFAULT_MASTERY_THRESHOLDS,
} from "./types";

// ─── Application Layer ───────────────────────────────────────────────────────────

export {
  ACHIEVEMENTS,
  getAchievementById,
  getTotalAchievementsCount,
  getSecretAchievements,
  BASE_XP_REWARDS,
  TIER_MULTIPLIERS,
  DIFFICULTY_MULTIPLIERS,
  calculateComboBonus,
  calculatePerfectBonus,
  calculateQuizXP,
} from "./achievements";

export { ProgressionService, getProgressionService, createProgressionService } from "./progression-service";

// ─── Presentation Layer ────────────────────────────────────────────────────────

export { useProgression, useMasterySummary, useAchievementSummary, useLevelCalculator } from "./hooks";

export type {
  UseProgressionOptions,
  UseProgressionReturn,
  MasterySummary,
  AchievementSummary,
} from "./hooks";

export {
  LevelDisplay,
  XPProgressBar,
  StatsGrid,
  AchievementCard,
  AchievementNotification,
  MasteryGrid,
  StreakDisplay,
} from "./components";

export type {
  LevelDisplayProps,
  XPProgressBarProps,
  StatsGridProps,
  AchievementCardProps,
  AchievementNotificationProps,
  MasteryGridProps,
  StreakDisplayProps,
} from "./components";

// ─── Achievement UI ─────────────────────────────────────────────────────────────

export {
  AchievementPanel,
  AchievementBadge,
  ProgressOverlay,
  AchievementToastManager,
} from "./achievement-ui";

export type {
  AchievementPanelProps,
  AchievementBadgeProps,
  ProgressOverlayProps,
  AchievementToastManagerProps,
} from "./achievement-ui";
