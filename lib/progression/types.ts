/**
 * Player Progression System - Type Definitions
 *
 * Feature 13: Player Progression
 *
 * Architecture follows Clean Architecture:
 * - Domain: Core progression entities (XP, Level, Achievement, Stats)
 * - Application: Level calculations, XP formulas, achievement logic
 * - Infrastructure: Save/load persistence
 * - Presentation: React hooks
 *
 * Integrates with:
 * - Flashcard System (card mastery, quiz scores)
 * - Dialogue System (NPC interactions, completion tracking)
 * - Game State (score, coins, combos)
 */

import type { Locale } from "../dialogue/types";

// ─────────────────────────────────────────────────────────────────────────────
// XP & LEVEL SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

/** XP reward sources */
export type XPRewardSource =
  | "quiz_correct"
  | "quiz_perfect"
  | "combo_multiplier"
  | "npc_interaction"
  | "achievement_unlocked"
  | "daily_streak"
  | "mastery_level_up";

/** XP reward configuration */
export interface XPReward {
  source: XPRewardSource;
  amount: number;
  multiplier: number;
  timestamp: number;
}

/** Level thresholds configuration */
export interface LevelConfig {
  level: number;
  minXP: number;
  maxXP: number;
  title: string;
  unlock?: string[];
}

/** Player level information */
export interface PlayerLevel {
  currentLevel: number;
  currentXP: number;
  xpToNextLevel: number;
  progress: number; // 0-100 percentage
  title: string;
}

/** XP multiplier categories */
export type XPMultiplierType =
  | "combo"
  | "difficulty"
  | "streak"
  | "time_bonus"
  | "achievement_bonus";

/** Active XP multiplier */
export interface XPMultiplier {
  type: XPMultiplierType;
  value: number;
  expiresAt?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENT SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

/** Achievement categories */
export type AchievementCategory =
  | "vocabulary"
  | "exploration"
  | "mastery"
  | "speed"
  | "streak"
  | "collection";

/** Achievement difficulty tiers */
export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

/** Achievement definition */
export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  icon: string;
  requirement: AchievementRequirement;
  rewards: AchievementRewards;
  secret?: boolean;
}

/** Achievement requirement types */
export type AchievementRequirement =
  | { type: "quiz_count"; count: number }
  | { type: "perfect_quiz_count"; count: number }
  | { type: "cards_mastered"; count: number }
  | { type: "npc_interactions"; count: number }
  | { type: "streak_days"; count: number }
  | { type: "level_reached"; level: number }
  | { type: "total_xp"; amount: number }
  | { type: "combo_reached"; multiplier: number }
  | { type: "accuracy_achieved"; percentage: number }
  | { type: "time_played"; minutes: number };

/** Achievement rewards */
export interface AchievementRewards {
  xp?: number;
  coins?: number;
  badge?: string;
  title?: string;
}

/** Unlocked achievement instance */
export interface UnlockedAchievement {
  achievementId: string;
  unlockedAt: number;
  progress: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATISTICS TRACKING
// ─────────────────────────────────────────────────────────────────────────────

/** Gameplay statistics categories */
export interface GameplayStats {
  // Quiz stats
  totalQuizzesTaken: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  totalWrongAnswers: number;
  averageAccuracy: number;
  perfectQuizzes: number;
  longestPerfectStreak: number;

  // Time stats
  totalTimeSpentMs: number;
  averageQuizTimeMs: number;
  fastestQuizMs: number;

  // Mastery stats
  cardsLearned: number;
  cardsMastered: number;
  cardsReviewed: number;
  averageMasteryLevel: number;

  // Streak stats
  currentStreak: number;
  longestStreak: number;
  lastPlayedAt: number;

  // Combo stats
  highestCombo: number;
  totalCombosEarned: number;

  // Collection stats
  totalCoins: number;
  totalXP: number;
  highestLevel: number;

  // NPC stats
  npcInteractions: number;
  dialoguesCompleted: number;
}

/** Daily statistics (resets daily) */
export interface DailyStats {
  date: string; // ISO date string
  quizzesTaken: number;
  questionsAnswered: number;
  correctAnswers: number;
  xpEarned: number;
  timeSpentMs: number;
  achievementsUnlocked: string[];
}

/** Weekly statistics */
export interface WeeklyStats {
  weekStart: string;
  dailyStats: DailyStats[];
  totalQuizzesTaken: number;
  totalXPEarned: number;
  mostProductiveDay: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTERY SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

/** Mastery levels for cards */
export type CardMasteryLevel = "new" | "learning" | "reviewing" | "mastered";

/** Mastery thresholds */
export interface MasteryThresholds {
  learning: number;      // 1-2 correct
  reviewing: number;     // 3-4 correct
  mastered: number;      // 5+ correct with high accuracy
}

/** Card mastery state */
export interface CardMastery {
  cardId: string;
  timesReviewed: number;
  timesCorrect: number;
  accuracy: number;
  currentLevel: CardMasteryLevel;
  streak: number;
  lastReviewed: number;
  nextReviewDate: number;
}

/** NPC mastery state */
export interface NPCMastery {
  npcId: string;
  interactions: number;
  quizzesCompleted: number;
  perfectQuizzes: number;
  totalCorrect: number;
  totalWrong: number;
  masteryLevel: number; // 1-5 stars
  lastInteracted: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSION STATE
// ─────────────────────────────────────────────────────────────────────────────

/** Complete player progression state */
export interface ProgressionState {
  // Core progression
  level: PlayerLevel;
  totalXP: number;
  lifetimeXP: number;

  // Stats
  gameplay: GameplayStats;
  daily: DailyStats;

  // Mastery
  cardMastery: Record<string, CardMastery>;
  npcMastery: Record<string, NPCMastery>;

  // Achievements
  achievements: Record<string, UnlockedAchievement>;

  // Multipliers
  activeMultipliers: XPMultiplier[];

  // Meta
  createdAt: number;
  updatedAt: number;
  lastSyncedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVE / LOAD
// ─────────────────────────────────────────────────────────────────────────────

/** Save data format */
export interface ProgressionSaveData {
  version: number;
  state: ProgressionState;
  checksum?: string;
}

/** Save slot metadata */
export interface SaveSlot {
  slotId: number;
  playerName: string;
  level: number;
  totalXP: number;
  achievementsCount: number;
  lastPlayedAt: number;
  playTimeMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

/** Progression event types */
export type ProgressionEventType =
  | "XP_GAINED"
  | "LEVEL_UP"
  | "ACHIEVEMENT_UNLOCKED"
  | "ACHIEVEMENT_PROGRESS"
  | "MASTERY_LEVEL_UP"
  | "STREAK_BROKEN"
  | "STREAK_CONTINUED"
  | "MILESTONE_REACHED";

/** Progression event */
export interface ProgressionEvent {
  type: ProgressionEventType;
  timestamp: number;
  payload?: unknown;
}

/** Event listener type */
export type ProgressionEventListener = (event: ProgressionEvent) => void;

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Create initial progression state */
export function createInitialProgressionState(locale: Locale = "en"): ProgressionState {
  const now = Date.now();

  return {
    level: {
      currentLevel: 1,
      currentXP: 0,
      xpToNextLevel: calculateXPForLevel(1),
      progress: 0,
      title: getLevelTitle(1, locale),
    },
    totalXP: 0,
    lifetimeXP: 0,
    gameplay: {
      totalQuizzesTaken: 0,
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      totalWrongAnswers: 0,
      averageAccuracy: 0,
      perfectQuizzes: 0,
      longestPerfectStreak: 0,
      totalTimeSpentMs: 0,
      averageQuizTimeMs: 0,
      fastestQuizMs: 0,
      cardsLearned: 0,
      cardsMastered: 0,
      cardsReviewed: 0,
      averageMasteryLevel: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastPlayedAt: now,
      highestCombo: 0,
      totalCombosEarned: 0,
      totalCoins: 0,
      totalXP: 0,
      highestLevel: 1,
      npcInteractions: 0,
      dialoguesCompleted: 0,
    },
    daily: {
      date: new Date().toISOString().split("T")[0],
      quizzesTaken: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      xpEarned: 0,
      timeSpentMs: 0,
      achievementsUnlocked: [],
    },
    cardMastery: {},
    npcMastery: {},
    achievements: {},
    activeMultipliers: [],
    createdAt: now,
    updatedAt: now,
    lastSyncedAt: now,
  };
}

/** Calculate XP required for a level (exponential formula) */
export function calculateXPForLevel(level: number): number {
  // XP formula: 100 * level^1.5
  return Math.floor(100 * Math.pow(level, 1.5));
}

/** Get level title based on locale */
export function getLevelTitle(level: number, locale: Locale = "en"): string {
  const titles: Record<Locale, Record<number, string>> = {
    en: {
      1: "Beginner",
      5: "Learner",
      10: "Student",
      15: "Scholar",
      20: "Expert",
      25: "Master",
      30: "Grandmaster",
      40: "Legend",
    },
    vi: {
      1: "Người mới",
      5: "Người học",
      10: "Học sinh",
      15: "Học giả",
      20: "Chuyên gia",
      25: "Bậc thầy",
      30: "Đại sư",
      40: "Huyền thoại",
    },
    ja: {
      1: "初心者",
      5: "学習者",
      10: "学生",
      15: "学者",
      20: "専門家",
      25: "マスター",
      30: "大师",
      40: "伝説",
    },
    zh: {
      1: "初学者",
      5: "学习者",
      10: "学生",
      15: "学者",
      20: "专家",
      25: "大师",
      30: "宗师",
      40: "传奇",
    },
  };

  const localeTitles = titles[locale] || titles.en;

  // Find the highest title below or equal to current level
  let title = localeTitles[1] || "Beginner";
  for (const [lvl, titleValue] of Object.entries(localeTitles)) {
    if (parseInt(lvl) <= level) {
      title = titleValue;
    }
  }

  return title;
}

/** Default mastery thresholds */
export const DEFAULT_MASTERY_THRESHOLDS: MasteryThresholds = {
  learning: 2,
  reviewing: 4,
  mastered: 6,
};
