/**
 * Save Data Types
 *
 * Phase 1: Core Infrastructure
 * Complete save data structure for persistence
 */

/**
 * Current save data version
 */
export const CURRENT_SAVE_VERSION = "1.0.0";

/**
 * Complete save data structure
 */
export interface SaveData {
  version: string;
  player: PlayerSaveData;
  progression: ProgressionSaveData;
  flashcards: FlashcardSaveData;
  dialogues: DialogueSaveData;
  game: GameSaveData;
  metadata: SaveMetadata;
}

/**
 * Player profile data
 */
export interface PlayerSaveData {
  id: string;
  name: string;
  avatar?: string;
  createdAt: number;
  settings: PlayerSettings;
}

/**
 * Player game settings
 */
export interface PlayerSettings {
  locale: Locale;
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  difficulty: Difficulty;
  accessibility: AccessibilitySettings;
}

/**
 * Supported locales
 */
export type Locale = "en" | "vi" | "ja" | "zh";

/**
 * Difficulty levels
 */
export type Difficulty = "easy" | "medium" | "hard";

/**
 * Accessibility options
 */
export interface AccessibilitySettings {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  colorBlindMode: ColorBlindMode;
}

/**
 * Color blind modes
 */
export type ColorBlindMode = "none" | "protanopia" | "deuteranopia" | "tritanopia";

/**
 * Default player settings
 */
export const DEFAULT_PLAYER_SETTINGS: PlayerSettings = {
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

/**
 * Progression system data
 */
export interface ProgressionSaveData {
  level: PlayerLevelSave;
  xp: number;
  lifetimeXP: number;
  achievements: Record<string, number>;
  cardMastery: Record<string, CardMasterySave>;
  npcMastery: Record<string, NPCMasterySave>;
  stats: GameplayStatsSave;
  daily: DailyStatsSave;
}

/**
 * Simplified level data for saves
 */
export interface PlayerLevelSave {
  currentLevel: number;
  title: string;
}

/**
 * Card mastery for saves
 */
export interface CardMasterySave {
  timesReviewed: number;
  timesCorrect: number;
  accuracy: number;
  currentLevel: MasteryLevel;
  lastReviewed: number;
}

/**
 * Card mastery levels
 */
export type MasteryLevel = "new" | "learning" | "reviewing" | "mastered";

/**
 * NPC mastery for saves
 */
export interface NPCMasterySave {
  interactions: number;
  quizzesCompleted: number;
  perfectQuizzes: number;
  masteryLevel: number;
}

/**
 * Gameplay stats for saves
 */
export interface GameplayStatsSave {
  totalQuizzesTaken: number;
  totalCorrectAnswers: number;
  totalWrongAnswers: number;
  currentStreak: number;
  longestStreak: number;
  highestCombo: number;
  totalTimeSpentMs: number;
}

/**
 * Daily stats for saves
 */
export interface DailyStatsSave {
  date: string;
  quizzesTaken: number;
  correctAnswers: number;
  xpEarned: number;
}

/**
 * Flashcard system data
 */
export interface FlashcardSaveData {
  lastSetId: string | null;
  lastSubSetId: string | null;
  recentSets: string[];
  studyHistory: StudyHistoryEntry[];
}

/**
 * Study history entry
 */
export interface StudyHistoryEntry {
  setId: string;
  subSetId: string;
  completedAt: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpentMs: number;
}

/**
 * Dialogue system data
 */
export interface DialogueSaveData {
  completedDialogues: string[];
  npcStates: Record<string, NPCStateSave>;
}

/**
 * NPC conversation state
 */
export interface NPCStateSave {
  dialogueTreeId: string;
  currentNodeId: string;
  flags: Record<string, boolean>;
  completedAt: number | null;
}

/**
 * Game world state
 */
export interface GameSaveData {
  playerPosition: Position3D;
  playerRotation: number;
  unlockedAreas: string[];
  discoveredSecrets: string[];
  worldTime: number;
}

/**
 * 3D position
 */
export interface Position3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Save metadata
 */
export interface SaveMetadata {
  createdAt: number;
  modifiedAt: number;
  saveDuration: number;
  deviceId: string;
  platform: Platform;
}

/**
 * Supported platforms
 */
export type Platform = "web" | "mobile" | "desktop";

/**
 * Create default save data
 */
export function createDefaultSaveData(
  playerId: string,
  playerName: string,
  deviceId: string
): SaveData {
  const now = Date.now();
  return {
    version: CURRENT_SAVE_VERSION,
    player: {
      id: playerId,
      name: playerName,
      createdAt: now,
      settings: { ...DEFAULT_PLAYER_SETTINGS },
    },
    progression: {
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
    },
    flashcards: {
      lastSetId: null,
      lastSubSetId: null,
      recentSets: [],
      studyHistory: [],
    },
    dialogues: {
      completedDialogues: [],
      npcStates: {},
    },
    game: {
      playerPosition: { x: 0, y: 0, z: 0 },
      playerRotation: 0,
      unlockedAreas: ["starting-area"],
      discoveredSecrets: [],
      worldTime: 0,
    },
    metadata: {
      createdAt: now,
      modifiedAt: now,
      saveDuration: 0,
      deviceId,
      platform: "web",
    },
  };
}
