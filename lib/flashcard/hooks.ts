/**
 * Flashcard System - React Hooks
 * 
 * Feature 12: Flashcard Integration
 * 
 * Presentation Layer: React hooks for state management
 * Follows Custom Hooks pattern - encapsulates quiz state logic
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  QuizService,
  InMemoryCardRepository,
  DefaultOptionFactory,
  getQuizService,
  createQuizService,
} from "./quiz-service";
import {
  getProgressManager,
  ProgressManager,
  getStorageAdapter,
} from "./storage";
import type {
  IStorageAdapter,
  FlashcardItem,
  QuizQuestion,
  QuizSession,
  QuizResult,
  QuizConfig,
  CardProgress,
  UserStats,
  Difficulty,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT & PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

export interface FlashcardContextValue {
  // Quiz state
  isQuizActive: boolean;
  currentQuestion: QuizQuestion | null;
  currentIndex: number;
  totalQuestions: number;
  score: number;
  session: QuizSession | null;
  
  // Progress
  cardProgress: Record<string, CardProgress>;
  userStats: UserStats;
  
  // Actions
  startQuiz: (config?: Partial<QuizConfig>) => void;
  submitAnswer: (selectedIndex: number) => boolean;
  nextQuestion: () => void;
  endQuiz: () => QuizResult | null;
  retryQuiz: () => void;
  
  // Utility
  getCardProgress: (cardId: string) => CardProgress;
  getUserStats: () => UserStats;
  resetProgress: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HOOK: useFlashcard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main flashcard hook for quiz functionality
 * Manages quiz state, progress tracking, and user statistics
 */
export function useFlashcard(
  cards: FlashcardItem[],
  initialConfig?: Partial<QuizConfig>
) {
  // Refs for service instances
  const quizServiceRef = useRef<QuizService | null>(null);
  const progressManagerRef = useRef<ProgressManager | null>(null);
  const storageRef = useRef<IStorageAdapter | null>(null);

  // Quiz state
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [cardProgress, setCardProgress] = useState<Record<string, CardProgress>>({});
  const [userStats, setUserStats] = useState<UserStats>({
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
  });

  // Initialize services
  useEffect(() => {
    // Create or get quiz service with card repository
    const repository = new InMemoryCardRepository(cards);
    quizServiceRef.current = createQuizService(repository, new DefaultOptionFactory());
    
    // Get progress manager
    progressManagerRef.current = getProgressManager();
    storageRef.current = getStorageAdapter();

    // Load saved progress
    if (progressManagerRef.current) {
      setCardProgress(progressManagerRef.current.getAllProgress());
      setUserStats(progressManagerRef.current.getUserStats());
    }
  }, [cards]);

  // Derived state
  const currentQuestion = useMemo(() => {
    if (!session) return null;
    return session.questions[session.currentIndex] ?? null;
  }, [session]);

  const currentIndex = session?.currentIndex ?? 0;
  const totalQuestions = session?.questions.length ?? 0;
  const score = session?.score ?? 0;

  // ─── Actions ─────────────────────────────────────────────────────────────

  /**
   * Start a new quiz
   */
  const startQuiz = useCallback((config?: Partial<QuizConfig>) => {
    const service = quizServiceRef.current;
    if (!service) return;

    const quizConfig: QuizConfig = {
      questionCount: config?.questionCount ?? 5,
      difficulty: config?.difficulty ?? "mixed",
      category: config?.category,
      shuffleOptions: config?.shuffleOptions ?? true,
      timeLimit: config?.timeLimit,
    };

    const newSession = service.startSession(quizConfig);
    setSession(newSession);
    setIsQuizActive(true);
  }, []);

  /**
   * Submit an answer
   */
  const submitAnswer = useCallback((selectedIndex: number): boolean => {
    const service = quizServiceRef.current;
    const progress = progressManagerRef.current;
    if (!service) return false;

    const question = service.getCurrentQuestion();
    if (!question) return false;

    const isCorrect = service.recordAnswer(selectedIndex, 0);

    // Update progress
    if (progress) {
      progress.updateCardProgress(question.card.id, isCorrect);
      setCardProgress(progress.getAllProgress());
    }

    // Update session state
    const updatedSession = service.getCurrentSession();
    if (updatedSession) {
      setSession({ ...updatedSession });
    }

    return isCorrect;
  }, []);

  /**
   * Move to next question (for delayed feedback)
   */
  const nextQuestion = useCallback(() => {
    const service = quizServiceRef.current;
    if (!service) return;

    const updatedSession = service.getCurrentSession();
    if (updatedSession) {
      setSession({ ...updatedSession });
    }
  }, []);

  /**
   * End the quiz and calculate results
   */
  const endQuiz = useCallback((): QuizResult | null => {
    const service = quizServiceRef.current;
    const progress = progressManagerRef.current;
    if (!service) return null;

    const success = service.endSession();
    const result = service.getResults();

    // Update user stats
    if (progress && result) {
      progress.updateUserStats({
        correctAnswers: result.correctAnswers,
        totalQuestions: result.totalQuestions,
        timeSpent: result.timeSpent,
        accuracy: result.accuracy,
      });
      setUserStats(progress.getUserStats());
    }

    setIsQuizActive(false);
    return result;
  }, []);

  /**
   * Retry the same quiz
   */
  const retryQuiz = useCallback(() => {
    const service = quizServiceRef.current;
    if (!service) return;

    service.resetSession();
    const updatedSession = service.getCurrentSession();
    if (updatedSession) {
      setSession({ ...updatedSession });
      setIsQuizActive(true);
    }
  }, []);

  /**
   * Get progress for a specific card
   */
  const getCardProgress = useCallback((cardId: string): CardProgress => {
    const progress = progressManagerRef.current;
    if (!progress) {
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
    return progress.getCardProgress(cardId);
  }, []);

  /**
   * Get user statistics
   */
  const getUserStats = useCallback((): UserStats => {
    const progress = progressManagerRef.current;
    if (!progress) return userStats;
    return progress.getUserStats();
  }, [userStats]);

  /**
   * Reset all progress
   */
  const resetProgress = useCallback(() => {
    const progress = progressManagerRef.current;
    if (progress) {
      progress.resetAll();
      setCardProgress({});
      setUserStats({
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
      });
    }
  }, []);

  return {
    isQuizActive,
    currentQuestion,
    currentIndex,
    totalQuestions,
    score,
    session,
    cardProgress,
    userStats,
    startQuiz,
    submitAnswer,
    nextQuestion,
    endQuiz,
    retryQuiz,
    getCardProgress,
    getUserStats,
    resetProgress,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMPLE QUIZ HOOK (for quick usage)
// ─────────────────────────────────────────────────────────────────────────────

export interface UseSimpleQuizOptions {
  questionCount?: number;
  difficulty?: Difficulty | "mixed";
  category?: string;
  onComplete?: (result: QuizResult) => void;
}

/**
 * Simple quiz hook for basic usage
 */
export function useSimpleQuiz(
  questions: QuizQuestion[],
  options: UseSimpleQuizOptions = {}
) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; selectedIndex: number; correct: boolean }[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const currentQuestion = questions[currentIndex] ?? null;
  const isLastQuestion = currentIndex >= questions.length - 1;
  const correctCount = answers.filter((a) => a.correct).length;
  const accuracy = questions.length > 0 ? Math.round((correctCount / currentIndex) * 100) : 0;

  const handleAnswer = useCallback((selectedIndex: number) => {
    if (currentQuestion === null || selectedAnswer !== null) return;

    const isCorrect = selectedIndex === currentQuestion.correctIndex;
    setSelectedAnswer(selectedIndex);
    setAnswers((prev) => [
      ...prev,
      { questionId: currentQuestion.id, selectedIndex, correct: isCorrect },
    ]);
  }, [currentQuestion, selectedAnswer]);

  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      setIsComplete(true);
      const result: QuizResult = {
        sessionId: `session_${Date.now()}`,
        totalQuestions: questions.length,
        correctAnswers: correctCount + (selectedAnswer === currentQuestion?.correctIndex ? 1 : 0),
        accuracy,
        score: correctCount + (selectedAnswer === currentQuestion?.correctIndex ? 1 : 0),
        timeSpent: 0,
        answers: [],
        completedAt: Date.now(),
      };
      options.onComplete?.(result);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
    }
  }, [isLastQuestion, correctCount, selectedAnswer, currentQuestion, accuracy, questions.length, options]);

  const handleRetry = useCallback(() => {
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setIsComplete(false);
  }, []);

  return {
    currentQuestion,
    currentIndex,
    totalQuestions: questions.length,
    isLastQuestion,
    selectedAnswer,
    isComplete,
    correctCount,
    accuracy,
    isCorrect: selectedAnswer !== null ? selectedAnswer === currentQuestion?.correctIndex : null,
    handleAnswer,
    handleNext,
    handleRetry,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD FILTERING HOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook for filtering and sorting cards
 */
export function useFilteredCards(
  cards: FlashcardItem[],
  filter: {
    search?: string;
    difficulty?: Difficulty | Difficulty[];
    category?: string | string[];
    tags?: string[];
    limit?: number;
  } = {}
) {
  return useMemo(() => {
    let filtered = [...cards];

    // Search filter
    if (filter.search) {
      const search = filter.search.toLowerCase();
      filtered = filtered.filter(
        (card) =>
          card.front.toLowerCase().includes(search) ||
          card.back.toLowerCase().includes(search)
      );
    }

    // Difficulty filter
    if (filter.difficulty) {
      const difficulties = Array.isArray(filter.difficulty)
        ? filter.difficulty
        : [filter.difficulty];
      filtered = filtered.filter(
        (card) => card.difficulty && difficulties.includes(card.difficulty)
      );
    }

    // Category filter
    if (filter.category) {
      const categories = Array.isArray(filter.category)
        ? filter.category
        : [filter.category];
      filtered = filtered.filter(
        (card) => card.category && categories.includes(card.category)
      );
    }

    // Tags filter
    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter(
        (card) => card.tags && filter.tags!.some((t) => card.tags!.includes(t))
      );
    }

    // Limit
    if (filter.limit && filter.limit > 0) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }, [cards, filter]);
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTERY SUMMARY HOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook for mastery summary statistics
 */
export function useMasterySummary(
  cards: FlashcardItem[],
  progress: Record<string, CardProgress>
) {
  return useMemo(() => {
    const summary = {
      total: cards.length,
      new: 0,
      learning: 0,
      reviewing: 0,
      mastered: 0,
      averageAccuracy: 0,
      totalReviews: 0,
    };

    let totalAccuracy = 0;
    let reviewedCount = 0;

    cards.forEach((card) => {
      const cardProgress = progress[card.id];
      if (!cardProgress || cardProgress.masteryLevel === "new") {
        summary.new++;
      } else {
        switch (cardProgress.masteryLevel) {
          case "learning":
            summary.learning++;
            break;
          case "reviewing":
            summary.reviewing++;
            break;
          case "mastered":
            summary.mastered++;
            break;
        }

        if (cardProgress.accuracy > 0) {
          totalAccuracy += cardProgress.accuracy;
          reviewedCount++;
        }
        summary.totalReviews += cardProgress.timesReviewed;
      }
    });

    summary.averageAccuracy = reviewedCount > 0
      ? Math.round(totalAccuracy / reviewedCount)
      : 0;

    return summary;
  }, [cards, progress]);
}
