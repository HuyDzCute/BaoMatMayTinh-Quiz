/**
 * Dialogue System Components - Public API
 * 
 * Feature 11: NPC Dialogue System
 */

// Re-export UI components
export {
  DialogueBubble,
  ChoiceButton,
  ChoiceList,
  DialogueUI,
  QuizPrompt,
} from "./DialogueUI";
export type {
  DialogueBubbleProps,
  ChoiceButtonProps,
  ChoiceListProps,
  DialogueUIProps,
  QuizPromptProps,
} from "./DialogueUI";

// Re-export NPC controller
export { NPCController, useNPCDialogue } from "./NPCController";
