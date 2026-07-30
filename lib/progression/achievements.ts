/**
 * Achievement Definitions
 *
 * Feature 13: Player Progression
 *
 * Data-driven achievement configuration
 * All achievements defined here - no hardcoded values in logic
 */

import type {
  AchievementDefinition,
  AchievementCategory,
  AchievementTier,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENT REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // ─── Vocabulary Category ────────────────────────────────────────────────────

  {
    id: "first_word",
    name: "First Steps",
    description: "Complete your first vocabulary quiz",
    category: "vocabulary",
    tier: "bronze",
    icon: "📚",
    requirement: { type: "quiz_count", count: 1 },
    rewards: { xp: 50, coins: 10 },
  },
  {
    id: "quiz_10",
    name: "Getting Started",
    description: "Complete 10 vocabulary quizzes",
    category: "vocabulary",
    tier: "bronze",
    icon: "📖",
    requirement: { type: "quiz_count", count: 10 },
    rewards: { xp: 200, coins: 50 },
  },
  {
    id: "quiz_50",
    name: "Dedicated Learner",
    description: "Complete 50 vocabulary quizzes",
    category: "vocabulary",
    tier: "silver",
    icon: "🎓",
    requirement: { type: "quiz_count", count: 50 },
    rewards: { xp: 1000, coins: 200, title: "Dedicated" },
  },
  {
    id: "quiz_100",
    name: "Vocabulary Master",
    description: "Complete 100 vocabulary quizzes",
    category: "vocabulary",
    tier: "gold",
    icon: "🏆",
    requirement: { type: "quiz_count", count: 100 },
    rewards: { xp: 2500, coins: 500, title: "Scholar" },
  },
  {
    id: "quiz_500",
    name: "Lexicon Legend",
    description: "Complete 500 vocabulary quizzes",
    category: "vocabulary",
    tier: "platinum",
    icon: "👑",
    requirement: { type: "quiz_count", count: 500 },
    rewards: { xp: 10000, coins: 2000, title: "Lexicon Legend" },
  },

  // ─── Perfect Quiz Achievements ─────────────────────────────────────────────

  {
    id: "perfect_first",
    name: "Flawless",
    description: "Get a perfect score on a quiz",
    category: "vocabulary",
    tier: "bronze",
    icon: "⭐",
    requirement: { type: "perfect_quiz_count", count: 1 },
    rewards: { xp: 100, coins: 25 },
  },
  {
    id: "perfect_10",
    name: "Perfectionist",
    description: "Get 10 perfect quiz scores",
    category: "vocabulary",
    tier: "silver",
    icon: "💫",
    requirement: { type: "perfect_quiz_count", count: 10 },
    rewards: { xp: 500, coins: 100, badge: "perfectionist" },
  },
  {
    id: "perfect_50",
    name: "Untouchable",
    description: "Get 50 perfect quiz scores",
    category: "vocabulary",
    tier: "gold",
    icon: "🌟",
    requirement: { type: "perfect_quiz_count", count: 50 },
    rewards: { xp: 2000, coins: 400, badge: "untouchable" },
  },

  // ─── Mastery Achievements ──────────────────────────────────────────────────

  {
    id: "master_10_cards",
    name: "Card Collector",
    description: "Master 10 vocabulary cards",
    category: "mastery",
    tier: "bronze",
    icon: "🃏",
    requirement: { type: "cards_mastered", count: 10 },
    rewards: { xp: 300, coins: 75 },
  },
  {
    id: "master_50_cards",
    name: "Card Shark",
    description: "Master 50 vocabulary cards",
    category: "mastery",
    tier: "silver",
    icon: "🦈",
    requirement: { type: "cards_mastered", count: 50 },
    rewards: { xp: 1500, coins: 300 },
  },
  {
    id: "master_100_cards",
    name: "Card Master",
    description: "Master 100 vocabulary cards",
    category: "mastery",
    tier: "gold",
    icon: "🎴",
    requirement: { type: "cards_mastered", count: 100 },
    rewards: { xp: 4000, coins: 800, badge: "card_master" },
  },
  {
    id: "master_all",
    name: "Complete Collection",
    description: "Master all available vocabulary cards",
    category: "mastery",
    tier: "platinum",
    icon: "🗂️",
    requirement: { type: "cards_mastered", count: 9999 }, // Dynamic based on total cards
    rewards: { xp: 20000, coins: 5000, title: "Master Collector" },
  },

  // ─── Streak Achievements ───────────────────────────────────────────────────

  {
    id: "streak_3",
    name: "On a Roll",
    description: "Maintain a 3-day learning streak",
    category: "streak",
    tier: "bronze",
    icon: "🔥",
    requirement: { type: "streak_days", count: 3 },
    rewards: { xp: 150, coins: 30 },
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    description: "Maintain a 7-day learning streak",
    category: "streak",
    tier: "silver",
    icon: "🔥",
    requirement: { type: "streak_days", count: 7 },
    rewards: { xp: 500, coins: 100, badge: "week_warrior" },
  },
  {
    id: "streak_30",
    name: "Monthly Master",
    description: "Maintain a 30-day learning streak",
    category: "streak",
    tier: "gold",
    icon: "🔥",
    requirement: { type: "streak_days", count: 30 },
    rewards: { xp: 3000, coins: 600, badge: "monthly_master" },
  },
  {
    id: "streak_100",
    name: "Unstoppable",
    description: "Maintain a 100-day learning streak",
    category: "streak",
    tier: "platinum",
    icon: "🔥",
    requirement: { type: "streak_days", count: 100 },
    rewards: { xp: 15000, coins: 3000, title: "Unstoppable" },
  },

  // ─── Level Achievements ───────────────────────────────────────────────────

  {
    id: "reach_level_5",
    name: "Rising Star",
    description: "Reach level 5",
    category: "exploration",
    tier: "bronze",
    icon: "⬆️",
    requirement: { type: "level_reached", level: 5 },
    rewards: { xp: 0, coins: 100 },
  },
  {
    id: "reach_level_10",
    name: "Dedicated Student",
    description: "Reach level 10",
    category: "exploration",
    tier: "silver",
    icon: "📚",
    requirement: { type: "level_reached", level: 10 },
    rewards: { xp: 0, coins: 250, title: "Student" },
  },
  {
    id: "reach_level_20",
    name: "Knowledge Seeker",
    description: "Reach level 20",
    category: "exploration",
    tier: "gold",
    icon: "🎓",
    requirement: { type: "level_reached", level: 20 },
    rewards: { xp: 0, coins: 500, badge: "knowledge_seeker" },
  },
  {
    id: "reach_level_30",
    name: "Language Expert",
    description: "Reach level 30",
    category: "exploration",
    tier: "platinum",
    icon: "🏅",
    requirement: { type: "level_reached", level: 30 },
    rewards: { xp: 0, coins: 1000, title: "Expert" },
  },

  // ─── XP Achievements ───────────────────────────────────────────────────────

  {
    id: "earn_1000_xp",
    name: "XP Hunter",
    description: "Earn 1,000 total XP",
    category: "exploration",
    tier: "bronze",
    icon: "⚡",
    requirement: { type: "total_xp", amount: 1000 },
    rewards: { coins: 50 },
  },
  {
    id: "earn_10000_xp",
    name: "XP Grinder",
    description: "Earn 10,000 total XP",
    category: "exploration",
    tier: "silver",
    icon: "⚡",
    requirement: { type: "total_xp", amount: 10000 },
    rewards: { coins: 200 },
  },
  {
    id: "earn_50000_xp",
    name: "XP Machine",
    description: "Earn 50,000 total XP",
    category: "exploration",
    tier: "gold",
    icon: "⚡",
    requirement: { type: "total_xp", amount: 50000 },
    rewards: { coins: 500, badge: "xp_machine" },
  },

  // ─── Combo Achievements ────────────────────────────────────────────────────

  {
    id: "combo_3",
    name: "Combo Starter",
    description: "Reach a 3x combo",
    category: "speed",
    tier: "bronze",
    icon: "💥",
    requirement: { type: "combo_reached", multiplier: 3 },
    rewards: { xp: 75 },
  },
  {
    id: "combo_5",
    name: "Combo Master",
    description: "Reach a 5x combo",
    category: "speed",
    tier: "silver",
    icon: "💥",
    requirement: { type: "combo_reached", multiplier: 5 },
    rewards: { xp: 200, coins: 50 },
  },
  {
    id: "combo_10",
    name: "Combo Legend",
    description: "Reach a 10x combo",
    category: "speed",
    tier: "gold",
    icon: "💥",
    requirement: { type: "combo_reached", multiplier: 10 },
    rewards: { xp: 500, coins: 100, badge: "combo_legend" },
  },

  // ─── Accuracy Achievements ─────────────────────────────────────────────────

  {
    id: "accuracy_90",
    name: "Sharp Mind",
    description: "Maintain 90% average accuracy",
    category: "vocabulary",
    tier: "silver",
    icon: "🎯",
    requirement: { type: "accuracy_achieved", percentage: 90 },
    rewards: { xp: 500, coins: 100 },
  },
  {
    id: "accuracy_100",
    name: "Perfection",
    description: "Maintain 100% average accuracy",
    category: "vocabulary",
    tier: "gold",
    icon: "🎯",
    requirement: { type: "accuracy_achieved", percentage: 100 },
    rewards: { xp: 1000, coins: 200, badge: "perfection" },
  },

  // ─── NPC Interaction Achievements ──────────────────────────────────────────

  {
    id: "talk_5_npcs",
    name: "Social Butterfly",
    description: "Complete dialogues with 5 NPCs",
    category: "exploration",
    tier: "bronze",
    icon: "💬",
    requirement: { type: "npc_interactions", count: 5 },
    rewards: { xp: 100, coins: 25 },
  },
  {
    id: "talk_all_npcs",
    name: "Social Network",
    description: "Complete dialogues with all NPCs",
    category: "exploration",
    tier: "silver",
    icon: "🌐",
    requirement: { type: "npc_interactions", count: 9999 }, // Dynamic based on NPC count
    rewards: { xp: 500, coins: 150, badge: "social_butterfly" },
  },

  // ─── Time Played Achievements ──────────────────────────────────────────────

  {
    id: "play_1_hour",
    name: "Getting Serious",
    description: "Play for 1 hour total",
    category: "exploration",
    tier: "bronze",
    icon: "⏰",
    requirement: { type: "time_played", minutes: 60 },
    rewards: { xp: 300, coins: 75 },
  },
  {
    id: "play_10_hours",
    name: "Dedicated Player",
    description: "Play for 10 hours total",
    category: "exploration",
    tier: "silver",
    icon: "⏰",
    requirement: { type: "time_played", minutes: 600 },
    rewards: { xp: 2000, coins: 400 },
  },
  {
    id: "play_50_hours",
    name: "Time Invested",
    description: "Play for 50 hours total",
    category: "exploration",
    tier: "gold",
    icon: "⏰",
    requirement: { type: "time_played", minutes: 3000 },
    rewards: { xp: 8000, coins: 1500, badge: "time_invested" },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENT LOOKUP
// ─────────────────────────────────────────────────────────────────────────────

/** Get achievement by ID */
export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** Get achievements by category */
export function getAchievementsByCategory(
  category: AchievementCategory
): AchievementDefinition[] {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}

/** Get achievements by tier */
export function getAchievementsByTier(
  tier: AchievementTier
): AchievementDefinition[] {
  return ACHIEVEMENTS.filter((a) => a.tier === tier);
}

/** Get total achievements count */
export function getTotalAchievementsCount(): number {
  return ACHIEVEMENTS.length;
}

/** Get secret achievements */
export function getSecretAchievements(): AchievementDefinition[] {
  return ACHIEVEMENTS.filter((a) => a.secret);
}

// ─────────────────────────────────────────────────────────────────────────────
// XP REWARD CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/** Base XP rewards by source */
export const BASE_XP_REWARDS: Record<string, number> = {
  quiz_correct: 10,
  quiz_perfect: 50,
  combo_multiplier: 5,
  npc_interaction: 25,
  achievement_unlocked: 100,
  daily_streak: 20,
  mastery_level_up: 30,
};

/** Tier bonus multipliers */
export const TIER_MULTIPLIERS: Record<AchievementTier, number> = {
  bronze: 1.0,
  silver: 1.5,
  gold: 2.0,
  platinum: 3.0,
};

/** Difficulty bonus multipliers */
export const DIFFICULTY_MULTIPLIERS: Record<string, number> = {
  easy: 1.0,
  medium: 1.5,
  hard: 2.0,
};

/** Combo bonus formula */
export function calculateComboBonus(combo: number): number {
  if (combo < 2) return 0;
  return Math.floor((combo - 1) * BASE_XP_REWARDS.combo_multiplier);
}

/** Perfect quiz bonus */
export function calculatePerfectBonus(isPerfect: boolean): number {
  return isPerfect ? BASE_XP_REWARDS.quiz_perfect : 0;
}

/** Calculate total XP for quiz completion */
export function calculateQuizXP(
  correctAnswers: number,
  totalQuestions: number,
  combo: number,
  difficulty: string
): number {
  const isPerfect = correctAnswers === totalQuestions;
  const baseXP = correctAnswers * BASE_XP_REWARDS.quiz_correct;
  const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[difficulty] || 1.0;
  const comboBonus = calculateComboBonus(combo);
  const perfectBonus = calculatePerfectBonus(isPerfect);

  return Math.floor((baseXP + comboBonus + perfectBonus) * difficultyMultiplier);
}
