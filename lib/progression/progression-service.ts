/**
 * Progression Service - Core Business Logic
 *
 * Feature 13: Player Progression
 *
 * Application Layer: Handles XP, levels, achievements, mastery
 * Follows Single Responsibility Principle - progression logic only
 */

import type {
  ProgressionState,
  ProgressionEvent,
  ProgressionEventListener,
  PlayerLevel,
  UnlockedAchievement,
  CardMastery,
  NPCMastery,
  GameplayStats,
  MasteryThresholds,
} from "./types";
import {
  calculateXPForLevel,
  getLevelTitle,
  DEFAULT_MASTERY_THRESHOLDS,
} from "./types";
import {
  ACHIEVEMENTS,
  getAchievementById,
  calculateQuizXP,
} from "./achievements";
import type { Locale } from "../dialogue/types";

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSION SERVICE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Progression Service - Core logic for player progression system
 *
 * Responsibilities:
 * - Manage XP and leveling
 * - Track and unlock achievements
 * - Calculate and update mastery levels
 * - Emit events for progression milestones
 * - Provide statistics aggregation
 */
export class ProgressionService {
  private state: ProgressionState;
  private listeners: Set<ProgressionEventListener>;
  private locale: Locale;
  private masteryThresholds: MasteryThresholds;

  constructor(initialState?: Partial<ProgressionState>, locale: Locale = "en") {
    this.locale = locale;
    this.masteryThresholds = DEFAULT_MASTERY_THRESHOLDS;
    this.listeners = new Set();
    this.state = this.createDefaultState();

    // Merge with provided state
    if (initialState) {
      this.state = { ...this.state, ...initialState };
    }
  }

  // ─── Event System ─────────────────────────────────────────────────────────

  /** Subscribe to progression events */
  onEvent(listener: ProgressionEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Emit event to all listeners */
  private emit(event: ProgressionEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  // ─── State Access ─────────────────────────────────────────────────────────

  /** Get current state */
  getState(): ProgressionState {
    return { ...this.state };
  }

  /** Get current level info */
  getLevel(): PlayerLevel {
    return { ...this.state.level };
  }

  /** Get gameplay statistics */
  getStats(): GameplayStats {
    return { ...this.state.gameplay };
  }

  /** Get unlocked achievements */
  getUnlockedAchievements(): Record<string, UnlockedAchievement> {
    return { ...this.state.achievements };
  }

  // ─── XP & Leveling ───────────────────────────────────────────────────────

  /**
   * Add XP and handle level ups
   */
  addXP(amount: number, source: string = "manual"): number {
    const previousLevel = this.state.level.currentLevel;

    this.state.totalXP += amount;
    this.state.lifetimeXP += amount;
    this.state.level.currentXP += amount;

    // Check for level ups
    let levelsGained = 0;
    while (this.state.level.currentXP >= this.state.level.xpToNextLevel) {
      this.state.level.currentXP -= this.state.level.xpToNextLevel;
      this.state.level.currentLevel++;
      this.state.level.xpToNextLevel = calculateXPForLevel(this.state.level.currentLevel);
      levelsGained++;
    }

    // Update level info
    if (levelsGained > 0) {
      this.state.level.title = getLevelTitle(this.state.level.currentLevel, this.locale);
      this.state.level.progress = this.calculateLevelProgress();
      this.state.gameplay.highestLevel = Math.max(
        this.state.gameplay.highestLevel,
        this.state.level.currentLevel
      );

      // Emit level up events
      for (let i = 0; i < levelsGained; i++) {
        this.emit({
          type: "LEVEL_UP",
          timestamp: Date.now(),
          payload: {
            newLevel: previousLevel + i + 1,
            xpToNext: this.state.level.xpToNextLevel,
          },
        });
      }
    }

    this.state.updatedAt = Date.now();
    this.emitXPEvent(amount, source);

    return levelsGained;
  }

  /**
   * Calculate current level progress percentage
   */
  private calculateLevelProgress(): number {
    const xpForCurrentLevel = calculateXPForLevel(this.state.level.currentLevel);
    const xpProgress = this.state.level.currentXP;
    return Math.round((xpProgress / xpForCurrentLevel) * 100);
  }

  /**
   * Emit XP gained event
   */
  private emitXPEvent(amount: number, source: string): void {
    this.emit({
      type: "XP_GAINED",
      timestamp: Date.now(),
      payload: { amount, source, totalXP: this.state.totalXP },
    });
  }

  // ─── Quiz Integration ─────────────────────────────────────────────────────

  /**
   * Record quiz completion and update stats
   */
  recordQuizCompletion(params: {
    correctAnswers: number;
    totalQuestions: number;
    timeSpentMs: number;
    combo: number;
    difficulty: string;
  }): {
    xpEarned: number;
    levelsGained: number;
    achievementsUnlocked: string[];
    newMastery: Record<string, CardMastery>;
  } {
    const { correctAnswers, totalQuestions, timeSpentMs, combo, difficulty } = params;
    const isPerfect = correctAnswers === totalQuestions;

    // Update gameplay stats
    this.state.gameplay.totalQuizzesTaken++;
    this.state.gameplay.totalQuestionsAnswered += totalQuestions;
    this.state.gameplay.totalCorrectAnswers += correctAnswers;
    this.state.gameplay.totalWrongAnswers += totalQuestions - correctAnswers;
    this.state.gameplay.totalTimeSpentMs += timeSpentMs;

    // Update averages
    const totalAnswers = this.state.gameplay.totalQuestionsAnswered;
    this.state.gameplay.averageAccuracy = Math.round(
      (this.state.gameplay.totalCorrectAnswers / totalAnswers) * 100
    );

    // Update quiz times
    if (this.state.gameplay.fastestQuizMs === 0 || timeSpentMs < this.state.gameplay.fastestQuizMs) {
      this.state.gameplay.fastestQuizMs = timeSpentMs;
    }
    this.state.gameplay.averageQuizTimeMs = Math.round(
      this.state.gameplay.totalTimeSpentMs / this.state.gameplay.totalQuizzesTaken
    );

    // Track perfect quizzes
    if (isPerfect) {
      this.state.gameplay.perfectQuizzes++;
    }

    // Track combos
    if (combo > this.state.gameplay.highestCombo) {
      this.state.gameplay.highestCombo = combo;
    }
    this.state.gameplay.totalCombosEarned += combo;

    // Update daily stats
    this.state.daily.quizzesTaken++;
    this.state.daily.questionsAnswered += totalQuestions;
    this.state.daily.correctAnswers += correctAnswers;
    this.state.daily.timeSpentMs += timeSpentMs;

    // Calculate XP
    const xpEarned = calculateQuizXP(correctAnswers, totalQuestions, combo, difficulty);
    const levelsGained = this.addXP(xpEarned, "quiz_completion");
    this.state.daily.xpEarned += xpEarned;

    // Check achievements
    const newAchievements = this.checkAchievements();

    this.state.updatedAt = Date.now();

    return {
      xpEarned,
      levelsGained,
      achievementsUnlocked: newAchievements,
      newMastery: {},
    };
  }

  // ─── Card Mastery ─────────────────────────────────────────────────────────

  /**
   * Update mastery for a card
   */
  updateCardMastery(
    cardId: string,
    wasCorrect: boolean
  ): CardMastery {
    let mastery = this.state.cardMastery[cardId];

    if (!mastery) {
      mastery = {
        cardId,
        timesReviewed: 0,
        timesCorrect: 0,
        accuracy: 0,
        currentLevel: "new",
        streak: 0,
        lastReviewed: Date.now(),
        nextReviewDate: Date.now(),
      };
    }

    mastery.timesReviewed++;
    mastery.lastReviewed = Date.now();

    if (wasCorrect) {
      mastery.timesCorrect++;
      mastery.streak++;
    } else {
      mastery.streak = 0;
    }

    // Calculate accuracy
    mastery.accuracy = Math.round(
      (mastery.timesCorrect / mastery.timesReviewed) * 100
    );

    // Update mastery level
    const previousLevel = mastery.currentLevel;
    mastery.currentLevel = this.calculateMasteryLevel(mastery);

    // Set next review date (spaced repetition)
    mastery.nextReviewDate = this.calculateNextReviewDate(mastery);

    // Update gameplay stats
    this.state.gameplay.cardsReviewed++;
    if (mastery.currentLevel === "mastered" && previousLevel !== "mastered") {
      this.state.gameplay.cardsMastered++;
      this.emit({ type: "MASTERY_LEVEL_UP", timestamp: Date.now(), payload: { cardId } });
    }

    this.state.cardMastery[cardId] = mastery;

    return mastery;
  }

  /**
   * Calculate mastery level based on performance
   */
  private calculateMasteryLevel(mastery: CardMastery): CardMastery["currentLevel"] {
    if (mastery.timesReviewed === 0) return "new";
    if (mastery.timesCorrect >= this.masteryThresholds.mastered && mastery.accuracy >= 85) {
      return "mastered";
    }
    if (mastery.timesCorrect >= this.masteryThresholds.reviewing) {
      return "reviewing";
    }
    if (mastery.timesCorrect >= this.masteryThresholds.learning) {
      return "learning";
    }
    return "learning";
  }

  /**
   * Calculate next review date using spaced repetition
   */
  private calculateNextReviewDate(mastery: CardMastery): number {
    const baseInterval = 60 * 1000; // 1 minute
    const multiplier = Math.pow(2, mastery.streak);
    const maxInterval = 7 * 24 * 60 * 60 * 1000; // 7 days
    return Date.now() + Math.min(baseInterval * multiplier, maxInterval);
  }

  /**
   * Get cards due for review
   */
  getCardsForReview(cardIds: string[], limit: number = 20): string[] {
    const now = Date.now();

    return cardIds
      .filter((id) => {
        const mastery = this.state.cardMastery[id];
        return !mastery || mastery.nextReviewDate <= now;
      })
      .slice(0, limit);
  }

  // ─── NPC Mastery ─────────────────────────────────────────────────────────

  /**
   * Record NPC interaction
   */
  recordNPCInteraction(npcId: string, params?: {
    quizCompleted?: boolean;
    correctAnswers?: number;
    totalQuestions?: number;
  }): NPCMastery {
    let mastery = this.state.npcMastery[npcId];

    if (!mastery) {
      mastery = {
        npcId,
        interactions: 0,
        quizzesCompleted: 0,
        perfectQuizzes: 0,
        totalCorrect: 0,
        totalWrong: 0,
        masteryLevel: 1,
        lastInteracted: Date.now(),
      };
    }

    mastery.interactions++;
    mastery.lastInteracted = Date.now();

    if (params?.quizCompleted) {
      mastery.quizzesCompleted++;
      mastery.totalCorrect += params.correctAnswers || 0;
      mastery.totalWrong += (params.totalQuestions || 0) - (params.correctAnswers || 0);

      if (params.correctAnswers === params.totalQuestions) {
        mastery.perfectQuizzes++;
      }

      // Update mastery level (1-5 stars)
      mastery.masteryLevel = Math.min(5, Math.floor(mastery.quizzesCompleted / 5) + 1);
    }

    this.state.npcMastery[npcId] = mastery;
    this.state.gameplay.npcInteractions++;

    this.state.updatedAt = Date.now();
    return mastery;
  }

  // ─── Streak Management ───────────────────────────────────────────────────

  /**
   * Update daily streak
   */
  updateStreak(): void {
    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];
    const lastPlayed = this.state.gameplay.lastPlayedAt;
    const lastPlayedDate = new Date(lastPlayed).toISOString().split("T")[0];

    // Check if already played today
    if (lastPlayedDate === today) {
      return;
    }

    const dayMs = 24 * 60 * 60 * 1000;
    const daysSinceLastPlay = Math.floor((now - lastPlayed) / dayMs);

    if (daysSinceLastPlay === 1) {
      // Consecutive day - continue streak
      this.state.gameplay.currentStreak++;
      this.emit({ type: "STREAK_CONTINUED", timestamp: now, payload: { streak: this.state.gameplay.currentStreak } });
    } else if (daysSinceLastPlay > 1) {
      // Streak broken
      if (this.state.gameplay.currentStreak > 0) {
        this.emit({ type: "STREAK_BROKEN", timestamp: now });
      }
      this.state.gameplay.currentStreak = 1;
    }

    // Update longest streak
    if (this.state.gameplay.currentStreak > this.state.gameplay.longestStreak) {
      this.state.gameplay.longestStreak = this.state.gameplay.currentStreak;
    }

    this.state.gameplay.lastPlayedAt = now;

    // Reset daily stats for new day
    if (lastPlayedDate !== today) {
      this.state.daily = {
        date: today,
        quizzesTaken: 0,
        questionsAnswered: 0,
        correctAnswers: 0,
        xpEarned: 0,
        timeSpentMs: 0,
        achievementsUnlocked: [],
      };

      // Daily streak bonus XP
      if (this.state.gameplay.currentStreak > 0) {
        const streakXP = this.state.gameplay.currentStreak * 20;
        this.addXP(streakXP, "daily_streak");
        this.state.daily.xpEarned += streakXP;
      }
    }
  }

  // ─── Achievement System ──────────────────────────────────────────────────

  /**
   * Check and unlock achievements based on current state
   */
  checkAchievements(): string[] {
    const newlyUnlocked: string[] = [];

    for (const achievement of ACHIEVEMENTS) {
      // Skip already unlocked
      if (this.state.achievements[achievement.id]) {
        continue;
      }

      const progress = this.calculateAchievementProgress(achievement);
      const isComplete = progress >= this.getAchievementTarget(achievement);

      if (isComplete) {
        this.unlockAchievement(achievement.id);
        newlyUnlocked.push(achievement.id);

        // Award achievement rewards
        if (achievement.rewards.xp) {
          this.addXP(achievement.rewards.xp, `achievement_${achievement.id}`);
        }
      } else {
        // Update progress tracking
        this.state.achievements[achievement.id] = {
          achievementId: achievement.id,
          unlockedAt: 0,
          progress,
        };

        this.emit({
          type: "ACHIEVEMENT_PROGRESS",
          timestamp: Date.now(),
          payload: { achievementId: achievement.id, progress },
        });
      }
    }

    return newlyUnlocked;
  }

  /**
   * Calculate progress towards an achievement
   */
  private calculateAchievementProgress(achievement: { requirement: { type: string; [key: string]: unknown } }): number {
    const req = achievement.requirement;

    switch (req.type) {
      case "quiz_count":
        return this.state.gameplay.totalQuizzesTaken;
      case "perfect_quiz_count":
        return this.state.gameplay.perfectQuizzes;
      case "cards_mastered":
        return this.state.gameplay.cardsMastered;
      case "npc_interactions":
        return this.state.gameplay.npcInteractions;
      case "streak_days":
        return this.state.gameplay.currentStreak;
      case "level_reached":
        return this.state.level.currentLevel;
      case "total_xp":
        return this.state.totalXP;
      case "combo_reached":
        return this.state.gameplay.highestCombo;
      case "accuracy_achieved":
        return this.state.gameplay.averageAccuracy;
      case "time_played":
        return Math.floor(this.state.gameplay.totalTimeSpentMs / 60000);
      default:
        return 0;
    }
  }

  /**
   * Get target value for an achievement
   */
  private getAchievementTarget(achievement: { requirement: { type: string; [key: string]: unknown } }): number {
    const req = achievement.requirement;
    switch (req.type) {
      case "quiz_count":
      case "perfect_quiz_count":
      case "cards_mastered":
      case "npc_interactions":
      case "streak_days":
      case "level_reached":
      case "combo_reached":
        return (req.count || req.level || req.multiplier || 0) as number;
      case "total_xp":
        return req.amount as number;
      case "accuracy_achieved":
        return req.percentage as number;
      case "time_played":
        return req.minutes as number;
      default:
        return 0;
    }
  }

  /**
   * Unlock an achievement
   */
  private unlockAchievement(achievementId: string): void {
    this.state.achievements[achievementId] = {
      achievementId,
      unlockedAt: Date.now(),
      progress: this.getAchievementTarget(getAchievementById(achievementId)!),
    };

    this.emit({
      type: "ACHIEVEMENT_UNLOCKED",
      timestamp: Date.now(),
      payload: { achievementId },
    });
  }

  /**
   * Get achievement progress (0-100%)
   */
  getAchievementProgress(achievementId: string): number {
    const achievement = getAchievementById(achievementId);
    if (!achievement) return 0;

    const unlocked = this.state.achievements[achievementId];
    if (unlocked?.unlockedAt > 0) return 100;

    const progress = this.calculateAchievementProgress(achievement);
    const target = this.getAchievementTarget(achievement);

    return target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0;
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  /**
   * Serialize state for storage
   */
  toJSON(): ProgressionState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Load state from storage
   */
  fromJSON(data: ProgressionState): void {
    this.state = { ...this.state, ...data };
    this.state.updatedAt = Date.now();
  }

  // ─── Utility ─────────────────────────────────────────────────────────────

  /**
   * Create default state
   */
  private createDefaultState(): ProgressionState {
    return {
      level: {
        currentLevel: 1,
        currentXP: 0,
        xpToNextLevel: calculateXPForLevel(1),
        progress: 0,
        title: getLevelTitle(1, this.locale),
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
        lastPlayedAt: Date.now(),
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastSyncedAt: Date.now(),
    };
  }

  /**
   * Reset all progress
   */
  reset(): void {
    this.state = this.createDefaultState();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON
// ─────────────────────────────────────────────────────────────────────────────

let progressionServiceInstance: ProgressionService | null = null;

/** Get or create singleton instance */
export function getProgressionService(): ProgressionService {
  if (!progressionServiceInstance) {
    progressionServiceInstance = new ProgressionService();
  }
  return progressionServiceInstance;
}

/** Create fresh instance */
export function createProgressionService(
  initialState?: Partial<ProgressionState>,
  locale?: Locale
): ProgressionService {
  progressionServiceInstance = new ProgressionService(initialState, locale);
  return progressionServiceInstance;
}
