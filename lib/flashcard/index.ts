/**
 * Flashcard System - Public API
 * 
 * Feature 12: Flashcard Integration
 * 
 * Clean Architecture Layers:
 * 
 * Domain Layer:
 *   - types.ts: Core entities (FlashcardItem, QuizQuestion, QuizSession)
 * 
 * Application Layer:
 *   - quiz-service.ts: Business logic (QuizService)
 * 
 * Infrastructure Layer:
 *   - storage.ts: Persistence (StorageAdapter, ProgressManager)
 * 
 * Presentation Layer:
 *   - hooks.ts: React state management
 *   - components.tsx: UI components
 * 
 * Usage:
 * 
 * ```tsx
 * // Import types
 * import type { FlashcardItem, QuizQuestion, QuizResult } from "@/lib/flashcard";
 * 
 * // Import services
 * import { QuizService, InMemoryCardRepository } from "@/lib/flashcard";
 * 
 * // Import hooks
 * import { useFlashcard, useSimpleQuiz, useFilteredCards } from "@/lib/flashcard";
 * 
 * // Import components
 * import { QuizCard, QuizProgress, QuizResults } from "@/lib/flashcard";
 * ```
 */

// ─── Domain Layer ────────────────────────────────────────────────────────────────

export type {
  FlashcardItem,
  Difficulty,
  QuizQuestion,
  QuizSession,
  QuizAnswer,
  QuizResult,
  QuizConfig,
  CardFilter,
  CardSort,
  ICardRepository,
  IStorageAdapter,
  IOptionFactory,
  CardProgress,
  MasteryLevel,
  UserStats,
  SerializableQuizState,
  QuizEvent,
  QuizEventType,
  CreateSessionOptions,
} from "./types";

export {
  createQuizSession,
  calculateAccuracy,
  calculateMasteryLevel,
  createDefaultUserStats,
  createDefaultCardProgress,
} from "./types";

// ─── Application Layer ───────────────────────────────────────────────────────────

export {
  QuizService,
  DefaultOptionFactory,
  InMemoryCardRepository,
  getQuizService,
  createQuizService,
} from "./quiz-service";

// ─── Infrastructure Layer ────────────────────────────────────────────────────────

export {
  LocalStorageAdapter,
  SessionStorageAdapter,
  ProgressManager,
  getStorageAdapter,
  getProgressManager,
  serializeQuizSession,
  deserializeQuizSession,
} from "./storage";

// ─── Presentation Layer ────────────────────────────────────────────────────────

export {
  useFlashcard,
  useSimpleQuiz,
  useFilteredCards,
  useMasterySummary,
} from "./hooks";

export type {
  FlashcardContextValue,
  UseSimpleQuizOptions,
} from "./hooks";

export {
  QuizCard,
  QuizProgress,
  QuizResults,
  QuizModalWrapper,
  OptionButton,
  DifficultyBadge,
} from "./components";

export type {
  OptionButtonProps,
  QuizCardProps,
  QuizProgressProps,
  QuizResultsProps,
  QuizModalWrapperProps,
  DifficultyBadgeProps,
} from "./components";
