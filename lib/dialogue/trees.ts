/**
 * Dialogue Tree Definitions - Vocabulary Practice
 * 
 * Feature 11: NPC Dialogue System
 * Data-driven dialogues for NPC interactions
 */

import type { DialogueTree } from "./types";

/**
 * Greeting Dialogue Tree
 * Entry point for first interaction with an NPC
 */
export const GREETING_TREE: DialogueTree = {
  id: "npc_greeting",
  version: 1,
  startNode: "greet_1",
  nodes: {
    // Opening greeting
    "greet_1": {
      id: "greet_1",
      type: "text",
      speaker: "NPC",
      text: {
        en: "Hello there! Welcome to our English learning adventure!",
        vi: "Xin chào! Chào mừng đến với cuộc phiêu lưu học tiếng Anh!",
      },
      next: "greet_2",
    },
    "greet_2": {
      id: "greet_2",
      type: "text",
      speaker: "NPC",
      text: {
        en: "I'm here to help you practice vocabulary. Are you ready to learn?",
        vi: "Tôi ở đây để giúp bạn luyện từ vựng. Bạn đã sẵn sàng để học chưa?",
      },
      next: "choice_1",
    },
    "choice_1": {
      id: "choice_1",
      type: "choice",
      speaker: "NPC",
      prompt: {
        en: "What would you like to do?",
        vi: "Bạn muốn làm gì?",
      },
      choices: [
        {
          id: "start_quiz",
          text: {
            en: "Start a vocabulary quiz!",
            vi: "Bắt đầu bài kiểm tra từ vựng!",
          },
          next: "quiz_easy",
        },
        {
          id: "just_chat",
          text: {
            en: "Tell me about yourself.",
            vi: "Kể về bạn đi.",
          },
          next: "chat_1",
        },
        {
          id: "leave",
          text: {
            en: "Maybe later. Goodbye!",
            vi: "Có thể sau đi. Tạm biệt!",
          },
          next: "leave_1",
        },
      ],
    },
    // Quiz branch
    "quiz_easy": {
      id: "quiz_easy",
      type: "quiz",
      speaker: "NPC",
      topic: "vocabulary",
      difficulty: "easy",
      successNode: "quiz_success_1",
      failureNode: "quiz_retry_1",
    },
    "quiz_success_1": {
      id: "quiz_success_1",
      type: "text",
      speaker: "NPC",
      text: {
        en: "Excellent work! You answered correctly! Let's try another one.",
        vi: "Xuất sắc! Bạn trả lời đúng! Hãy thử câu tiếp theo.",
      },
      next: "quiz_medium",
    },
    "quiz_retry_1": {
      id: "quiz_retry_1",
      type: "choice",
      speaker: "NPC",
      prompt: {
        en: "That wasn't quite right. Would you like to try again?",
        vi: "Chưa đúng lắm. Bạn có muốn thử lại không?",
      },
      choices: [
        {
          id: "retry",
          text: { en: "Yes, let me try again!", vi: "Có, để tôi thử lại!" },
          next: "quiz_easy",
        },
        {
          id: "skip",
          text: { en: "Let's move on.", vi: "Hãy tiếp tục." },
          next: "continue_1",
        },
      ],
    },
    "quiz_medium": {
      id: "quiz_medium",
      type: "quiz",
      speaker: "NPC",
      topic: "vocabulary",
      difficulty: "medium",
      successNode: "quiz_success_2",
      failureNode: "quiz_retry_2",
    },
    "quiz_success_2": {
      id: "quiz_success_2",
      type: "text",
      speaker: "NPC",
      text: {
        en: "Amazing! You're getting better at this!",
        vi: "Tuyệt vời! Bạn đang tiến bộ hơn nhiều!",
      },
      next: "quiz_hard",
    },
    "quiz_retry_2": {
      id: "quiz_retry_2",
      type: "text",
      speaker: "NPC",
      text: {
        en: "Don't worry, practice makes perfect. Keep trying!",
        vi: "Đừng lo, luyện tập làm nên thành công. Cố lên!",
      },
      next: "continue_1",
    },
    "quiz_hard": {
      id: "quiz_hard",
      type: "quiz",
      speaker: "NPC",
      topic: "vocabulary",
      difficulty: "hard",
      successNode: "quiz_success_3",
      failureNode: "quiz_retry_3",
    },
    "quiz_success_3": {
      id: "quiz_success_3",
      type: "text",
      speaker: "NPC",
      text: {
        en: "Outstanding! You've mastered this vocabulary set!",
        vi: "Xuất sắc! Bạn đã làm chủ được bộ từ vựng này!",
      },
      next: "end_success",
    },
    "quiz_retry_3": {
      id: "quiz_retry_3",
      type: "text",
      speaker: "NPC",
      text: {
        en: "Great effort! Every attempt helps you learn.",
        vi: "Nỗ lực tốt! Mỗi lần thử đều giúp bạn học hỏi.",
      },
      next: "continue_1",
    },
    // Chat branch
    "chat_1": {
      id: "chat_1",
      type: "text",
      speaker: "NPC",
      text: {
        en: "I love teaching English! It's my favorite thing in the world.",
        vi: "Tôi thích dạy tiếng Anh! Đó là điều yêu thích nhất của tôi trên thế giới.",
      },
      next: "chat_2",
    },
    "chat_2": {
      id: "chat_2",
      type: "text",
      speaker: "NPC",
      text: {
        en: "The best way to learn is through practice and conversation!",
        vi: "Cách tốt nhất để học là thực hành và giao tiếp!",
      },
      next: "choice_2",
    },
    "choice_2": {
      id: "choice_2",
      type: "choice",
      prompt: {
        en: "Would you like to continue chatting or start a quiz?",
        vi: "Bạn muốn tiếp tục trò chuyện hay bắt đầu bài kiểm tra?",
      },
      choices: [
        {
          id: "to_quiz",
          text: { en: "Let's do a quiz!", vi: "Hãy làm bài kiểm tra!" },
          next: "quiz_easy",
        },
        {
          id: "more_chat",
          text: { en: "Tell me more!", vi: "Kể thêm đi!" },
          next: "chat_3",
        },
        {
          id: "bye",
          text: { en: "That's all for now. Goodbye!", vi: "Thế là đủ rồi. Tạm biệt!" },
          next: "leave_1",
        },
      ],
    },
    "chat_3": {
      id: "chat_3",
      type: "text",
      speaker: "NPC",
      text: {
        en: "Did you know? English has over 170,000 words in active use!",
        vi: "Bạn có biết không? Tiếng Anh có hơn 170.000 từ đang được sử dụng!",
      },
      next: "choice_2",
    },
    // Common nodes
    "continue_1": {
      id: "continue_1",
      type: "text",
      speaker: "NPC",
      text: {
        en: "Feel free to explore and come back whenever you want to practice more!",
        vi: "Hãy thoải mái khám phá và quay lại bất cứ khi nào bạn muốn luyện thêm!",
      },
      next: "end_continue",
    },
    "leave_1": {
      id: "leave_1",
      type: "text",
      speaker: "NPC",
      text: {
        en: "No problem! Come back whenever you're ready to learn.",
        vi: "Không sao! Quay lại bất cứ khi nào bạn sẵn sàng học nhé.",
      },
      next: "end_leave",
    },
    "end_success": {
      id: "end_success",
      type: "end",
      outcome: "success",
    },
    "end_leave": {
      id: "end_leave",
      type: "end",
      outcome: "leave",
    },
    "end_continue": {
      id: "end_continue",
      type: "end",
      outcome: "repeat",
    },
  },
};

/**
 * Repeat Greeting Tree
 * Shown when player talks to NPC again
 */
export const GREETING_REPEAT_TREE: DialogueTree = {
  id: "npc_greeting_repeat",
  version: 1,
  startNode: "repeat_1",
  nodes: {
    "repeat_1": {
      id: "repeat_1",
      type: "text",
      speaker: "NPC",
      text: {
        en: "Welcome back! Ready for more vocabulary practice?",
        vi: "Chào mừng trở lại! Sẵn sàng luyện từ vựng thêm không?",
      },
      next: "repeat_choice",
    },
    "repeat_choice": {
      id: "repeat_choice",
      type: "choice",
      choices: [
        {
          id: "yes_quiz",
          text: { en: "Yes, let's practice!", vi: "Có, hãy luyện tập!" },
          next: "quiz_easy",
        },
        {
          id: "not_now",
          text: { en: "Maybe later.", vi: "Có thể sau." },
          next: "repeat_end",
        },
      ],
    },
    "quiz_easy": {
      id: "quiz_easy",
      type: "quiz",
      topic: "vocabulary",
      difficulty: "easy",
      successNode: "repeat_success",
      failureNode: "repeat_failure",
    },
    "repeat_success": {
      id: "repeat_success",
      type: "text",
      speaker: "NPC",
      text: {
        en: "Great job! You're improving!",
        vi: "Làm tốt lắm! Bạn đang tiến bộ!",
      },
      next: "repeat_end",
    },
    "repeat_failure": {
      id: "repeat_failure",
      type: "text",
      speaker: "NPC",
      text: {
        en: "Keep trying! Practice makes perfect.",
        vi: "Cố lên! Luyện tập làm nên thành công.",
      },
      next: "repeat_end",
    },
    "repeat_end": {
      id: "repeat_end",
      type: "end",
      outcome: "leave",
    },
  },
};

/**
 * Success Dialogue Tree
 * Shown after completing all quizzes
 */
export const SUCCESS_TREE: DialogueTree = {
  id: "npc_success",
  version: 1,
  startNode: "congrats_1",
  nodes: {
    "congrats_1": {
      id: "congrats_1",
      type: "text",
      speaker: "NPC",
      text: {
        en: "Congratulations! You've completed all the vocabulary practice!",
        vi: "Chúc mừng! Bạn đã hoàn thành tất cả bài luyện tập từ vựng!",
      },
      next: "congrats_2",
    },
    "congrats_2": {
      id: "congrats_2",
      type: "text",
      speaker: "NPC",
      text: {
        en: "Your English is getting better. Keep up the great work!",
        vi: "Tiếng Anh của bạn st đang tiến bộ. Tiếp tục phát huy nhé!",
      },
      next: "congrats_end",
    },
    "congrats_end": {
      id: "congrats_end",
      type: "end",
      outcome: "success",
    },
  },
};

/**
 * NPC Dialogue Registry
 * Maps NPC IDs to their dialogue trees
 */
export interface NPCDialogueRegistry {
  greeting: DialogueTree;
  greetingRepeat: DialogueTree;
  success: DialogueTree;
  [key: string]: DialogueTree;
}

export const DIALOGUE_REGISTRY: NPCDialogueRegistry = {
  greeting: GREETING_TREE,
  greetingRepeat: GREETING_REPEAT_TREE,
  success: SUCCESS_TREE,
};

/**
 * Get dialogue tree by ID
 */
export function getDialogueTree(treeId: string): DialogueTree | undefined {
  return DIALOGUE_REGISTRY[treeId] ?? DIALOGUE_REGISTRY.greeting;
}

/**
 * Get greeting dialogue (with repeat check)
 */
export function getGreetingDialogue(hasVisited: boolean): DialogueTree {
  return hasVisited ? GREETING_REPEAT_TREE : GREETING_TREE;
}
