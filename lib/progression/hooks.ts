/**
 * Progression System - React Hooks
 *
 * Feature 13: Player Progression
 *
 * Presentation Layer: React hooks for state management
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ProgressionService,
  createProgressionService,
} from "./progression-service";
import {
  ACHIEVEMENTS,
  getAchievementById,
  getTotalAchievementsCount,
} from "./achievements";
import type {
  ProgressionState,
  PlayerLevel,
  GameplayStats,
  ProgressionEvent,
  ProgressionEventType,
  UnlockedAchievement,
  CardMastery,
  AchievementDefinition,
} from "./types";
import type { Locale } from "../dialogue/types";

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT STATS HELPER
// ─────────────────────────────────────────────────────────────────────────────

function getDefaultGameplayStats() {
  return {
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
    lastPlayedAt: 0,
    highestCombo: 0,
    totalCombosEarned: 0,
    totalCoins: 0,
    totalXP: 0,
    highestLevel: 1,
    npcInteractions: 0,
    dialoguesCompleted: 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HOOK: useProgression
// ─────────────────────────────────────────────────────────────────────────────

export interface UseProgressionOptions {
  autoLoad?: boolean;
  autoSave?: boolean;
  persistKey?: string;
  locale?: Locale;
}

export interface UseProgressionReturn {
  // State
  level: PlayerLevel;
  stats: GameplayStats;
  achievements: Record<string, UnlockedAchievement>;
  mastery: Record<string, CardMastery>;
  totalXP: number;
  isLoading: boolean;

  // Actions
  recordQuiz: (params: {
    correctAnswers: number;
    totalQuestions: number;
    timeSpentMs: number;
    combo: number;
    difficulty: string;
  }) => QuizResult;

  updateCardMastery: (cardId: string, wasCorrect: boolean) => CardMastery;
  recordNPCInteraction: (npcId: string) => void;
  updateStreak: () => void;

  // Queries
  getAchievementProgress: (achievementId: string) => number;
  getAchievement: (achievementId: string) => AchievementDefinition | undefined;
  getUnlockedAchievementCount: () => number;
  getTotalAchievementCount: () => number;

  // Persistence
  save: () => void;
  load: () => void;
  reset: () => void;
}

interface QuizResult {
  xpEarned: number;
  levelsGained: number;
  achievementsUnlocked: string[];
}

/** Main progression hook */
export function useProgression(options: UseProgressionOptions = {}): UseProgressionReturn {
  const {
    autoLoad = true,
    autoSave = true,
    persistKey = "wordrun_progression",
    locale = "en",
  } = options;

  const serviceRef = useRef<ProgressionService | null>(null);
  const [state, setState] = useState<ProgressionState | null>(null);
  const [isLoading, setIsLoading] = useState(autoLoad);

  // Initialize service
  useEffect(() => {
    serviceRef.current = createProgressionService(undefined, locale);

    // Subscribe to events
    const service = serviceRef.current;
    const unsubscribe = service.onEvent((event: ProgressionEvent) => {
      setState({ ...service.getState() });

      // Auto-save on changes
      if (autoSave && shouldPersistEvent(event)) {
        persistState(service.getState(), persistKey);
      }
    });

    // Load saved state
    if (autoLoad) {
      const saved = loadState(persistKey);
      if (saved) {
        service.fromJSON(saved);
      }
      setIsLoading(false);
    }

    setState({ ...service.getState() });

    return () => {
      unsubscribe();
    };
  }, [autoLoad, autoSave, persistKey, locale]);

  // Derived values
  const level = useMemo(() => state?.level ?? {
    currentLevel: 1,
    currentXP: 0,
    xpToNextLevel: 100,
    progress: 0,
    title: "Beginner",
  }, [state]);

  const stats = useMemo(() => state?.gameplay ?? getDefaultGameplayStats(), [state]);

  const achievements = useMemo(() => state?.achievements ?? {}, [state]);
  const mastery = useMemo(() => state?.cardMastery ?? {}, [state]);
  const totalXP = useMemo(() => state?.totalXP ?? 0, [state]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const recordQuiz = useCallback(
    (params: {
      correctAnswers: number;
      totalQuestions: number;
      timeSpentMs: number;
      combo: number;
      difficulty: string;
    }) => {
      const service = serviceRef.current;
      if (!service) {
        return { xpEarned: 0, levelsGained: 0, achievementsUnlocked: [] };
      }

      return service.recordQuizCompletion(params);
    },
    []
  );

  const updateCardMastery = useCallback((cardId: string, wasCorrect: boolean) => {
    const service = serviceRef.current;
    if (!service) {
      return {
        cardId,
        timesReviewed: 0,
        timesCorrect: 0,
        accuracy: 0,
        currentLevel: "new" as const,
        streak: 0,
        lastReviewed: Date.now(),
        nextReviewDate: Date.now(),
      };
    }

    return service.updateCardMastery(cardId, wasCorrect);
  }, []);

  const recordNPCInteraction = useCallback((npcId: string) => {
    const service = serviceRef.current;
    if (service) {
      service.recordNPCInteraction(npcId);
    }
  }, []);

  const updateStreak = useCallback(() => {
    const service = serviceRef.current;
    if (service) {
      service.updateStreak();
    }
  }, []);

  // ─── Queries ─────────────────────────────────────────────────────────────

  const getAchievementProgress = useCallback((achievementId: string): number => {
    const service = serviceRef.current;
    if (!service) return 0;
    return service.getAchievementProgress(achievementId);
  }, []);

  const getAchievement = useCallback(
    (achievementId: string): AchievementDefinition | undefined => {
      return getAchievementById(achievementId);
    },
    []
  );

  const getUnlockedAchievementCount = useCallback((): number => {
    return Object.keys(achievements).filter(
      (id) => achievements[id]?.unlockedAt > 0
    ).length;
  }, [achievements]);

  const getTotalAchievementCount = useCallback((): number => {
    return getTotalAchievementsCount();
  }, []);

  // ─── Persistence ─────────────────────────────────────────────────────────

  const save = useCallback(() => {
    const service = serviceRef.current;
    if (service) {
      persistState(service.getState(), persistKey);
    }
  }, [persistKey]);

  const load = useCallback(() => {
    const service = serviceRef.current;
    if (service) {
      const saved = loadState(persistKey);
      if (saved) {
        service.fromJSON(saved);
        setState({ ...service.getState() });
      }
    }
  }, [persistKey]);

  const reset = useCallback(() => {
    const service = serviceRef.current;
    if (service) {
      service.reset();
      clearState(persistKey);
    }
  }, [persistKey]);

  return {
    level,
    stats,
    achievements,
    mastery,
    totalXP,
    isLoading,
    recordQuiz,
    updateCardMastery,
    recordNPCInteraction,
    updateStreak,
    getAchievementProgress,
    getAchievement,
    getUnlockedAchievementCount,
    getTotalAchievementCount,
    save,
    load,
    reset,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function persistState(state: ProgressionState, key: string): void {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to persist progression state:", error);
  }
}

function loadState(key: string): ProgressionState | null {
  try {
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as ProgressionState;
  } catch (error) {
    console.error("Failed to load progression state:", error);
    return null;
  }
}

function clearState(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to clear progression state:", error);
  }
}

function shouldPersistEvent(event: ProgressionEvent): boolean {
  const persistableEvents: ProgressionEventType[] = [
    "XP_GAINED",
    "LEVEL_UP",
    "ACHIEVEMENT_UNLOCKED",
    "MASTERY_LEVEL_UP",
    "STREAK_CONTINUED",
  ];
  return persistableEvents.includes(event.type);
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTERY SUMMARY HOOK
// ─────────────────────────────────────────────────────────────────────────────

export interface MasterySummary {
  totalCards: number;
  mastered: number;
  reviewing: number;
  learning: number;
  new: number;
  masteryPercentage: number;
}

export function useMasterySummary(
  totalCards: number,
  mastery: Record<string, CardMastery>
): MasterySummary {
  return useMemo(() => {
    const counts = {
      mastered: 0,
      reviewing: 0,
      learning: 0,
      new: 0,
    };

    Object.values(mastery).forEach((m) => {
      switch (m.currentLevel) {
        case "mastered":
          counts.mastered++;
          break;
        case "reviewing":
          counts.reviewing++;
          break;
        case "learning":
          counts.learning++;
          break;
        default:
          counts.new++;
      }
    });

    // Cards not in mastery are "new"
    const newCards = Math.max(0, totalCards - Object.keys(mastery).length);

    return {
      totalCards,
      mastered: counts.mastered,
      reviewing: counts.reviewing,
      learning: counts.learning,
      new: counts.new + newCards,
      masteryPercentage: totalCards > 0
        ? Math.round((counts.mastered / totalCards) * 100)
        : 0,
    };
  }, [totalCards, mastery]);
}

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENT SUMMARY HOOK
// ─────────────────────────────────────────────────────────────────────────────

export interface AchievementSummary {
  total: number;
  unlocked: number;
  locked: number;
  progress: number; // percentage
  byCategory: Record<string, { unlocked: number; total: number }>;
}

export function useAchievementSummary(
  unlocked: Record<string, UnlockedAchievement>
): AchievementSummary {
  return useMemo(() => {
    const total = ACHIEVEMENTS.length;
    const unlockedIds = Object.keys(unlocked).filter(
      (id) => unlocked[id]?.unlockedAt > 0
    ).length;

    const byCategory: Record<string, { unlocked: number; total: number }> = {};

    ACHIEVEMENTS.forEach((achievement) => {
      if (!byCategory[achievement.category]) {
        byCategory[achievement.category] = { unlocked: 0, total: 0 };
      }
      byCategory[achievement.category].total++;
      if (unlocked[achievement.id]?.unlockedAt > 0) {
        byCategory[achievement.category].unlocked++;
      }
    });

    return {
      total,
      unlocked: unlockedIds,
      locked: total - unlockedIds,
      progress: total > 0 ? Math.round((unlockedIds / total) * 100) : 0,
      byCategory,
    };
  }, [unlocked]);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL CALCULATOR HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useLevelCalculator() {
  const calculate = useCallback((currentXP: number): PlayerLevel => {
    let level = 1;
    let xpRemaining = currentXP;
    let xpForCurrentLevel = 100; // Base XP for level 1

    while (xpRemaining >= xpForCurrentLevel) {
      xpRemaining -= xpForCurrentLevel;
      level++;
      xpForCurrentLevel = Math.floor(100 * Math.pow(level, 1.5));
    }

    const xpToNextLevel = xpForCurrentLevel;
    const progress = Math.round((xpRemaining / xpToNextLevel) * 100);

    return {
      currentLevel: level,
      currentXP: xpRemaining,
      xpToNextLevel,
      progress,
      title: getTitleForLevel(level),
    };
  }, []);

  return { calculate };
}

function getTitleForLevel(level: number): string {
  if (level >= 30) return "Grandmaster";
  if (level >= 20) return "Expert";
  if (level >= 15) return "Scholar";
  if (level >= 10) return "Student";
  if (level >= 5) return "Learner";
  return "Beginner";
}
