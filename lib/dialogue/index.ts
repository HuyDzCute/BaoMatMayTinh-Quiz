/**
 * Dialogue System - Public API
 * 
 * Feature 11: NPC Dialogue System
 * 
 * Architecture:
 * - types.ts: Core type definitions
 * - trees.ts: Dialogue tree data
 * - engine.ts: State machine and logic
 * - hooks.ts: React integration
 * 
 * Usage:
 * 
 * ```tsx
 * import { DialogueUI } from "@/components/game/dialogue/DialogueUI";
 * import { useDialogueWithTree } from "@/lib/dialogue/hooks";
 * import { getGreetingDialogue } from "@/lib/dialogue/trees";
 * 
 * function MyComponent() {
 *   const dialogue = useDialogueWithTree(tree);
 *   
 *   return (
 *     <DialogueUI
 *       isActive={dialogue.isActive}
 *       speaker={dialogue.speaker}
 *       text={dialogue.nodeText}
 *       choices={dialogue.choices}
 *       onChoice={dialogue.selectChoice}
 *       onAdvance={dialogue.advance}
 *       onClose={dialogue.endDialogue}
 *     />
 *   );
 * }
 * ```
 */

// Re-export all public types
export type {
  DialogueNodeId,
  Locale,
  LocalizedText,
  IDialogueNode,
  DialogueNodeType,
  TextNode,
  ChoiceNode,
  Choice,
  DialogCondition,
  QuizNode,
  ActionNode,
  DialogAction,
  EndNode,
  DialogueTree,
  DialogueNode,
  DialogueState,
  DialogueHistoryEntry,
  DialogueEvent,
  DialogueEventListener,
  NPCDialogueConfig,
  DialogueQuizConfig,
  QuizResults,
  SerializableDialogueState,
} from "./types";

// Re-export utility functions
export { t, serializeDialogueState, deserializeDialogueState } from "./types";

// Re-export dialogue trees
export {
  GREETING_TREE,
  GREETING_REPEAT_TREE,
  SUCCESS_TREE,
  DIALOGUE_REGISTRY,
  getDialogueTree,
  getGreetingDialogue,
} from "./trees";
export type { NPCDialogueRegistry } from "./trees";

// Re-export engine
export {
  DialogueEngine,
  getDialogueEngine,
  createDialogueEngine,
} from "./engine";

// Re-export hooks
export { useDialogue, useDialogueWithTree } from "./hooks";
export type { UseDialogueReturn } from "./hooks";
