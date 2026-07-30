/**
 * Flashcard System - Quiz Service
 * 
 * Feature 12: Flashcard Integration
 * 
 * Application Layer: Core business logic for quiz generation and management.
 * Follows Single Responsibility Principle - handles only quiz-related operations.
 */

import type {
  FlashcardItem,
  QuizQuestion,
  QuizSession,
  QuizResult,
  QuizAnswer,
  QuizConfig,
  CardFilter,
  ICardRepository,
  IOptionFactory,
  QuizEvent,
  QuizEventListener,
  Difficulty,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// OPTION FACTORY - Fisher-Yates Shuffle Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default option factory using Fisher-Yates shuffle algorithm
 * Ensures randomized distractors with no bias
 */
export class DefaultOptionFactory implements IOptionFactory {
  /**
   * Create quiz options with one correct answer and distractors
   * Uses Fisher-Yates shuffle for unbiased randomization
   */
  createOptions(correctAnswer: string, pool: FlashcardItem[], count: number): string[] {
    if (count < 2) {
      throw new Error("Option count must be at least 2");
    }

    // Get unique distractors (exclude correct answer)
    const distractors = pool
      .filter((card) => card.back !== correctAnswer)
      .map((card) => card.back)
      .filter((value, index, self) => self.indexOf(value) === index); // unique

    // Shuffle distractors
    const shuffledDistractors = this.shuffle(distractors);

    // Take required number of distractors
    const selectedDistractors = shuffledDistractors.slice(0, count - 1);

    // Ensure we have enough distractors
    if (selectedDistractors.length < count - 1) {
      throw new Error(
        `Not enough unique distractors: need ${count - 1}, got ${selectedDistractors.length}`
      );
    }

    // Combine with correct answer and shuffle
    const options = [correctAnswer, ...selectedDistractors];
    return this.shuffle(options);
  }

  /**
   * Fisher-Yates shuffle algorithm
   * Produces unbiased permutation in O(n) time
   */
  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD REPOSITORY - In-Memory Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * In-memory card repository
 * Implements ICardRepository for dependency inversion
 */
export class InMemoryCardRepository implements ICardRepository {
  private cards: Map<string, FlashcardItem>;

  constructor(cards: FlashcardItem[] = []) {
    this.cards = new Map();
    cards.forEach((card) => this.cards.set(card.id, card));
  }

  getAll(): FlashcardItem[] {
    return Array.from(this.cards.values());
  }

  getById(id: string): FlashcardItem | undefined {
    return this.cards.get(id);
  }

  getByFilter(filter: CardFilter): FlashcardItem[] {
    let results = this.getAll();

    // Filter by difficulty
    if (filter.difficulty) {
      const difficulties = Array.isArray(filter.difficulty)
        ? filter.difficulty
        : [filter.difficulty];
      results = results.filter((card) =>
        card.difficulty ? difficulties.includes(card.difficulty) : true
      );
    }

    // Filter by category
    if (filter.category) {
      const categories = Array.isArray(filter.category)
        ? filter.category
        : [filter.category];
      results = results.filter((card) =>
        card.category ? categories.includes(card.category) : false
      );
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      results = results.filter((card) =>
        card.tags ? filter.tags!.some((tag) => card.tags!.includes(tag)) : false
      );
    }

    // Filter by search term
    if (filter.search) {
      const search = filter.search.toLowerCase();
      results = results.filter(
        (card) =>
          card.front.toLowerCase().includes(search) ||
          card.back.toLowerCase().includes(search)
      );
    }

    // Exclude specific IDs
    if (filter.excludeIds && filter.excludeIds.length > 0) {
      const excludeSet = new Set(filter.excludeIds);
      results = results.filter((card) => !excludeSet.has(card.id));
    }

    // Exclude recently reviewed (if flag set)
    if (filter.recentlyReviewed) {
      const recentThreshold = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
      results = results.filter(
        (card) =>
          !card.lastReviewed || card.lastReviewed < recentThreshold
      );
    }

    // Apply limit
    if (filter.limit && filter.limit > 0) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  save(item: FlashcardItem): void {
    this.cards.set(item.id, item);
  }

  saveMany(items: FlashcardItem[]): void {
    items.forEach((card) => this.cards.set(card.id, card));
  }

  delete(id: string): void {
    this.cards.delete(id);
  }

  count(): number {
    return this.cards.size;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ SERVICE - Core Business Logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quiz Service - Core business logic for quiz operations
 * 
 * Responsibilities:
 * - Generate quiz questions from card pool
 * - Manage quiz session state
 * - Calculate results and scores
 * - Emit events for state changes
 */
export class QuizService {
  private repository: ICardRepository;
  private optionFactory: IOptionFactory;
  private eventListeners: Set<QuizEventListener>;
  private currentSession: QuizSession | null = null;

  constructor(
    repository: ICardRepository,
    optionFactory: IOptionFactory = new DefaultOptionFactory()
  ) {
    this.repository = repository;
    this.optionFactory = optionFactory;
    this.eventListeners = new Set();
  }

  // ─── Event System ─────────────────────────────────────────────────────────

  /**
   * Subscribe to quiz events
   * @returns Unsubscribe function
   */
  onEvent(listener: QuizEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: QuizEvent): void {
    this.eventListeners.forEach((listener) => listener(event));
  }

  // ─── Question Generation ───────────────────────────────────────────────────

  /**
   * Generate quiz questions based on configuration
   * Uses card repository for filtering and option factory for randomization
   */
  generateQuestions(config: QuizConfig): QuizQuestion[] {
    const questionCount = config.questionCount;

    // Get filtered cards
    const filter: CardFilter = {
      difficulty: config.difficulty === "mixed" ? undefined : config.difficulty,
      category: config.category,
      excludeIds: config.shuffleOptions ? undefined : [],
    };

    const availableCards = this.repository.getByFilter(filter);

    if (availableCards.length < 4) {
      throw new Error(
        `Need at least 4 cards for quiz, got ${availableCards.length}`
      );
    }

    // Shuffle cards for random selection
    const shuffledCards = this.shuffle([...availableCards]);
    const selectedCards = shuffledCards.slice(0, questionCount);

    // Generate questions
    const questions: QuizQuestion[] = [];
    const usedCardIds = new Set<string>();

    for (const card of selectedCards) {
      // Skip if already used
      if (usedCardIds.has(card.id)) continue;
      usedCardIds.add(card.id);

      // Get distractors from remaining cards
      const distractors = this.repository
        .getByFilter({
          excludeIds: [card.id, ...Array.from(usedCardIds)],
        })
        .slice(0, 50); // Limit pool for performance

      // Create options
      const options = this.optionFactory.createOptions(
        card.back,
        distractors,
        4 // Always 4 options
      );

      const correctIndex = options.indexOf(card.back);
      if (correctIndex === -1) continue; // Skip if something went wrong

      questions.push({
        id: `q_${card.id}_${Date.now()}`,
        card,
        options,
        correctIndex,
        difficulty: card.difficulty ?? "medium",
        topic: card.category,
      });
    }

    return questions;
  }

  /**
   * Generate questions with guaranteed variety
   * Ensures each card is used only once per session
   */
  generateQuestionsVaried(
    questionCount: number,
    options: {
      difficulty?: Difficulty | "mixed";
      category?: string;
      excludeIds?: string[];
    } = {}
  ): QuizQuestion[] {
    const filter: CardFilter = {
      difficulty: options.difficulty === "mixed" ? undefined : options.difficulty,
      category: options.category,
      excludeIds: options.excludeIds,
      limit: questionCount * 2, // Get extra cards for better variety
    };

    const availableCards = this.repository.getByFilter(filter);
    const shuffledCards = this.shuffle([...availableCards]);
    const selectedCards = shuffledCards.slice(0, questionCount);

    return selectedCards.map((card) => {
      const distractors = availableCards
        .filter((c) => c.id !== card.id)
        .slice(0, 20);

      const optionList = this.optionFactory.createOptions(
        card.back,
        distractors,
        4
      );

      return {
        id: `q_${card.id}_${Date.now()}`,
        card,
        options: optionList,
        correctIndex: optionList.indexOf(card.back),
        difficulty: card.difficulty ?? "medium",
        topic: card.category,
      };
    });
  }

  // ─── Session Management ─────────────────────────────────────────────────────

  /**
   * Start a new quiz session
   */
  startSession(config: QuizConfig): QuizSession {
    const questions = this.generateQuestions(config);

    this.currentSession = {
      id: `session_${Date.now()}`,
      questions,
      currentIndex: 0,
      answers: [],
      startTime: Date.now(),
      score: 0,
      maxScore: questions.length,
    };

    this.emit({
      type: "SESSION_START",
      timestamp: Date.now(),
      payload: { sessionId: this.currentSession.id },
    });

    return this.currentSession;
  }

  /**
   * Get current session
   */
  getCurrentSession(): QuizSession | null {
    return this.currentSession;
  }

  /**
   * Get current question
   */
  getCurrentQuestion(): QuizQuestion | null {
    if (!this.currentSession) return null;
    return (
      this.currentSession.questions[this.currentSession.currentIndex] ?? null
    );
  }

  /**
   * Record an answer
   */
  recordAnswer(selectedIndex: number, timeSpent: number): boolean {
    if (!this.currentSession) {
      throw new Error("No active quiz session");
    }

    const question = this.getCurrentQuestion();
    if (!question) {
      throw new Error("No current question");
    }

    const isCorrect = selectedIndex === question.correctIndex;

    const answer: QuizAnswer = {
      questionId: question.id,
      selectedIndex,
      correct: isCorrect,
      timeSpent,
    };

    this.currentSession.answers.push(answer);

    if (isCorrect) {
      this.currentSession.score++;
    }

    // Update card review metadata
    const card = question.card;
    card.lastReviewed = Date.now();
    card.reviewCount = (card.reviewCount ?? 0) + 1;
    this.repository.save(card);

    this.emit({
      type: "QUESTION_ANSWERED",
      timestamp: Date.now(),
      payload: { answer, isCorrect, totalScore: this.currentSession.score },
    });

    // Move to next question or end session
    this.currentSession.currentIndex++;

    if (this.currentSession.currentIndex >= this.currentSession.questions.length) {
      return this.endSession();
    }

    return isCorrect;
  }

  /**
   * End the current session and calculate results
   */
  endSession(): boolean {
    if (!this.currentSession) {
      return false;
    }

    this.currentSession.endTime = Date.now();

    this.emit({
      type: "SESSION_END",
      timestamp: Date.now(),
      payload: {
        sessionId: this.currentSession.id,
        score: this.currentSession.score,
        totalQuestions: this.currentSession.questions.length,
      },
    });

    return this.currentSession.score >= this.currentSession.questions.length / 2;
  }

  /**
   * Get quiz results
   */
  getResults(): QuizResult | null {
    if (!this.currentSession || !this.currentSession.endTime) {
      return null;
    }

    const correctAnswers = this.currentSession.answers.filter(
      (a) => a.correct
    ).length;
    const totalTime = this.currentSession.endTime - this.currentSession.startTime;

    return {
      sessionId: this.currentSession.id,
      totalQuestions: this.currentSession.questions.length,
      correctAnswers,
      accuracy: Math.round((correctAnswers / this.currentSession.questions.length) * 100),
      score: this.currentSession.score,
      timeSpent: totalTime,
      answers: this.currentSession.answers,
      completedAt: this.currentSession.endTime,
    };
  }

  /**
   * Reset session for retry
   */
  resetSession(): void {
    if (!this.currentSession) return;

    this.currentSession.currentIndex = 0;
    this.currentSession.answers = [];
    this.currentSession.score = 0;
    this.currentSession.startTime = Date.now();
    this.currentSession.endTime = undefined;
  }

  // ─── Utility Methods ────────────────────────────────────────────────────────

  /**
   * Fisher-Yates shuffle
   */
  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Get card statistics
   */
  getCardStats(): {
    totalCards: number;
    byDifficulty: Record<Difficulty, number>;
    byCategory: Record<string, number>;
  } {
    const cards = this.repository.getAll();

    const byDifficulty: Record<Difficulty, number> = {
      easy: 0,
      medium: 0,
      hard: 0,
    };

    const byCategory: Record<string, number> = {};

    cards.forEach((card) => {
      if (card.difficulty) {
        byDifficulty[card.difficulty]++;
      }
      if (card.category) {
        byCategory[card.category] = (byCategory[card.category] ?? 0) + 1;
      }
    });

    return {
      totalCards: cards.length,
      byDifficulty,
      byCategory,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON INSTANCE
// ─────────────────────────────────────────────────────────────────────────────

let quizServiceInstance: QuizService | null = null;

/**
 * Get or create singleton quiz service instance
 */
export function getQuizService(): QuizService {
  if (!quizServiceInstance) {
    quizServiceInstance = new QuizService(new InMemoryCardRepository());
  }
  return quizServiceInstance;
}

/**
 * Create fresh quiz service with custom repository
 */
export function createQuizService(
  repository: ICardRepository,
  optionFactory?: IOptionFactory
): QuizService {
  quizServiceInstance = new QuizService(repository, optionFactory);
  return quizServiceInstance;
}
