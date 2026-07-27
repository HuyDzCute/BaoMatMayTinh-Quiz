/**
 * Async loader cho flashcard data — gom tất cả built-in sets vào 1 call.
 * Lazy-loads theo từng module để tránh ship ~600 KB JS vào initial bundle.
 *
 * Tất cả consumer phải dùng `loadBuiltinFlashcardSets()` thay vì import trực
 * tiếp `builtinFlashcardSets` từ `lib/flashcards-data.ts`.
 */

import type { FlashcardSet } from "./types";

type Loader = () => Promise<FlashcardSet[]>;

const loaders: Loader[] = [
  () => import("./flashcards-zh-food").then((m) => m.builtinZhFoodSets),
  () => import("./oxford-3000").then((m) => m.builtinOxfordSets),
  () => import("./flashcards-paraphrasing").then((m) => m.builtinParaphrasingSets),
  () => import("./flashcards-ielts-vocab").then((m) => m.builtinIeltsVocabSets),
];

const CORE_SETS: FlashcardSet[] = [
  {
    id: "builtin:ielts-100-core",
    name: "IELTS 100 từ vựng cốt lõi",
    description: "100 từ vựng xuất hiện nhiều nhất trong IELTS Academic Reading & Writing",
    icon: "globe",
    color: "#2563eb",
    builtin: true,
    cards: [],
  },
];

/** Trả về built-in flashcard sets — load song song các chunk. */
export async function loadBuiltinFlashcardSets(): Promise<FlashcardSet[]> {
  const chunks = await Promise.all(loaders.map((l) => l()));
  return [...chunks.flat(), ...CORE_SETS];
}

/** Synchronous accessor — chỉ trả core sets khi chưa load xong async. */
export function getCoreFlashcardSets(): FlashcardSet[] {
  return CORE_SETS;
}
