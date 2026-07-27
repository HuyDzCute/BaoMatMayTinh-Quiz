import type { FlashcardSet } from "./types";
import { prefixSuffixCards, appearanceCards } from "./flashcards-ielts-vocab-1";
import { familyCards } from "./flashcards-ielts-vocab-2";
import { covidCards, crimeCards } from "./flashcards-ielts-vocab-3";
import { dailyLifeCards } from "./flashcards-ielts-vocab-4";
import { educationCards, environmentCards } from "./flashcards-ielts-vocab-5";
import { languagesCards, makeupCards } from "./flashcards-ielts-vocab-6";
import { moneyCards, povertyCards } from "./flashcards-ielts-vocab-7";
import { socialMediaCards, workCards } from "./flashcards-ielts-vocab-8";
import { writingTask1Cards } from "./flashcards-ielts-vocab-9";
import { globalEnvCards } from "./flashcards-ielts-vocab-10";
import { techSocietyCards } from "./flashcards-ielts-vocab-11";
import { lifeCultureCards } from "./flashcards-ielts-vocab-12";
import { workSocietyCards } from "./flashcards-ielts-vocab-13";

/**
 * VOCAB-IELTS — Tổng hợp từ vựng & cụm từ IELTS từ bộ 60+ PDF "IELTS Nguyễn Huyền"
 * (c:\Users\Administrator\Downloads\VOCABULARY - 2021\ và Vocabulary - ielts-nguyenhuyen\).
 *
 * Mỗi file PDF chủ đề → 1 bộ thẻ (FlashcardSet). Một số chủ đề gần nhau được
 * gộp lại để người học dễ quản lý.
 */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function buildIeltsSet(
  index: number,
  topicName: string,
  cards: { id: string; front: string; back: string; pronunciation?: string; example?: string }[],
  color: string,
  icon: string,
  description: string,
): FlashcardSet {
  const slug = slugify(topicName);
  return {
    id: `builtin:ielts-${String(index).padStart(2, "0")}-${slug}`,
    name: topicName,
    description,
    icon,
    color,
    builtin: true,
    cards,
  };
}

export const builtinIeltsVocabSets: FlashcardSet[] = [
  buildIeltsSet(
    1,
    "Prefix & Suffix",
    prefixSuffixCards,
    "#0ea5e9",
    "text-cursor-input",
    "Tiền tố & hậu tố trong tiếng Anh (anti-, re-, over-, mis-, co-, super-, ...-tion, -ment, -able, ...). Hữu ích cho mọi trình độ.",
  ),
  buildIeltsSet(
    2,
    "Appearance & Character Traits",
    appearanceCards,
    "#f59e0b",
    "user",
    "Từ vựng miêu tả ngoại hình và tính cách người — round face, slender, well-built, introverted, outgoing, bubbly, ... (Speaking Part 2).",
  ),
  buildIeltsSet(
    3,
    "Family & Relationships",
    familyCards,
    "#f97316",
    "users-round",
    "Từ vựng chủ đề Cohabitation + Family + Friendship (sống thử, máu mủ, sát cánh, tình bạn, ...).",
  ),
  buildIeltsSet(
    4,
    "Covid-19 & Health",
    covidCards,
    "#06b6d4",
    "heart-pulse",
    "Từ vựng về đại dịch COVID-19 và các thành ngữ sức khỏe (under the weather, pass out, wear off, ...).",
  ),
  buildIeltsSet(
    5,
    "Crime & Punishment",
    crimeCards,
    "#ef4444",
    "gavel",
    "Tội phạm và hình phạt — to commit a crime, capital punishment, rehabilitation, ... + thành ngữ (behind bars, turn a blind eye, ...).",
  ),
  buildIeltsSet(
    6,
    "Daily Life",
    dailyLifeCards,
    "#84cc16",
    "sun",
    "Daily Routines + Free Time — wake up, morning routine, free time activities, time idioms (time flies, once in a blue moon, ...).",
  ),
  buildIeltsSet(
    7,
    "Education",
    educationCards,
    "#22c55e",
    "graduation-cap",
    "Giáo dục — kindergarten, study abroad, drop out, learning idioms (bookworm, burn the midnight oil, ...).",
  ),
  buildIeltsSet(
    8,
    "Environment",
    environmentCards,
    "#10b981",
    "leaf",
    "Global Warming + GM Food + Plastic Pollution — carbon emissions, single-use plastics, GMOs, synonyms cho climate change.",
  ),
  buildIeltsSet(
    9,
    "Languages",
    languagesCards,
    "#0d9488",
    "languages",
    "Ngôn ngữ — minority languages, mother tongue, translation apps, ... (IELTS Writing Task 2).",
  ),
  buildIeltsSet(
    10,
    "Makeup & Beauty",
    makeupCards,
    "#ec4899",
    "sparkles",
    "Trang điểm & sản phẩm — lipstick, foundation, concealer + thành ngữ beauty (skin and bone, dressed to kill, ...).",
  ),
  buildIeltsSet(
    11,
    "Money & Finance",
    moneyCards,
    "#16a34a",
    "wallet",
    "Tiền bạc & tài chính — credit score, save for retirement, make ends meet, ... + thành ngữ (bread and butter, foot the bill, ...).",
  ),
  buildIeltsSet(
    12,
    "Poverty",
    povertyCards,
    "#a16207",
    "hand-heart",
    "Nghèo đói — extreme poverty, vicious cycle, malnutrition + phrases (scrape by, on the dole, ...).",
  ),
  buildIeltsSet(
    13,
    "Social Media",
    socialMediaCards,
    "#6366f1",
    "smartphone",
    "Mạng xã hội — stay connected, data breaches, addictive use + cách dùng khác (trigger, facilitate, marginalized, ...).",
  ),
  buildIeltsSet(
    14,
    "Work & Career",
    workCards,
    "#a855f7",
    "briefcase",
    "Công việc — productivity, sick leave, work from home + paraphrase clusters (employees ≈ staff, unemployment rates ≈ ..., ...).",
  ),
  buildIeltsSet(
    15,
    "Writing Task 1 (Process & Map)",
    writingTask1Cards,
    "#7c3aed",
    "file-pen",
    "IELTS Writing Task 1 — Process (man-made & natural), Map (population/roads/position/length/change) + bộ từ đồng nghĩa (the chart ≈ the line graph, ..., over a 10-year period ≈ over a period of 10 years, ...).",
  ),
  buildIeltsSet(
    16,
    "Global Environment",
    globalEnvCards,
    "#059669",
    "globe",
    "Môi trường toàn cầu — Air Pollution, Animals, Animal Testing, Animal Extinction, Water Pollution, World Hunger (causes, effects, solutions + collocations).",
  ),
  buildIeltsSet(
    17,
    "Technology & Society",
    techSocietyCards,
    "#6366f1",
    "cpu",
    "Công nghệ & xã hội — AI (benefits/dangers), Energy, Technology, Foreign Aid, Government Spending, Stress, Overpopulation.",
  ),
  buildIeltsSet(
    18,
    "Life & Culture",
    lifeCultureCards,
    "#ec4899",
    "palette",
    "Cuộc sống & văn hóa — City Life, Culture, Tourism, Transport, Housing & Architecture, Working from Home, Christmas, Tet Holiday, Sport & Exercise.",
  ),
  buildIeltsSet(
    19,
    "Work & Society",
    workSocietyCards,
    "#a855f7",
    "network",
    "Công việc & xã hội — Business & Money, Family Structure & Roles, Average Life Expectancy, Ageing Population, Health, Throwaway Society, Gap Between Rich & Poor.",
  ),
];

export function getBuiltinIeltsVocabSet(id: string): FlashcardSet | undefined {
  return builtinIeltsVocabSets.find((s) => s.id === id);
}
