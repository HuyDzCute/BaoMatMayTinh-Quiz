/**
 * WordRun3D — Game Data Module
 *
 * Lấy từ vựng từ flashcard source, build câu hỏi quiz.
 */
import type { FlashcardItem, QuizQuestion } from "./wordrun-types";
import { globalEnvCards } from "./flashcards-ielts-vocab-10";

const ALL_CARDS: FlashcardItem[] = globalEnvCards.map((c) => ({
  id: c.id,
  front: c.front,
  back: c.back,
  pronunciation: c.pronunciation,
  example: c.example,
}));

export const TOTAL_CARDS = ALL_CARDS.length;

// ─── Fisher-Yates shuffle ─────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Build N quiz questions ───────────────────────────────────────────────────
export function buildQuizQuestions(count: number): QuizQuestion[] {
  if (ALL_CARDS.length < 4) {
    throw new Error("WordRun: cần ít nhất 4 flashcard.");
  }

  const questions: QuizQuestion[] = [];
  const used = new Set<string>();

  while (questions.length < count && used.size < ALL_CARDS.length) {
    const pool = ALL_CARDS.filter((c) => !used.has(c.id));
    if (!pool.length) break;
    const card = pool[Math.floor(Math.random() * pool.length)];
    used.add(card.id);

    const distractors = shuffle(
      ALL_CARDS.filter((c) => c.id !== card.id),
    ).slice(0, 3);

    const opts = shuffle([card.back, ...distractors.map((d) => d.back)]);
    const correctIndex = opts.indexOf(card.back);
    if (correctIndex === -1) continue;

    questions.push({ card, options: opts, correctIndex });
  }

  return questions;
}
