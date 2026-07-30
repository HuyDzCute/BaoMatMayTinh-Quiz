/**
 * Dialogue System - Type Definitions
 * 
 * Feature 11: NPC Dialogue System
 * Framework for data-driven dialogue with branching support
 */

// ─── Core Dialogue Types ────────────────────────────────────────────────────────

/** Unique identifier for dialogue nodes */
export type DialogueNodeId = string;

/** Supported languages (extensible) */
export type Locale = "en" | "vi" | "ja" | "zh";

/** Localized text content */
export interface LocalizedText {
  en: string;
  vi?: string;
  ja?: string;
  zh?: string;
  [key: string]: string | undefined;
}

/** Get text in specified locale, fallback to English */
export function t(localized: LocalizedText | string, locale: Locale = "en"): string {
  if (typeof localized === "string") return localized;
  return localized[locale] ?? localized.en;
}

// ─── Dialogue Node Types ───────────────────────────────────────────────────────

/** Base dialogue node interface */
export interface IDialogueNode {
  id: DialogueNodeId;
  type: DialogueNodeType;
  speaker?: string;
}

/** Types of dialogue nodes */
export type DialogueNodeType = 
  | "text"        // Simple text display
  | "choice"      // Player choice branch
  | "quiz"        // Vocabulary quiz trigger
  | "action"      // Game action (e.g., give item)
  | "end";        // End of dialogue

/** Text node - displays dialogue text */
export interface TextNode extends IDialogueNode {
  type: "text";
  text: LocalizedText;
  next?: DialogueNodeId;  // Auto-advance to this node
  delay?: number;         // Auto-advance delay in ms (0 = manual)
}

/** Choice node - presents player options */
export interface ChoiceNode extends IDialogueNode {
  type: "choice";
  prompt?: LocalizedText;
  choices: Choice[];
}

/** A single choice option */
export interface Choice {
  id: string;
  text: LocalizedText;
  next: DialogueNodeId;
  condition?: DialogCondition;
}

/** Condition for showing a choice (future quest support) */
export interface DialogCondition {
  type: "flag" | "item" | "level" | "visited";
  key: string;
  value?: string | number | boolean;
  operator?: "eq" | "neq" | "gt" | "lt" | "gte" | "lte";
}

/** Quiz node - triggers vocabulary quiz */
export interface QuizNode extends IDialogueNode {
  type: "quiz";
  topic: string;
  difficulty?: "easy" | "medium" | "hard";
  successNode?: DialogueNodeId;  // Node after correct answer
  failureNode?: DialogueNodeId; // Node after wrong answer
  retryNode?: DialogueNodeId;   // Node after retry
}

/** Action node - triggers game events */
export interface ActionNode extends IDialogueNode {
  type: "action";
  action: DialogAction;
  next?: DialogueNodeId;
}

/** Available dialogue actions */
export interface DialogAction {
  type: "set_flag" | "give_item" | "take_item" | "play_sound" | "spawn_npc" | "teleport";
  payload: Record<string, unknown>;
}

/** End node - terminates dialogue */
export interface EndNode extends IDialogueNode {
  type: "end";
  outcome?: "success" | "leave" | "repeat";
}

// ─── Dialogue Tree ─────────────────────────────────────────────────────────────

/** Complete dialogue tree for an NPC */
export interface DialogueTree {
  id: string;
  version: number;
  startNode: DialogueNodeId;
  nodes: Record<DialogueNodeId, DialogueNode>;
}

/** Union type of all dialogue nodes */
export type DialogueNode = TextNode | ChoiceNode | QuizNode | ActionNode | EndNode;

// ─── Runtime State ─────────────────────────────────────────────────────────────

/** Current dialogue session state */
export interface DialogueState {
  isActive: boolean;
  npcId: string | null;
  treeId: string | null;
  currentNodeId: DialogueNodeId | null;
  visitedNodes: Set<DialogueNodeId>;
  flags: Record<string, string | number | boolean>;
  history: DialogueHistoryEntry[];
}

export interface DialogueHistoryEntry {
  nodeId: DialogueNodeId;
  timestamp: number;
  choiceMade?: string;
}

/** Events emitted by dialogue engine */
export type DialogueEvent =
  | { type: "START"; npcId: string; treeId: string }
  | { type: "NODE_ENTER"; nodeId: DialogueNodeId }
  | { type: "NODE_EXIT"; nodeId: DialogueNodeId }
  | { type: "CHOICE_SELECT"; choiceId: string; nodeId: DialogueNodeId }
  | { type: "QUIZ_TRIGGER"; topic: string; difficulty?: string }
  | { type: "QUIZ_COMPLETE"; correct: boolean }
  | { type: "END"; outcome: "success" | "leave" | "repeat" }
  | { type: "FLAG_SET"; key: string; value: unknown };

/** Event listener type */
export type DialogueEventListener = (event: DialogueEvent) => void;

// ─── NPC Configuration ─────────────────────────────────────────────────────────

/** NPC dialogue configuration */
export interface NPCDialogueConfig {
  npcId: string;
  treeId: string;
  trigger?: "auto" | "proximity" | "quest" | "item";
  repeatable?: boolean;
  cooldown?: number;  // ms before can talk again
}

// ─── Quiz Integration ──────────────────────────────────────────────────────────

/** Quiz configuration when triggered from dialogue */
export interface DialogueQuizConfig {
  topic: string;
  difficulty?: "easy" | "medium" | "hard";
  questions: number;
  rewards?: {
    correct?: number;
    wrong?: number;
  };
  onComplete?: (results: QuizResults) => void;
}

export interface QuizResults {
  correct: number;
  total: number;
  answers: boolean[];
}

// ─── Serialization (Save/Load) ────────────────────────────────────────────────

/** Serializable dialogue state for persistence */
export interface SerializableDialogueState {
  flags: Record<string, string | number | boolean>;
  completedTrees: string[];
  npcCooldowns: Record<string, number>;
}

/** Serialize runtime state for save */
export function serializeDialogueState(state: DialogueState): SerializableDialogueState {
  return {
    flags: { ...state.flags },
    completedTrees: [],
    npcCooldowns: {},
  };
}

/** Deserialize saved state */
export function deserializeDialogueState(data: SerializableDialogueState): Partial<DialogueState> {
  return {
    flags: data.flags ?? {},
    visitedNodes: new Set(),
    history: [],
  };
}
