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
