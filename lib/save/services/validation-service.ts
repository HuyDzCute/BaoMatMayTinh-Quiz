/**
 * Validation Service
 *
 * Phase 1: Core Infrastructure
 * Data validation, sanitization, and migration
 */

import {
  CURRENT_SAVE_VERSION,
  type SaveData,
  type PlayerSaveData,
  type PlayerSettings,
  type ProgressionSaveData,
  type FlashcardSaveData,
  type DialogueSaveData,
  type GameSaveData,
  type SaveMetadata,
  type Position3D,
  type NPCStateSave,
} from "../types/save-data";
import type { SlotId } from "../types/save-slot";
import {
  ValidationError,
  type SaveResult,
  successResult,
  failureResult,
} from "../types/errors";

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Validation service interface
 */
export interface IValidationService {
  validate(data: unknown): SaveResult<SaveData>;
  validatePartial(data: unknown, fields: (keyof SaveData)[]): SaveResult<Partial<SaveData>>;
  checkIntegrity(data: SaveData): boolean;
  sanitize(data: unknown): SaveData;
  needsMigration(data: SaveData): boolean;
  migrate(data: SaveData): SaveResult<SaveData>;
}

/**
 * Default validation service implementation
 */
export class ValidationService implements IValidationService {
  /**
   * Validate save data structure
   */
  validate(data: unknown): SaveResult<SaveData> {
    if (!data || typeof data !== "object") {
      return failureResult(new ValidationError("Save data must be an object"));
    }

    const errors: ValidationError[] = [];
    const saveData = data as SaveData;

    // Validate version
    const versionResult = this.validateField(saveData, "version", "string");
    if (!versionResult.valid) {
      errors.push(versionResult.error!);
    }

    // Validate player
    const playerResult = this.validatePlayer(saveData.player);
    if (!playerResult.valid) {
      errors.push(...playerResult.errors);
    }

    // Validate progression
    const progressionResult = this.validateProgression(saveData.progression);
    if (!progressionResult.valid) {
      errors.push(...progressionResult.errors);
    }

    // Validate flashcards
    const flashcardResult = this.validateFlashcards(saveData.flashcards);
    if (!flashcardResult.valid) {
      errors.push(...flashcardResult.errors);
    }

    // Validate dialogues
    const dialogueResult = this.validateDialogues(saveData.dialogues);
    if (!dialogueResult.valid) {
      errors.push(...dialogueResult.errors);
    }

    // Validate game
    const gameResult = this.validateGame(saveData.game);
    if (!gameResult.valid) {
      errors.push(...gameResult.errors);
    }

    // Validate metadata
    const metadataResult = this.validateMetadata(saveData.metadata);
    if (!metadataResult.valid) {
      errors.push(...metadataResult.errors);
    }

    if (errors.length > 0) {
      return failureResult(errors[0]);
    }

    return successResult(data as SaveData);
  }

  /**
   * Validate specific fields
   */
  validatePartial(data: unknown, fields: (keyof SaveData)[]): SaveResult<Partial<SaveData>> {
    if (!data || typeof data !== "object") {
      return failureResult(new ValidationError("Data must be an object"));
    }

    const result: Partial<SaveData> = {};
    const errors: ValidationError[] = [];

    for (const field of fields) {
      const fieldValue = (data as Record<string, unknown>)[field];
      if (fieldValue === undefined) continue;

      switch (field) {
        case "player":
          const playerResult = this.validatePlayer(fieldValue);
          if (playerResult.valid) {
            result.player = fieldValue as PlayerSaveData;
          } else {
            errors.push(...playerResult.errors);
          }
          break;
        case "progression":
          const progResult = this.validateProgression(fieldValue);
          if (progResult.valid) {
            result.progression = fieldValue as ProgressionSaveData;
          } else {
            errors.push(...progResult.errors);
          }
          break;
        case "flashcards":
          const flashResult = this.validateFlashcards(fieldValue);
          if (flashResult.valid) {
            result.flashcards = fieldValue as FlashcardSaveData;
          } else {
            errors.push(...flashResult.errors);
          }
          break;
        case "dialogues":
          const dialogResult = this.validateDialogues(fieldValue);
          if (dialogResult.valid) {
            result.dialogues = fieldValue as DialogueSaveData;
          } else {
            errors.push(...dialogResult.errors);
          }
          break;
        case "game":
          const gameResult = this.validateGame(fieldValue);
          if (gameResult.valid) {
            result.game = fieldValue as GameSaveData;
          } else {
            errors.push(...gameResult.errors);
          }
          break;
        case "metadata":
          const metaResult = this.validateMetadata(fieldValue);
          if (metaResult.valid) {
            result.metadata = fieldValue as SaveMetadata;
          } else {
            errors.push(...metaResult.errors);
          }
          break;
        default:
          result[field] = fieldValue as never;
      }
    }

    if (errors.length > 0) {
      return failureResult(errors[0]);
    }

    return successResult(result);
  }

  /**
   * Check data integrity
   */
  checkIntegrity(data: SaveData): boolean {
    // Check version exists
    if (!data.version) return false;

    // Check player integrity
    if (!data.player?.id || !data.player?.name) return false;

    // Check progression stats are non-negative
    if (data.progression?.stats) {
      const stats = data.progression.stats;
      if (
        stats.totalQuizzesTaken < 0 ||
        stats.totalCorrectAnswers < 0 ||
        stats.totalWrongAnswers < 0 ||
        stats.currentStreak < 0 ||
        stats.longestStreak < 0
      ) {
        return false;
      }
    }

    // Check position is valid
    if (data.game?.playerPosition) {
      const pos = data.game.playerPosition;
      if (
        typeof pos.x !== "number" ||
        typeof pos.y !== "number" ||
        typeof pos.z !== "number"
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sanitize data (remove invalid fields)
   */
  sanitize(data: unknown): SaveData {
    if (!data || typeof data !== "object") {
      throw new ValidationError("Cannot sanitize non-object data");
    }

    const obj = data as Record<string, unknown>;

    // Keep only known fields
    const sanitized: Record<string, unknown> = {};

    // Required fields with defaults
    sanitized.version = typeof obj.version === "string" ? obj.version : CURRENT_SAVE_VERSION;
    sanitized.player = this.sanitizePlayer(obj.player);
    sanitized.progression = this.sanitizeProgression(obj.progression);
    sanitized.flashcards = this.sanitizeFlashcards(obj.flashcards);
    sanitized.dialogues = this.sanitizeDialogues(obj.dialogues);
    sanitized.game = this.sanitizeGame(obj.game);
    sanitized.metadata = this.sanitizeMetadata(obj.metadata);

    return sanitized as unknown as SaveData;
  }

  /**
   * Check if migration is needed
   */
  needsMigration(data: SaveData): boolean {
    return data.version !== CURRENT_SAVE_VERSION;
  }

  /**
   * Migrate data to current version
   */
  migrate(data: SaveData): SaveResult<SaveData> {
    if (!this.needsMigration(data)) {
      return successResult(data);
    }

    try {
      let migrated = { ...data };

      // Migrate from 0.x to 1.0.0
      if (this.isVersionLessThan(migrated.version, "1.0.0")) {
        migrated = this.migrateTo100(migrated);
      }

      // Future migrations go here

      // Update version
      migrated.version = CURRENT_SAVE_VERSION;

      // Re-validate after migration
      return this.validate(migrated);
    } catch (error) {
      return failureResult(
        new ValidationError(
          `Migration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          "version",
          data.version
        )
      );
    }
  }

  // ─── Private validation helpers ───────────────────────────────────────────────

  private validateField(
    data: unknown,
    field: string,
    expectedType: string
  ): { valid: boolean; error?: ValidationError } {
    const value = (data as Record<string, unknown>)[field];
    if (value === undefined) {
      return { valid: false, error: new ValidationError(`Missing required field: ${field}`, field) };
    }
    if (typeof value !== expectedType) {
      return {
        valid: false,
        error: new ValidationError(
          `Field ${field} must be of type ${expectedType}`,
          field,
          value
        ),
      };
    }
    return { valid: true };
  }

  private validatePlayer(player: unknown): { valid: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    if (!player || typeof player !== "object") {
      errors.push(new ValidationError("Player data is required"));
      return { valid: false, errors };
    }

    const p = player as Record<string, unknown>;
    if (typeof p.id !== "string" || !p.id) {
      errors.push(new ValidationError("Player ID is required", "player.id"));
    }
    if (typeof p.name !== "string" || !p.name) {
      errors.push(new ValidationError("Player name is required", "player.name"));
    }

    return { valid: errors.length === 0, errors };
  }

  private validateProgression(progression: unknown): { valid: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    if (!progression || typeof progression !== "object") {
      errors.push(new ValidationError("Progression data is required"));
      return { valid: false, errors };
    }

    const pg = progression as Record<string, unknown>;
    if (typeof pg.xp !== "number" || pg.xp < 0) {
      errors.push(new ValidationError("XP must be a non-negative number", "progression.xp"));
    }

    return { valid: errors.length === 0, errors };
  }

  private validateFlashcards(flashcards: unknown): { valid: boolean; errors: ValidationError[] } {
    if (!flashcards || typeof flashcards !== "object") {
      return { valid: false, errors: [new ValidationError("Flashcard data is required")] };
    }
    return { valid: true, errors: [] };
  }

  private validateDialogues(dialogues: unknown): { valid: boolean; errors: ValidationError[] } {
    if (!dialogues || typeof dialogues !== "object") {
      return { valid: false, errors: [new ValidationError("Dialogue data is required")] };
    }
    return { valid: true, errors: [] };
  }

  private validateGame(game: unknown): { valid: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    if (!game || typeof game !== "object") {
      errors.push(new ValidationError("Game data is required"));
      return { valid: false, errors };
    }

    const g = game as Record<string, unknown>;
    if (g.playerPosition && typeof g.playerPosition === "object") {
      const pos = g.playerPosition as Record<string, unknown>;
      if (
        typeof pos.x !== "number" ||
        typeof pos.y !== "number" ||
        typeof pos.z !== "number"
      ) {
        errors.push(new ValidationError("Invalid player position", "game.playerPosition"));
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private validateMetadata(metadata: unknown): { valid: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    if (!metadata || typeof metadata !== "object") {
      errors.push(new ValidationError("Metadata is required"));
      return { valid: false, errors };
    }

    return { valid: errors.length === 0, errors };
  }

  // ─── Private sanitize helpers ────────────────────────────────────────────────

  private sanitizePlayer(player: unknown): PlayerSaveData {
    if (!player || typeof player !== "object") {
      return {
        id: "unknown",
        name: "Player",
        createdAt: Date.now(),
        settings: {
          locale: "en",
          soundEnabled: true,
          musicVolume: 0.7,
          sfxVolume: 1.0,
          difficulty: "medium",
          accessibility: {
            reduceMotion: false,
            highContrast: false,
            largeText: false,
            colorBlindMode: "none",
          },
        },
      };
    }

    const p = player as Record<string, unknown>;
    return {
      id: typeof p.id === "string" ? p.id : "unknown",
      name: typeof p.name === "string" ? p.name : "Player",
      avatar: typeof p.avatar === "string" ? p.avatar : undefined,
      createdAt: typeof p.createdAt === "number" ? p.createdAt : Date.now(),
      settings: this.sanitizeSettings(p.settings),
    };
  }

  private sanitizeSettings(settings: unknown): PlayerSettings {
    if (!settings || typeof settings !== "object") {
      return {
        locale: "en",
        soundEnabled: true,
        musicVolume: 0.7,
        sfxVolume: 1.0,
        difficulty: "medium",
        accessibility: {
          reduceMotion: false,
          highContrast: false,
          largeText: false,
          colorBlindMode: "none",
        },
      };
    }

    const s = settings as Record<string, unknown>;
    return {
      locale: ["en", "vi", "ja", "zh"].includes(s.locale as string) ? s.locale as "en" : "en",
      soundEnabled: typeof s.soundEnabled === "boolean" ? s.soundEnabled : true,
      musicVolume: typeof s.musicVolume === "number" ? Math.max(0, Math.min(1, s.musicVolume)) : 0.7,
      sfxVolume: typeof s.sfxVolume === "number" ? Math.max(0, Math.min(1, s.sfxVolume)) : 1.0,
      difficulty: ["easy", "medium", "hard"].includes(s.difficulty as string) ? s.difficulty as "medium" : "medium",
      accessibility: this.sanitizeAccessibility(s.accessibility),
    };
  }

  private sanitizeAccessibility(access: unknown): PlayerSettings["accessibility"] {
    if (!access || typeof access !== "object") {
      return {
        reduceMotion: false,
        highContrast: false,
        largeText: false,
        colorBlindMode: "none",
      };
    }

    const a = access as Record<string, unknown>;
    return {
      reduceMotion: typeof a.reduceMotion === "boolean" ? a.reduceMotion : false,
      highContrast: typeof a.highContrast === "boolean" ? a.highContrast : false,
      largeText: typeof a.largeText === "boolean" ? a.largeText : false,
      colorBlindMode: ["none", "protanopia", "deuteranopia", "tritanopia"].includes(a.colorBlindMode as string)
        ? (a.colorBlindMode as "none")
        : "none",
    };
  }

  private sanitizeProgression(progression: unknown): ProgressionSaveData {
    if (!progression || typeof progression !== "object") {
      return {
        level: { currentLevel: 1, title: "Beginner" },
        xp: 0,
        lifetimeXP: 0,
        achievements: {},
        cardMastery: {},
        npcMastery: {},
        stats: {
          totalQuizzesTaken: 0,
          totalCorrectAnswers: 0,
          totalWrongAnswers: 0,
          currentStreak: 0,
          longestStreak: 0,
          highestCombo: 0,
          totalTimeSpentMs: 0,
        },
        daily: {
          date: new Date().toISOString().split("T")[0],
          quizzesTaken: 0,
          correctAnswers: 0,
          xpEarned: 0,
        },
      };
    }

    const pg = progression as Record<string, unknown>;
    return {
      level: pg.level && typeof pg.level === "object"
        ? (pg.level as Record<string, unknown>)
        : { currentLevel: 1, title: "Beginner" },
      xp: typeof pg.xp === "number" ? pg.xp : 0,
      lifetimeXP: typeof pg.lifetimeXP === "number" ? pg.lifetimeXP : 0,
      achievements: pg.achievements && typeof pg.achievements === "object" ? pg.achievements as Record<string, number> : {},
      cardMastery: pg.cardMastery && typeof pg.cardMastery === "object" ? pg.cardMastery as Record<string, unknown> : {},
      npcMastery: pg.npcMastery && typeof pg.npcMastery === "object" ? pg.npcMastery as Record<string, unknown> : {},
      stats: this.sanitizeStats(pg.stats),
      daily: this.sanitizeDaily(pg.daily),
    } as unknown as ProgressionSaveData;
  }

  private sanitizeStats(stats: unknown): ProgressionSaveData["stats"] {
    if (!stats || typeof stats !== "object") {
      return {
        totalQuizzesTaken: 0,
        totalCorrectAnswers: 0,
        totalWrongAnswers: 0,
        currentStreak: 0,
        longestStreak: 0,
        highestCombo: 0,
        totalTimeSpentMs: 0,
      };
    }

    const s = stats as Record<string, unknown>;
    return {
      totalQuizzesTaken: Math.max(0, typeof s.totalQuizzesTaken === "number" ? s.totalQuizzesTaken : 0),
      totalCorrectAnswers: Math.max(0, typeof s.totalCorrectAnswers === "number" ? s.totalCorrectAnswers : 0),
      totalWrongAnswers: Math.max(0, typeof s.totalWrongAnswers === "number" ? s.totalWrongAnswers : 0),
      currentStreak: Math.max(0, typeof s.currentStreak === "number" ? s.currentStreak : 0),
      longestStreak: Math.max(0, typeof s.longestStreak === "number" ? s.longestStreak : 0),
      highestCombo: Math.max(0, typeof s.highestCombo === "number" ? s.highestCombo : 0),
      totalTimeSpentMs: Math.max(0, typeof s.totalTimeSpentMs === "number" ? s.totalTimeSpentMs : 0),
    };
  }

  private sanitizeDaily(daily: unknown): ProgressionSaveData["daily"] {
    const today = new Date().toISOString().split("T")[0];
    if (!daily || typeof daily !== "object") {
      return { date: today, quizzesTaken: 0, correctAnswers: 0, xpEarned: 0 };
    }

    const d = daily as Record<string, unknown>;
    return {
      date: typeof d.date === "string" ? d.date : today,
      quizzesTaken: Math.max(0, typeof d.quizzesTaken === "number" ? d.quizzesTaken : 0),
      correctAnswers: Math.max(0, typeof d.correctAnswers === "number" ? d.correctAnswers : 0),
      xpEarned: Math.max(0, typeof d.xpEarned === "number" ? d.xpEarned : 0),
    };
  }

  private sanitizeFlashcards(flashcards: unknown): FlashcardSaveData {
    if (!flashcards || typeof flashcards !== "object") {
      return {
        lastSetId: null,
        lastSubSetId: null,
        recentSets: [],
        studyHistory: [],
      };
    }

    const fc = flashcards as Record<string, unknown>;
    return {
      lastSetId: typeof fc.lastSetId === "string" ? fc.lastSetId : null,
      lastSubSetId: typeof fc.lastSubSetId === "string" ? fc.lastSubSetId : null,
      recentSets: Array.isArray(fc.recentSets) ? fc.recentSets.filter((s): s is string => typeof s === "string") : [],
      studyHistory: Array.isArray(fc.studyHistory) ? fc.studyHistory : [],
    };
  }

  private sanitizeDialogues(dialogues: unknown): DialogueSaveData {
    if (!dialogues || typeof dialogues !== "object") {
      return { completedDialogues: [], npcStates: {} };
    }

    const d = dialogues as Record<string, unknown>;
    return {
      completedDialogues: Array.isArray(d.completedDialogues)
        ? d.completedDialogues.filter((s): s is string => typeof s === "string")
        : [],
      npcStates: d.npcStates && typeof d.npcStates === "object" ? d.npcStates as Record<string, NPCStateSave> : {},
    };
  }

  private sanitizeGame(game: unknown): GameSaveData {
    if (!game || typeof game !== "object") {
      return {
        playerPosition: { x: 0, y: 0, z: 0 },
        playerRotation: 0,
        unlockedAreas: ["starting-area"],
        discoveredSecrets: [],
        worldTime: 0,
      };
    }

    const g = game as Record<string, unknown>;
    const pos = g.playerPosition as Record<string, unknown> | undefined;
    return {
      playerPosition: {
        x: typeof pos?.x === "number" ? pos.x : 0,
        y: typeof pos?.y === "number" ? pos.y : 0,
        z: typeof pos?.z === "number" ? pos.z : 0,
      },
      playerRotation: typeof g.playerRotation === "number" ? g.playerRotation : 0,
      unlockedAreas: Array.isArray(g.unlockedAreas)
        ? g.unlockedAreas.filter((s): s is string => typeof s === "string")
        : ["starting-area"],
      discoveredSecrets: Array.isArray(g.discoveredSecrets)
        ? g.discoveredSecrets.filter((s): s is string => typeof s === "string")
        : [],
      worldTime: typeof g.worldTime === "number" ? g.worldTime : 0,
    };
  }

  private sanitizeMetadata(metadata: unknown): SaveMetadata {
    const now = Date.now();
    if (!metadata || typeof metadata !== "object") {
      return {
        createdAt: now,
        modifiedAt: now,
        saveDuration: 0,
        deviceId: "unknown",
        platform: "web",
      };
    }

    const m = metadata as Record<string, unknown>;
    return {
      createdAt: typeof m.createdAt === "number" ? m.createdAt : now,
      modifiedAt: typeof m.modifiedAt === "number" ? m.modifiedAt : now,
      saveDuration: typeof m.saveDuration === "number" ? m.saveDuration : 0,
      deviceId: typeof m.deviceId === "string" ? m.deviceId : "unknown",
      platform: ["web", "mobile", "desktop"].includes(m.platform as string)
        ? (m.platform as "web")
        : "web",
    };
  }

  // ─── Migration helpers ──────────────────────────────────────────────────────

  private migrateTo100(data: SaveData): SaveData {
    // Example migration - add any 0.x to 1.0.0 changes here
    return {
      ...data,
      // Ensure all required fields exist
      flashcards: data.flashcards || { lastSetId: null, lastSubSetId: null, recentSets: [], studyHistory: [] },
      dialogues: data.dialogues || { completedDialogues: [], npcStates: {} },
      game: data.game || {
        playerPosition: { x: 0, y: 0, z: 0 },
        playerRotation: 0,
        unlockedAreas: ["starting-area"],
        discoveredSecrets: [],
        worldTime: 0,
      },
    };
  }

  private isVersionLessThan(version: string, compareTo: string): boolean {
    const v1Parts = version.split(".").map(Number);
    const v2Parts = compareTo.split(".").map(Number);

    for (let i = 0; i < 3; i++) {
      const v1 = v1Parts[i] || 0;
      const v2 = v2Parts[i] || 0;
      if (v1 < v2) return true;
      if (v1 > v2) return false;
    }

    return false;
  }
}

/**
 * Singleton instance
 */
let instance: ValidationService | null = null;

export function getValidationService(): ValidationService {
  if (!instance) {
    instance = new ValidationService();
  }
  return instance;
}
