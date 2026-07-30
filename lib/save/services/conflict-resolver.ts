/**
 * Conflict Resolver
 *
 * Phase 1: Core Infrastructure
 * Conflict detection and resolution strategies
 */

import type { SaveData } from "../types/save-data";
import type { SlotId } from "../types/save-slot";
import type {
  ConflictInfo,
  ConflictResolution,
} from "../types/sync-state";
import type { SaveResult } from "../types/errors";
import { successResult, failureResult, ConflictError } from "../types/errors";

/**
 * Merge strategy for conflicting data
 */
export interface MergeStrategy {
  name: string;
  merge: (local: SaveData, cloud: SaveData) => SaveData;
}

/**
 * Conflict resolver interface
 */
export interface IConflictResolver {
  detectConflict(
    slotId: SlotId,
    local: SaveData,
    cloud: SaveData,
    localModifiedAt: number,
    cloudModifiedAt: number
  ): ConflictInfo | null;

  autoResolve(conflict: ConflictInfo): ConflictResolution | null;
  merge(local: SaveData, cloud: SaveData): SaveData;
  applyResolution(
    conflict: ConflictInfo,
    resolution: ConflictResolution
  ): SaveResult<SaveData>;
}

/**
 * Default conflict resolver implementation
 */
export class ConflictResolver implements IConflictResolver {
  private readonly strategies: MergeStrategy[];

  constructor() {
    // Register default merge strategies
    this.strategies = [
      {
        name: "latest-wins",
        merge: (local, cloud) => {
          return local.metadata.modifiedAt > cloud.metadata.modifiedAt ? local : cloud;
        },
      },
      {
        name: "prefer-cloud",
        merge: (local, cloud) => cloud,
      },
      {
        name: "prefer-local",
        merge: (local) => local,
      },
      {
        name: "deep-merge",
        merge: this.deepMerge.bind(this),
      },
    ];
  }

  /**
   * Detect if there's a conflict between local and cloud versions
   */
  detectConflict(
    slotId: SlotId,
    local: SaveData,
    cloud: SaveData,
    localModifiedAt: number,
    cloudModifiedAt: number
  ): ConflictInfo | null {
    // A conflict exists if both versions have been modified since last sync
    // and they differ
    if (local.metadata.modifiedAt === localModifiedAt &&
        cloud.metadata.modifiedAt === cloudModifiedAt) {
      // Both modified since sync point - check if data differs
      if (this.areDataEqual(local, cloud)) {
        return null; // No actual conflict
      }
    }

    return {
      slotId,
      localVersion: local,
      cloudVersion: cloud,
      localModifiedAt,
      cloudModifiedAt,
      resolution: null,
    };
  }

  /**
   * Attempt to auto-resolve a conflict
   */
  autoResolve(conflict: ConflictInfo): ConflictResolution | null {
    // If one version is significantly newer (> 1 hour), prefer it
    const hourMs = 60 * 60 * 1000;
    const timeDiff = Math.abs(
      conflict.localModifiedAt - conflict.cloudModifiedAt
    );

    if (timeDiff > hourMs) {
      // Prefer the newer version
      return conflict.localModifiedAt > conflict.cloudModifiedAt
        ? "keep_local"
        : "keep_cloud";
    }

    // If versions are close, prefer cloud (usually more complete)
    return "keep_cloud";
  }

  /**
   * Merge two save data versions using deep merge strategy
   */
  merge(local: SaveData, cloud: SaveData): SaveData {
    return this.deepMerge(local, cloud);
  }

  /**
   * Apply a conflict resolution
   */
  applyResolution(
    conflict: ConflictInfo,
    resolution: ConflictResolution
  ): SaveResult<SaveData> {
    try {
      let merged: SaveData;

      switch (resolution) {
        case "keep_local":
          merged = conflict.localVersion;
          break;
        case "keep_cloud":
          merged = conflict.cloudVersion;
          break;
        case "merge":
          merged = this.merge(conflict.localVersion, conflict.cloudVersion);
          break;
        case "keep_both":
          // For "keep_both", we need additional context (target slot)
          // This would need to be handled at a higher level
          return failureResult(
            new ConflictError(conflict)
          );
        default:
          return failureResult(
            new ConflictError(conflict)
          );
      }

      // Update metadata to reflect the resolution
      merged.metadata.modifiedAt = Date.now();

      return successResult(merged);
    } catch (error) {
      return failureResult(
        error instanceof ConflictError
          ? error
          : new ConflictError(conflict)
      );
    }
  }

  // ─── Deep merge implementation ─────────────────────────────────────────────────

  private deepMerge(local: SaveData, cloud: SaveData): SaveData {
    // For progression stats, take the max values (best performance)
    const mergedProgression = this.mergeProgression(
      local.progression,
      cloud.progression
    );

    // For game state, prefer the more recent
    const mergedGame = local.metadata.modifiedAt > cloud.metadata.modifiedAt
      ? local.game
      : cloud.game;

    // For achievements, combine both sets
    const mergedAchievements = {
      ...cloud.progression.achievements,
      ...local.progression.achievements,
    };

    // For other fields, prefer the newer version
    return {
      ...(local.metadata.modifiedAt > cloud.metadata.modifiedAt ? local : cloud),
      progression: {
        ...mergedProgression,
        achievements: mergedAchievements,
      },
      game: mergedGame,
    };
  }

  private mergeProgression(
    local: SaveData["progression"],
    cloud: SaveData["progression"]
  ): SaveData["progression"] {
    return {
      // Take max level and XP
      level: local.xp >= cloud.xp ? local.level : cloud.level,
      xp: Math.max(local.xp, cloud.xp),
      lifetimeXP: Math.max(local.lifetimeXP, cloud.lifetimeXP),

      // Take max stats
      stats: {
        totalQuizzesTaken: Math.max(
          local.stats.totalQuizzesTaken,
          cloud.stats.totalQuizzesTaken
        ),
        totalCorrectAnswers: Math.max(
          local.stats.totalCorrectAnswers,
          cloud.stats.totalCorrectAnswers
        ),
        totalWrongAnswers: Math.max(
          local.stats.totalWrongAnswers,
          cloud.stats.totalWrongAnswers
        ),
        currentStreak: Math.max(
          local.stats.currentStreak,
          cloud.stats.currentStreak
        ),
        longestStreak: Math.max(
          local.stats.longestStreak,
          cloud.stats.longestStreak
        ),
        highestCombo: Math.max(
          local.stats.highestCombo,
          cloud.stats.highestCombo
        ),
        totalTimeSpentMs: Math.max(
          local.stats.totalTimeSpentMs,
          cloud.stats.totalTimeSpentMs
        ),
      },

      // Keep card mastery from both
      cardMastery: {
        ...cloud.cardMastery,
        ...local.cardMastery,
      },

      // Keep NPC mastery from both
      npcMastery: {
        ...cloud.npcMastery,
        ...local.npcMastery,
      },

      // Keep achievements from both
      achievements: {
        ...cloud.achievements,
        ...local.achievements,
      },

      // Take max daily stats
      daily: {
        quizzesTaken: Math.max(
          local.daily.quizzesTaken,
          cloud.daily.quizzesTaken
        ),
        correctAnswers: Math.max(
          local.daily.correctAnswers,
          cloud.daily.correctAnswers
        ),
        xpEarned: Math.max(local.daily.xpEarned, cloud.daily.xpEarned),
        date: local.daily.date > cloud.daily.date ? local.daily.date : cloud.daily.date,
      },
    };
  }

  private areDataEqual(a: SaveData, b: SaveData): boolean {
    // Quick equality check based on critical fields
    return (
      a.player.id === b.player.id &&
      a.progression.xp === b.progression.xp &&
      a.progression.level.currentLevel === b.progression.level.currentLevel &&
      a.metadata.modifiedAt === b.metadata.modifiedAt
    );
  }
}

/**
 * Singleton instance
 */
let instance: ConflictResolver | null = null;

export function getConflictResolver(): ConflictResolver {
  if (!instance) {
    instance = new ConflictResolver();
  }
  return instance;
}
