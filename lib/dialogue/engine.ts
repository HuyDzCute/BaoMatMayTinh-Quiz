/**
 * Dialogue Engine - Core State Machine
 * 
 * Feature 11: NPC Dialogue System
 * Manages dialogue state, transitions, and event emission
 */

import type {
  DialogueState,
  DialogueTree,
  DialogueNode,
  DialogueNodeId,
  DialogueEvent,
  DialogueEventListener,
  TextNode,
  ChoiceNode,
  QuizNode,
  ActionNode,
  EndNode,
  SerializableDialogueState,
} from "./types";

/**
 * Dialogue Engine
 * 
 * Core state machine for dialogue system.
 * Handles tree navigation, condition evaluation, and event emission.
 */
export class DialogueEngine {
  private state: DialogueState;
  private currentTree: DialogueTree | null = null;
  private listeners: Set<DialogueEventListener> = new Set();
  private locale: string = "en";

  constructor(initialState?: Partial<DialogueState>) {
    this.state = {
      isActive: false,
      npcId: null,
      treeId: null,
      currentNodeId: null,
      visitedNodes: new Set(),
      flags: {},
      history: [],
      ...initialState,
    };
  }

  // ─── Event System ─────────────────────────────────────────────────────────────

  /** Subscribe to dialogue events */
  onEvent(listener: DialogueEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Emit event to all listeners */
  private emit(event: DialogueEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  // ─── Locale ──────────────────────────────────────────────────────────────────

  /** Set the current locale for text display */
  setLocale(locale: string): void {
    this.locale = locale;
  }

  getLocale(): string {
    return this.locale;
  }

  // ─── State Access ─────────────────────────────────────────────────────────────

  getState(): DialogueState {
    return this.state;
  }

  isActive(): boolean {
    return this.state.isActive;
  }

  getCurrentNodeId(): DialogueNodeId | null {
    return this.state.currentNodeId;
  }

  /** Check if a dialogue tree has been completed for an NPC */
  hasCompleted(npcId: string): boolean {
    return this.state.visitedNodes.has(`completed_${npcId}`);
  }

  /** Check if a specific node has been visited */
  hasVisited(nodeId: DialogueNodeId): boolean {
    return this.state.visitedNodes.has(nodeId);
  }

  /** Get a flag value */
  getFlag(key: string): string | number | boolean | undefined {
    return this.state.flags[key];
  }

  // ─── Dialogue Control ─────────────────────────────────────────────────────────

  /**
   * Start a dialogue tree
   */
  start(tree: DialogueTree, npcId: string): boolean {
    if (this.state.isActive) {
      console.warn("DialogueEngine: Cannot start dialogue while another is active");
      return false;
    }

    this.currentTree = tree;
    this.state = {
      ...this.state,
      isActive: true,
      npcId,
      treeId: tree.id,
      currentNodeId: null,
      visitedNodes: new Set(),
      history: [],
    };

    this.emit({ type: "START", npcId, treeId: tree.id });

    // Navigate to start node
    return this.goTo(tree.startNode);
  }

  /**
   * Navigate to a specific node
   */
  goTo(nodeId: DialogueNodeId): boolean {
    if (!this.currentTree || !this.state.isActive) {
      console.warn("DialogueEngine: Cannot navigate - no active dialogue");
      return false;
    }

    const node = this.currentTree.nodes[nodeId];
    if (!node) {
      console.error(`DialogueEngine: Node not found: ${nodeId}`);
      return false;
    }

    // Exit current node
    if (this.state.currentNodeId) {
      this.emit({ type: "NODE_EXIT", nodeId: this.state.currentNodeId });
    }

    // Enter new node
    this.state.currentNodeId = nodeId;
    this.state.visitedNodes.add(nodeId);
    this.state.history.push({
      nodeId,
      timestamp: Date.now(),
    });

    this.emit({ type: "NODE_ENTER", nodeId });

    // Auto-process based on node type
    return this.processNode(node);
  }

  /**
   * Process a node and trigger side effects
   */
  private processNode(node: DialogueNode): boolean {
    switch (node.type) {
      case "text":
        return this.processTextNode(node);
      case "choice":
        return this.processChoiceNode(node);
      case "quiz":
        return this.processQuizNode(node);
      case "action":
        return this.processActionNode(node);
      case "end":
        return this.processEndNode(node);
      default:
        console.error(`DialogueEngine: Unknown node type: ${(node as DialogueNode).type}`);
        return false;
    }
  }

  private processTextNode(node: TextNode): boolean {
    // Auto-advance if configured and no delay
    if (node.next && node.delay === 0) {
      // Delay 0 means auto-advance, but we let the UI decide timing
      // Store auto-advance target for UI to handle
    }
    return true;
  }

  private processChoiceNode(node: ChoiceNode): boolean {
    // Filter choices by conditions
    const availableChoices = node.choices.filter((choice) =>
      this.evaluateCondition(choice.condition)
    );
    return availableChoices.length > 0;
  }

  private processQuizNode(node: QuizNode): boolean {
    this.emit({
      type: "QUIZ_TRIGGER",
      topic: node.topic,
      difficulty: node.difficulty,
    });
    return true;
  }

  private processActionNode(node: ActionNode): boolean {
    this.executeAction(node.action);
    if (node.next) {
      return this.goTo(node.next);
    }
    return true;
  }

  private processEndNode(node: EndNode): boolean {
    // Mark completion
    if (this.state.npcId) {
      this.state.visitedNodes.add(`completed_${this.state.npcId}`);
    }

    this.emit({ type: "END", outcome: node.outcome ?? "leave" });
    return true;
  }

  // ─── User Actions ────────────────────────────────────────────────────────────

  /**
   * Select a choice option
   */
  selectChoice(choiceId: string): boolean {
    if (!this.currentTree || !this.state.currentNodeId) {
      return false;
    }

    const node = this.currentTree.nodes[this.state.currentNodeId];
    if (node?.type !== "choice") {
      return false;
    }

    const choice = node.choices.find((c) => c.id === choiceId);
    if (!choice) {
      console.error(`DialogueEngine: Choice not found: ${choiceId}`);
      return false;
    }

    // Update history with choice
    const historyEntry = this.state.history[this.state.history.length - 1];
    if (historyEntry) {
      historyEntry.choiceMade = choiceId;
    }

    this.emit({
      type: "CHOICE_SELECT",
      choiceId,
      nodeId: this.state.currentNodeId,
    });

    return this.goTo(choice.next);
  }

  /**
   * Advance to next node (for text nodes with auto-advance)
   */
  advance(): boolean {
    if (!this.currentTree || !this.state.currentNodeId) {
      return false;
    }

    const node = this.currentTree.nodes[this.state.currentNodeId];
    if (node?.type !== "text") {
      return false;
    }

    if (!node.next) {
      return this.end();
    }

    return this.goTo(node.next);
  }

  /**
   * Report quiz result
   */
  reportQuizResult(correct: boolean): void {
    if (!this.currentTree || !this.state.currentNodeId) {
      return;
    }

    const node = this.currentTree.nodes[this.state.currentNodeId];
    if (node?.type !== "quiz") {
      return;
    }

    this.emit({ type: "QUIZ_COMPLETE", correct });

    // Navigate based on result
    const targetNodeId = correct
      ? (node as QuizNode).successNode
      : (node as QuizNode).failureNode;

    if (targetNodeId) {
      this.goTo(targetNodeId);
    }
  }

  /**
   * End the current dialogue
   */
  end(): boolean {
    if (!this.state.isActive) {
      return false;
    }

    const finalNodeId = this.state.currentNodeId;
    this.emit({ type: "END", outcome: "leave" });

    this.state = {
      ...this.state,
      isActive: false,
    };

    this.currentTree = null;
    return true;
  }

  // ─── Condition Evaluation ─────────────────────────────────────────────────────

  /**
   * Evaluate a dialogue condition
   */
  private evaluateCondition(
    condition?: { type: string; key: string; value?: unknown; operator?: string }
  ): boolean {
    if (!condition) return true;

    const flagValue = this.state.flags[condition.key];

    switch (condition.type) {
      case "flag":
        switch (condition.operator ?? "eq") {
          case "eq": return flagValue === condition.value;
          case "neq": return flagValue !== condition.value;
          case "gt": return (flagValue as number) > (condition.value as number);
          case "lt": return (flagValue as number) < (condition.value as number);
          case "gte": return (flagValue as number) >= (condition.value as number);
          case "lte": return (flagValue as number) <= (condition.value as number);
          default: return flagValue === condition.value;
        }
      case "visited":
        return this.state.visitedNodes.has(condition.key);
      case "item":
      case "level":
        return true; // TODO: Implement when inventory/level systems exist
      default:
        return true;
    }
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Execute a dialogue action
   */
  private executeAction(action: { type: string; payload: Record<string, unknown> }): void {
    switch (action.type) {
      case "set_flag":
        const key = action.payload.key as string;
        const value = action.payload.value as string | number | boolean;
        this.state.flags[key] = value;
        this.emit({ type: "FLAG_SET", key, value });
        break;
      case "play_sound":
        // TODO: Integrate with audio system
        break;
      case "give_item":
      case "take_item":
        // TODO: Integrate with inventory system
        break;
      default:
        console.warn(`DialogueEngine: Unknown action type: ${action.type}`);
    }
  }

  /**
   * Set a flag programmatically
   */
  setFlag(key: string, value: string | number | boolean): void {
    this.state.flags[key] = value;
    this.emit({ type: "FLAG_SET", key, value });
  }

  // ─── Serialization ───────────────────────────────────────────────────────────

  /**
   * Get serializable state for persistence
   */
  toJSON(): SerializableDialogueState {
    return {
      flags: { ...this.state.flags },
      completedTrees: Array.from(this.state.visitedNodes).filter((n) =>
        n.startsWith("completed_")
      ),
      npcCooldowns: {},
    };
  }

  /**
   * Restore state from serialized data
   */
  fromJSON(data: SerializableDialogueState): void {
    this.state.flags = data.flags ?? {};
    // Restore completed trees as visited nodes
    data.completedTrees?.forEach((treeId) => {
      this.state.visitedNodes.add(treeId);
    });
  }
}

// ─── Singleton Instance ─────────────────────────────────────────────────────────

let dialogueEngineInstance: DialogueEngine | null = null;

export function getDialogueEngine(): DialogueEngine {
  if (!dialogueEngineInstance) {
    dialogueEngineInstance = new DialogueEngine();
  }
  return dialogueEngineInstance;
}

export function createDialogueEngine(initialState?: Partial<DialogueState>): DialogueEngine {
  dialogueEngineInstance = new DialogueEngine(initialState);
  return dialogueEngineInstance;
}
