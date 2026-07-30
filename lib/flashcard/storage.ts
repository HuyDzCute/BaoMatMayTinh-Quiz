/**
 * Flashcard System - Storage Adapter
 * 
 * Feature 12: Flashcard Integration
 * 
 * Infrastructure Layer: Persistence and storage management
 * Implements IStorageAdapter for localStorage/sessionStorage support
 */

import type {
  IStorageAdapter,
  SerializableQuizState,
  CardProgress,
  UserStats,
  QuizSession,
  QuizConfig,
} from "./types";
import {
  createDefaultUserStats,
  createDefaultCardProgress,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL STORAGE ADAPTER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LocalStorage implementation of IStorageAdapter
 * Persists quiz state to browser localStorage
 */
export class LocalStorageAdapter implements IStorageAdapter {
  private prefix: string;

  constructor(prefix: string = "wordrun_flashcard_") {
    this.prefix = prefix;
  }

  /**
   * Get item from localStorage with type safety
   */
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (item === null) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`LocalStorageAdapter: Failed to get ${key}`, error);
      return null;
    }
  }

  /**
   * Set item to localStorage with error handling
   */
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (error) {
      console.error(`LocalStorageAdapter: Failed to set ${key}`, error);
      // Handle quota exceeded
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        this.cleanupOldData();
        try {
          localStorage.setItem(this.prefix + key, JSON.stringify(value));
        } catch (retryError) {
          console.error("LocalStorageAdapter: Retry failed", retryError);
        }
      }
    }
  }

  /**
   * Remove item from localStorage
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error(`LocalStorageAdapter: Failed to remove ${key}`, error);
    }
  }

  /**
   * Clear all items with this prefix
   */
  clear(): void {
    try {
      const keys = this.keys();
      keys.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error("LocalStorageAdapter: Failed to clear", error);
    }
  }

  /**
   * Get all keys with this prefix
   */
  keys(): string[] {
    try {
      const allKeys = Object.keys(localStorage);
      return allKeys.filter((key) => key.startsWith(this.prefix));
    } catch (error) {
      console.error("LocalStorageAdapter: Failed to get keys", error);
      return [];
    }
  }

  /**
   * Clean up old session data when storage is full
   */
  private cleanupOldData(): void {
    const sessionKeys = this.keys().filter((key) =>
      key.includes("session")
    );

    // Remove oldest sessions first
    sessionKeys.forEach((key) => {
      const data = this.get<unknown>(key.replace(this.prefix, ""));
      if (data && typeof data === "object" && "timestamp" in data) {
        const timestamp = (data as { timestamp?: number }).timestamp;
        if (timestamp && Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000) {
          this.remove(key.replace(this.prefix, ""));
        }
      }
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION STORAGE ADAPTER (for temporary data)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SessionStorage implementation for temporary data
 * Data persists only for the browser session
 */
export class SessionStorageAdapter implements IStorageAdapter {
  private prefix: string;

  constructor(prefix: string = "wordrun_flashcard_") {
    this.prefix = prefix;
  }

  get<T>(key: string): T | null {
    try {
      const item = sessionStorage.getItem(this.prefix + key);
      if (item === null) return null;
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      sessionStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (error) {
      console.error(`SessionStorageAdapter: Failed to set ${key}`, error);
    }
  }

  remove(key: string): void {
    try {
      sessionStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error(`SessionStorageAdapter: Failed to remove ${key}`, error);
    }
  }

  clear(): void {
    try {
      const keys = this.keys();
      keys.forEach((key) => sessionStorage.removeItem(key));
    } catch (error) {
      console.error("SessionStorageAdapter: Failed to clear", error);
    }
  }

  keys(): string[] {
    try {
      const allKeys = Object.keys(sessionStorage);
      return allKeys.filter((key) => key.startsWith(this.prefix));
    } catch {
      return [];
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS MANAGER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Progress Manager - Handles card mastery and progress tracking
 * 
 * Responsibilities:
 * - Track individual card progress
 * - Calculate mastery levels
 * - Manage spaced repetition scheduling
 */
export class ProgressManager {
  private storage: IStorageAdapter;
  private readonly PROGRESS_KEY = "card_progress";
  private readonly STATS_KEY = "user_stats";

  constructor(storage: IStorageAdapter) {
    this.storage = storage;
  }

  /**
   * Get progress for a specific card
   */
  getCardProgress(cardId: string): CardProgress {
    const allProgress = this.getAllProgress();
    return allProgress[cardId] ?? createDefaultCardProgress(cardId);
  }

  /**
   * Get all card progress
   */
  getAllProgress(): Record<string, CardProgress> {
    return this.storage.get<Record<string, CardProgress>>(this.PROGRESS_KEY) ?? {};
  }

  /**
   * Update progress for a card
   */
  updateCardProgress(cardId: string, correct: boolean): CardProgress {
    const allProgress = this.getAllProgress();
    const progress = allProgress[cardId] ?? createDefaultCardProgress(cardId);

    // Update stats
    progress.timesReviewed++;
    if (correct) {
      progress.timesCorrect++;
      progress.streak++;
    } else {
      progress.streak = 0;
    }

    // Calculate accuracy
    progress.accuracy = Math.round(
      (progress.timesCorrect / progress.timesReviewed) * 100
    );

    // Update last reviewed
    progress.lastReviewed = Date.now();

    // Calculate next review time (spaced repetition)
    progress.nextReview = this.calculateNextReview(progress);

    // Calculate mastery level
    progress.masteryLevel = this.calculateMasteryLevel(progress);

    // Save
    allProgress[cardId] = progress;
    this.storage.set(this.PROGRESS_KEY, allProgress);

    return progress;
  }

  /**
   * Get user statistics
   */
  getUserStats(): UserStats {
    return this.storage.get<UserStats>(this.STATS_KEY) ?? createDefaultUserStats();
  }

  /**
   * Update user statistics
   */
  updateUserStats(
    quizResult: {
      correctAnswers: number;
      totalQuestions: number;
      timeSpent: number;
      accuracy: number;
    }
  ): UserStats {
    const stats = this.getUserStats();

    // Update cumulative stats
    stats.totalQuizzesTaken++;
    stats.totalCorrectAnswers += quizResult.correctAnswers;
    stats.totalTimeSpent += quizResult.timeSpent;
    stats.lastPlayedAt = Date.now();

    // Update averages
    stats.averageAccuracy = Math.round(
      stats.totalCorrectAnswers /
        stats.totalQuizzesTaken /
        (quizResult.totalQuestions / quizResult.totalQuestions)
    );

    // Update streak
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    if (stats.lastPlayedAt > 0 && now - stats.lastPlayedAt < 2 * dayMs) {
      stats.currentStreak++;
    } else if (now - stats.lastPlayedAt > dayMs) {
      stats.currentStreak = 1;
    }

    // Update longest streak
    if (stats.currentStreak > stats.longestStreak) {
      stats.longestStreak = stats.currentStreak;
    }

    // Calculate XP and level
    const xpGained = quizResult.correctAnswers * 10 + quizResult.accuracy;
    stats.experience += xpGained;
    stats.level = this.calculateLevel(stats.experience);

    this.storage.set(this.STATS_KEY, stats);

    return stats;
  }

  /**
   * Calculate next review time using simple spaced repetition
   */
  private calculateNextReview(progress: CardProgress): number {
    const baseInterval = 60 * 1000; // 1 minute
    const multiplier = Math.pow(2, progress.streak); // Double interval per streak
    const maxInterval = 7 * 24 * 60 * 60 * 1000; // Max 7 days
    return Date.now() + Math.min(baseInterval * multiplier, maxInterval);
  }

  /**
   * Calculate mastery level based on progress
   */
  private calculateMasteryLevel(progress: CardProgress): CardProgress["masteryLevel"] {
    if (progress.timesReviewed === 0) return "new";
    if (progress.accuracy >= 90 && progress.streak >= 5) return "mastered";
    if (progress.accuracy >= 70 && progress.streak >= 3) return "reviewing";
    return "learning";
  }

  /**
   * Calculate player level from experience
   */
  private calculateLevel(experience: number): number {
    // Level formula: level = floor(sqrt(experience / 100)) + 1
    return Math.floor(Math.sqrt(experience / 100)) + 1;
  }

  /**
   * Get cards due for review
   */
  getCardsForReview(
    allCardIds: string[],
    limit: number = 20
  ): string[] {
    const allProgress = this.getAllProgress();
    const now = Date.now();

    // Sort by next review time
    const sortedCards = allCardIds
      .map((cardId) => ({
        cardId,
        progress: allProgress[cardId] ?? createDefaultCardProgress(cardId),
      }))
      .filter(({ progress }) => progress.nextReview <= now)
      .sort((a, b) => a.progress.nextReview - b.progress.nextReview);

    return sortedCards.slice(0, limit).map(({ cardId }) => cardId);
  }

  /**
   * Reset all progress (for testing/reset)
   */
  resetAll(): void {
    this.storage.remove(this.PROGRESS_KEY);
    this.storage.remove(this.STATS_KEY);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SERIALIZATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Serialize quiz session for storage
 */
export function serializeQuizSession(session: QuizSession): string {
  return JSON.stringify(session);
}

/**
 * Deserialize quiz session from storage
 */
export function deserializeQuizSession(data: string): QuizSession | null {
  try {
    return JSON.parse(data) as QuizSession;
  } catch {
    return null;
  }
}

/**
 * Create serializable quiz state
 */
export function createSerializableState(
  currentSession: QuizSession | null,
  cardProgress: Record<string, CardProgress>,
  userStats: UserStats,
  lastConfig: QuizConfig | null
): SerializableQuizState {
  return {
    currentSession,
    cardProgress,
    userStats,
    lastQuizConfig: lastConfig,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON INSTANCES
// ─────────────────────────────────────────────────────────────────────────────

let storageInstance: IStorageAdapter | null = null;
let progressManagerInstance: ProgressManager | null = null;

/**
 * Get singleton storage adapter
 */
export function getStorageAdapter(): IStorageAdapter {
  if (!storageInstance) {
    storageInstance = new LocalStorageAdapter();
  }
  return storageInstance;
}

/**
 * Get singleton progress manager
 */
export function getProgressManager(): ProgressManager {
  if (!progressManagerInstance) {
    progressManagerInstance = new ProgressManager(getStorageAdapter());
  }
  return progressManagerInstance;
}
