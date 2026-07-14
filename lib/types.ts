export type AnswerType =
  | "mcq"           // 4-choice single correct
  | "matching"      // match items from a list to options A-E
  | "summary";      // fill-in-the-blank summary

export interface Question {
  id: string;
  question: string;
  /** MCQ option list (4 choices). For matching/summary types this is a
   *  fallback and not used by the renderer — those types use `matchOptions`. */
  answers: string[];
  correct?: number | string;
  explanation?: string;
  /** Optional IELTS-style passage / context rendered above the question (Reading). */
  passage?: string;
  /** Answer type. Default: "mcq". */
  type?: AnswerType;

  // ── matching ──────────────────────────────────────────────────────────
  /** Items to match against option list (e.g. "We changed our farm…"). */
  matchItems?: string[];
  /** Fixed options displayed in the render (e.g. ["A. Graham Robertson", …]). */
  matchOptions?: string[];
  /** Correct option letter for each matchItem (e.g. ["B","E","C","D"]). */
  matchCorrect?: string[];

  // ── summary ──────────────────────────────────────────────────────────
  /** Blanks to fill — one word per answer. */
  summaryBlank?: number;
  summaryText?: string;
  summaryCorrect?: string[];
}

export type QuizSectionType = "reading" | "speaking";

export interface QuizSection {
  id: string;
  name: string;
  type: QuizSectionType;
  /** Short tagline shown in the selector card. */
  description: string;
  /** Long instruction text shown on the pre-quiz modal & inside the test. */
  instructions: string;
  /** Duration in minutes (used by IELTS-style timer). */
  duration: number;
  /** Optional shared passage shown above all questions in the section (Reading). */
  passage?: string;
  questions: Question[];
}

export interface QuizSet {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  questions: Question[];
  /** Optional explicit sub-sections. When present, the selector renders one
   *  card per section instead of auto-chunking by 20 questions. */
  sections?: QuizSection[];
}

export interface QuizResult {
  id: string;
  playerName: string;
  setId: string;
  setName: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  percentage: number;
  answers: (number | string)[];
  timeSpent: number;
  date: string;
  /** IELTS-specific: which sub-section this result came from. */
  sectionType?: QuizSectionType;
  /**
   * IELTS Speaking: per-question recordings as base64 data URLs (audio/webm
   * or audio/mp4 etc.). Each entry corresponds to a prompt; `undefined`
   * means the candidate did not record that prompt.
   */
  speakingAnswers?: (string | undefined)[];
}

export interface LeaderboardEntry {
  playerName: string;
  score: number;
  percentage: number;
  setName: string;
  date: string;
  uid?: string;
}

// ─────────────────────────────────────────
//   Flashcard (Quizlet-style vocabulary learning)
// ─────────────────────────────────────────

/** Difficulty bucket used by the simple SRS scheduler. */
export type FlashcardBucket = "new" | "learning" | "known";

export interface Flashcard {
  id: string;
  /** Term shown on the front (e.g. "ephemeral"). */
  front: string;
  /** Definition / translation shown on the back. */
  back: string;
  /** Optional IPA pronunciation. */
  pronunciation?: string;
  /** Optional example sentence. */
  example?: string;
}

/** A user-importable vocabulary set (e.g. "IELTS 5000 - 100 từ đầu tiên"). */
export interface FlashcardSet {
  /** Stable identifier; built-in sets use a `builtin:` prefix, user sets
   *  use a `user:` prefix, imported sets use `import:`. */
  id: string;
  name: string;
  description: string;
  /** Lucide icon name (e.g. "book-open"). */
  icon: string;
  /** Accent color (hex). */
  color: string;
  cards: Flashcard[];
  /** `true` for seeded sets shipped in `lib/flashcards-data.ts`; `false` for
   *  user-created / imported sets stored in localStorage. */
  builtin?: boolean;
}

/** Per-card progress (the SRS state). Stored under
 *  `qthtm_flashcard_progress` keyed by `${setId}::${cardId}`.
 *
 *  Uses the SM-2 spaced-repetition algorithm:
 *    - `easeFactor` starts at 2.5 and shifts on each rating (min 1.3).
 *    - `interval` is the number of days until the next review.
 *    - `repetitions` is the number of consecutive successful reviews.
 *    - `bucket` is a derived display field (new / learning / known).
 */
export interface FlashcardProgress {
  cardId: string;
  bucket: FlashcardBucket;
  /** Total times this card was reviewed. */
  reviews: number;
  /** Times the user rated it as correct/known. */
  correct: number;
  /** ISO timestamp of last review (undefined if never reviewed). */
  lastReviewedAt?: string;
  /** When set, the card is scheduled to be re-shown on this ISO date. */
  nextReviewAt?: string;

  // ── SM-2 state ────────────────────────────────────────────────────────
  /** Ease factor, 1.3 – 2.5+ (default 2.5). Higher = easier card. */
  easeFactor?: number;
  /** Current interval in days until next review. */
  interval?: number;
  /** Consecutive successful ("good"/"easy") reviews. Resets on "again". */
  repetitions?: number;
  /** ISO date of when this card is next due. Same as nextReviewAt for clarity. */
  dueAt?: string;
}

export interface FlashcardStudyState {
  /** Cards the user is currently studying — a queue, not a stored artifact. */
  queue: string[];
  /** Index into `queue`. */
  currentIndex: number;
  /** ISO timestamp the user opened the study session. */
  startedAt: string;
}

export interface QuizState {
  setId: string;
  setName: string;
  questions: Question[];
  currentIndex: number;
  answers: (number | string)[];
  startTime: number;
  playerName: string;
  /** IELTS-specific: which sub-section this state belongs to. */
  sectionType?: QuizSectionType;
  /**
   * IELTS Speaking: per-question recordings as base64 data URLs (audio).
   * Each entry corresponds to a prompt; `undefined` means no recording yet.
   */
  speakingAnswers?: (string | undefined)[];
}
