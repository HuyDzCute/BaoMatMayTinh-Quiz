/**
 * Flashcard System - Type Definitions
 * 
 * Feature 12: Flashcard Integration
 * 
 * Architecture follows Clean Architecture principles:
 * - Domain Layer: Pure business entities (FlashcardItem, QuizQuestion)
 * - Application Layer: Use cases (QuizService, CardManager)
 * - Infrastructure Layer: Data sources, storage adapters
 * - Presentation Layer: React components
 */

import type { Locale } from "../dialogue/types";

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN LAYER - Pure Business Entities
// ─────────────────────────────────────────────────────────────────────────────

/** Flashcard item - core domain entity */
export interface FlashcardItem {
  id: string;
  front: string;           // English word
  back: string;           // Vietnamese meaning
  pronunciation?: string;  // IPA pronunciation
  example?: string;        // Example sentence
  difficulty?: Difficulty;
  category?: string;       // Topic/category
  tags?: string[];         // Additional metadata
  createdAt?: number;
  lastReviewed?: number;
  reviewCount?: number;
}

/** Difficulty level for spaced repetition */
export type Difficulty = "easy" | "medium" | "hard";

/** Quiz question generated from flashcard */
export interface QuizQuestion {
  id: string;
  card: FlashcardItem;
  options: string[];
  correctIndex: number;
  difficulty: Difficulty;
  topic?: string;
}

/** Quiz session state */
export interface QuizSession {
  id: string;
  questions: QuizQuestion[];
  currentIndex: number;
  answers: QuizAnswer[];
  startTime: number;
  endTime?: number;
  score: number;
  maxScore: number;
}

/** Individual answer record */
export interface QuizAnswer {
  questionId: string;
  selectedIndex: number;
  correct: boolean;
  timeSpent: number;
}

/** Quiz result summary */
export interface QuizResult {
  sessionId: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  score: number;
  timeSpent: number;
  answers: QuizAnswer[];
  completedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICATION LAYER - Use Cases & Services
// ─────────────────────────────────────────────────────────────────────────────

/** Quiz configuration options */
export interface QuizConfig {
  questionCount: number;
  difficulty?: Difficulty | "mixed";
  category?: string;
  shuffleOptions?: boolean;
  timeLimit?: number;  // ms per question (optional)
  locale?: Locale;
}

/** Quiz session factory options */
export interface CreateSessionOptions {
  config: QuizConfig;
  cardPool: FlashcardItem[];
  existingSession?: QuizSession;
}

/** Card filtering criteria */
export interface CardFilter {
  difficulty?: Difficulty | Difficulty[];
  category?: string | string[];
  tags?: string[];
  search?: string;
  limit?: number;
  excludeIds?: string[];
  recentlyReviewed?: boolean;
}

/** Card sorting options */
export interface CardSort {
  field: "difficulty" | "createdAt" | "lastReviewed" | "reviewCount" | "random";
  direction: "asc" | "desc";
}

/** Card repository interface (for dependency inversion) */
export interface ICardRepository {
  getAll(): FlashcardItem[];
  getById(id: string): FlashcardItem | undefined;
  getByFilter(filter: CardFilter): FlashcardItem[];
  save(item: FlashcardItem): void;
  saveMany(items: FlashcardItem[]): void;
  delete(id: string): void;
  count(): number;
}

// ─────────────────────────────────────────────────────────────────────────────
// INFRASTRUCTURE LAYER - Storage & Persistence
// ─────────────────────────────────────────────────────────────────────────────

/** Storage adapter interface */
export interface IStorageAdapter {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
  keys(): string[];
}

/** Progress tracking for mastery system */
export interface CardProgress {
  cardId: string;
  timesReviewed: number;
  timesCorrect: number;
  accuracy: number;
  lastReviewed: number;
  masteryLevel: MasteryLevel;
  nextReview: number;
  streak: number;
}

export type MasteryLevel = "new" | "learning" | "reviewing" | "mastered";

/** User statistics */
export interface UserStats {
  totalCardsLearned: number;
  totalQuizzesTaken: number;
  totalCorrectAnswers: number;
  totalTimeSpent: number;
  averageAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayedAt: number;
  level: number;
  experience: number;
}

/** Serializable quiz state for persistence */
export interface SerializableQuizState {
  currentSession: QuizSession | null;
  cardProgress: Record<string, CardProgress>;
  userStats: UserStats;
  lastQuizConfig: QuizConfig | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Option factory for creating quiz distractors */
export interface IOptionFactory {
  createOptions(correctAnswer: string, pool: FlashcardItem[], count: number): string[];
}

/** Event types for quiz state changes */
export type QuizEventType =
  | "SESSION_START"
  | "SESSION_END"
  | "QUESTION_ANSWERED"
  | "SESSION_PAUSED"
  | "SESSION_RESUMED"
  | "PROGRESS_UPDATED";

export interface QuizEvent {
  type: QuizEventType;
  timestamp: number;
  payload?: unknown;
}

/** Event listener function type */
export type QuizEventListener = (event: QuizEvent) => void;

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Create a new quiz session */
export function createQuizSession(
  questions: QuizQuestion[],
  config: QuizConfig
): QuizSession {
  return {
    id: generateSessionId(),
    questions,
    currentIndex: 0,
    answers: [],
    startTime: Date.now(),
    score: 0,
    maxScore: questions.length,
  };
}

/** Generate unique session ID */
function generateSessionId(): string {
  return `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Calculate quiz accuracy */
export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

/** Calculate mastery level based on accuracy and review count */
export function calculateMasteryLevel(
  accuracy: number,
  reviewCount: number
): MasteryLevel {
  if (reviewCount === 0) return "new";
  if (accuracy >= 90 && reviewCount >= 5) return "mastered";
  if (accuracy >= 70 && reviewCount >= 3) return "reviewing";
  return "learning";
}

/** Default user stats */
export function createDefaultUserStats(): UserStats {
  return {
    totalCardsLearned: 0,
    totalQuizzesTaken: 0,
    totalCorrectAnswers: 0,
    totalTimeSpent: 0,
    averageAccuracy: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastPlayedAt: 0,
    level: 1,
    experience: 0,
  };
}

/** Default card progress */
export function createDefaultCardProgress(cardId: string): CardProgress {
  return {
    cardId,
    timesReviewed: 0,
    timesCorrect: 0,
    accuracy: 0,
    lastReviewed: 0,
    masteryLevel: "new",
    nextReview: Date.now(),
    streak: 0,
  };
}
