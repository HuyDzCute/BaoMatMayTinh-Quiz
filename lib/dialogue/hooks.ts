/**
 * Dialogue React Hook
 * 
 * Feature 11: NPC Dialogue System
 * React integration for dialogue engine
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { DialogueEngine, getDialogueEngine, createDialogueEngine } from "./engine";
import type {
  DialogueTree,
  DialogueState,
  DialogueEvent,
  TextNode,
  ChoiceNode,
  QuizNode,
  EndNode,
  Locale,
} from "./types";
import { t } from "./types";

export interface UseDialogueReturn {
  // State
  isActive: boolean;
  currentNodeId: string | null;
  locale: string;
  
  // Current node data
  currentNode: TextNode | ChoiceNode | QuizNode | EndNode | null;
  nodeText: string | null;
  speaker: string | null;
  choices: Array<{ id: string; text: string }>;
  
  // Actions
  startDialogue: (tree: DialogueTree, npcId: string) => void;
  selectChoice: (choiceId: string) => void;
  advance: () => void;
  endDialogue: () => void;
  reportQuizResult: (correct: boolean) => void;
  
  // Settings
  setLocale: (locale: string) => void;
}

export function useDialogue(): UseDialogueReturn {
  const [engine] = useState<DialogueEngine>(() => getDialogueEngine());
  const [state, setState] = useState<DialogueState>(engine.getState());
  const [locale, setLocaleState] = useState(engine.getLocale());

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = engine.onEvent(() => {
      setState({ ...engine.getState() });
    });
    return unsubscribe;
  }, [engine]);

  // Memoized current node
  const currentNode = useMemo(() => {
    if (!state.isActive || !state.currentNodeId || !state.treeId) {
      return null;
    }
    // Get node from tree - this needs tree reference
    return null; // Will be resolved by tree data passed to startDialogue
  }, [state.isActive, state.currentNodeId, state.treeId]);

  const startDialogue = useCallback(
    (tree: DialogueTree, npcId: string) => {
      engine.start(tree, npcId);
    },
    [engine]
  );

  const selectChoice = useCallback(
    (choiceId: string) => {
      engine.selectChoice(choiceId);
    },
    [engine]
  );

  const advance = useCallback(() => {
    engine.advance();
  }, [engine]);

  const endDialogue = useCallback(() => {
    engine.end();
  }, [engine]);

  const reportQuizResult = useCallback(
    (correct: boolean) => {
      engine.reportQuizResult(correct);
    },
    [engine]
  );

  const setLocale = useCallback(
    (newLocale: string) => {
      engine.setLocale(newLocale);
      setLocaleState(newLocale);
    },
    [engine]
  );

  return {
    isActive: state.isActive,
    currentNodeId: state.currentNodeId,
    locale,
    currentNode,
    nodeText: null, // Will be populated with tree data
    speaker: null,
    choices: [],
    startDialogue,
    selectChoice,
    advance,
    endDialogue,
    reportQuizResult,
    setLocale,
  };
}

/**
 * Extended dialogue hook with tree resolution
 */
export function useDialogueWithTree(
  tree: DialogueTree | null
): UseDialogueReturn & {
  nodeText: string | null;
  speaker: string | null;
  choices: Array<{ id: string; text: string }>;
} {
  const dialogue = useDialogue();
  const locale = dialogue.locale;

  // Resolve current node text and choices from tree
  const nodeData = useMemo(() => {
    if (!tree || !dialogue.currentNodeId) {
      return { nodeText: null, speaker: null, choices: [] };
    }

    const node = tree.nodes[dialogue.currentNodeId];
    if (!node) {
      return { nodeText: null, speaker: null, choices: [] };
    }

    let nodeText: string | null = null;
    const speaker = node.speaker ?? null;

    if (node.type === "text") {
      nodeText = t((node as TextNode).text, locale as Locale);
    } else if (node.type === "choice") {
      nodeText = (node as ChoiceNode).prompt ? t((node as ChoiceNode).prompt!, locale as Locale) : null;
    }

    const choices =
      node.type === "choice"
        ? (node as ChoiceNode).choices.map((c) => ({
            id: c.id,
            text: t(c.text, locale as Locale),
          }))
        : [];

    return { nodeText, speaker, choices };
  }, [tree, dialogue.currentNodeId, locale]);

  return {
    ...dialogue,
    ...nodeData,
  };
}
