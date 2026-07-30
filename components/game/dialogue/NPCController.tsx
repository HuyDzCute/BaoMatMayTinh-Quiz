/**
 * NPC Controller with Dialogue System
 * 
 * Feature 11: NPC Dialogue System
 * Refactored to use data-driven dialogue framework
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { DialogueEngine, createDialogueEngine, getGreetingDialogue, type DialogueTree, type ChoiceNode, type TextNode, type LocalizedText } from "@/lib/dialogue";
import type { Vector3 } from "@/lib/wordrun-types";

interface NPCControllerProps {
  npcPositions: readonly number[];
  interacted: boolean[];
  playerPosRef: React.MutableRefObject<Vector3>;
  onNearbyNPC: (npcIdx: number | null) => void;
  onStartQuiz: (npcIdx: number) => void;
  showDialogue: boolean;
  activeDialogueNPC: number | null;
  paused: boolean;
  onDialogueStart?: (npcIdx: number) => void;
  onDialogueEnd?: () => void;
  locale?: string;
}

// NPC visual configuration
const NPC_COLORS = ["#f472b6", "#a78bfa", "#34d399"] as const;
const INTERACT_DISTANCE = 2.5;

interface NPCVisualConfig {
  color: string;
  name: string;
  greeting: string;
}

const NPC_CONFIGS: Record<number, NPCVisualConfig> = {
  0: {
    color: NPC_COLORS[0],
    name: "Pink Student",
    greeting: "Hello! Ready to practice English?",
  },
  1: {
    color: NPC_COLORS[1],
    name: "Purple Student",
    greeting: "Welcome! Let's learn together!",
  },
  2: {
    color: NPC_COLORS[2],
    name: "Green Student",
    greeting: "Hi there! Ready for a challenge?",
  },
};

// ─── Individual NPC Mesh Component ───────────────────────────────────────────────

interface NPCMeshProps {
  index: number;
  x: number;
  config: NPCVisualConfig;
  interacted: boolean;
  isNearby: boolean;
  showPrompt: boolean;
  showDialogue: boolean;
  dialogueText?: string | null;
}

function NPCMesh({
  index,
  x,
  config,
  interacted,
  isNearby,
  showPrompt,
  showDialogue,
  dialogueText,
}: NPCMeshProps) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const walkCycle = useRef(Math.random() * Math.PI * 2);
  const maxWander = 1.2;
  const baseX = useRef(x);

  // Animation loop
  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      if (!groupRef.current || !bodyRef.current) {
        animationId = requestAnimationFrame(animate);
        return;
      }

      walkCycle.current += 0.016 * 1.2; // ~60fps
      const wander = Math.sin(walkCycle.current) * maxWander * 0.5;
      const newX = baseX.current + wander;

      groupRef.current.position.x = newX;

      const isMoving = Math.abs(Math.cos(walkCycle.current)) > 0.3;
      bodyRef.current.position.y = isMoving ? Math.sin(walkCycle.current * 2) * 0.05 : 0;

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <group ref={groupRef} position={[x, 0, 0]}>
      {/* Body */}
      <mesh ref={bodyRef} castShadow position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.9, 16]} />
        <meshStandardMaterial
          color={interacted ? "#475569" : config.color}
          emissive={interacted ? "#1e293b" : config.color}
          emissiveIntensity={interacted ? 0.1 : 0.3}
          roughness={0.6}
        />
      </mesh>

      {/* Head */}
      <mesh castShadow position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial
          color={interacted ? "#94a3b8" : "#fcd9bd"}
          roughness={0.5}
        />
      </mesh>

      {/* Eyes */}
      <mesh position={[0.12, 1.34, 0.22]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[-0.12, 1.34, 0.22]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Interaction indicator */}
      {!interacted && (
        <mesh position={[0, 1.9, 0]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial
            color={isNearby ? "#22d3ee" : "#fbbf24"}
            emissive={isNearby ? "#22d3ee" : "#fbbf24"}
            emissiveIntensity={isNearby ? 1.2 : 0.8}
          />
        </mesh>
      )}

      {/* Checkmark when done */}
      {interacted && (
        <mesh position={[0.4, 1.1, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}

      {/* "Press E to Talk" prompt */}
      {showPrompt && !interacted && (
        <Html
          position={[0, 2.5, 0]}
          center
          distanceFactor={8}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div
            style={{
              background: "rgba(15, 23, 42, 0.92)",
              border: "1px solid rgba(59, 130, 246, 0.5)",
              borderRadius: 8,
              padding: "6px 12px",
              color: "#e2e8f0",
              fontSize: 13,
              fontFamily: "var(--font-inter, sans-serif)",
              fontWeight: 600,
              whiteSpace: "nowrap",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              animation: "float 1.5s ease-in-out infinite",
            }}
          >
            Press <strong style={{ color: "#60a5fa" }}>E</strong> to Talk
          </div>
          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-5px); }
            }
          `}</style>
        </Html>
      )}

      {/* Dialogue bubble */}
      {showDialogue && (
        <Html
          position={[0, 2.8, 0]}
          center
          distanceFactor={8}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div
            style={{
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              borderRadius: 12,
              padding: "14px 18px",
              color: "#f1f5f9",
              fontSize: 13,
              fontFamily: "var(--font-inter, sans-serif)",
              minWidth: 220,
              maxWidth: 280,
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ marginBottom: 10, color: "#94a3b8", fontSize: 11 }}>
              {config.name}
            </div>
            <div style={{ marginBottom: 12, lineHeight: 1.5 }}>
              {dialogueText ?? config.greeting}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Main NPC Controller ─────────────────────────────────────────────────────────

export function NPCController({
  npcPositions,
  interacted,
  playerPosRef,
  onNearbyNPC,
  onStartQuiz,
  showDialogue,
  activeDialogueNPC,
  paused,
  onDialogueStart,
  onDialogueEnd,
  locale = "en",
}: NPCControllerProps) {
  const lastCheck = useRef(0);
  const nearbyRef = useRef<number | null>(null);
  const dialogueEngineRef = useRef<DialogueEngine | null>(null);
  const [dialogueTexts, setDialogueTexts] = useState<Record<number, string>>({});

  // Initialize dialogue engine
  useEffect(() => {
    dialogueEngineRef.current = createDialogueEngine();
    dialogueEngineRef.current.setLocale(locale);

    // Subscribe to dialogue events
    const engine = dialogueEngineRef.current;
    const unsubscribe = engine.onEvent((event) => {
      switch (event.type) {
        case "QUIZ_TRIGGER":
          // Trigger quiz when quiz node is reached
          if (activeDialogueNPC !== null) {
            onStartQuiz(activeDialogueNPC);
          }
          break;
        case "END":
          onDialogueEnd?.();
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [locale, activeDialogueNPC, onStartQuiz, onDialogueEnd]);

  // Proximity detection
  useEffect(() => {
    let frameId: number;

    const checkProximity = () => {
      if (paused || showDialogue) {
        frameId = requestAnimationFrame(checkProximity);
        return;
      }

      const p = playerPosRef.current;
      let nearest: number | null = null;
      let nearestDist = Infinity;

      npcPositions.forEach((x, i) => {
        if (interacted[i]) return;
        const dist = Math.abs(p.x - x);
        if (dist < INTERACT_DISTANCE && dist < nearestDist) {
          nearest = i;
          nearestDist = dist;
        }
      });

      if (nearest !== nearbyRef.current) {
        nearbyRef.current = nearest;
        onNearbyNPC(nearest);
      }

      frameId = requestAnimationFrame(checkProximity);
    };

    frameId = requestAnimationFrame(checkProximity);
    return () => cancelAnimationFrame(frameId);
  }, [npcPositions, interacted, playerPosRef, paused, showDialogue, onNearbyNPC]);

  // Update dialogue text when active dialogue NPC changes
  useEffect(() => {
    if (activeDialogueNPC !== null && dialogueEngineRef.current) {
      const engine = dialogueEngineRef.current;
      const hasVisited = interacted[activeDialogueNPC];
      const tree = getGreetingDialogue(hasVisited);
      
      // Get the text for the current node
      const nodeId = engine.getCurrentNodeId();
      if (nodeId && tree.nodes[nodeId]) {
        const node = tree.nodes[nodeId];
        if (node.type === "text") {
          const text = node.text[locale as keyof typeof node.text] ?? node.text.en;
          setDialogueTexts((prev) => ({ ...prev, [activeDialogueNPC]: text }));
        }
      }
    }
  }, [activeDialogueNPC, locale, interacted]);

  return (
    <>
      {npcPositions.map((x, i) => (
        <NPCMesh
          key={i}
          index={i}
          x={x}
          config={NPC_CONFIGS[i] ?? NPC_CONFIGS[0]}
          interacted={interacted[i]}
          isNearby={nearbyRef.current === i}
          showPrompt={nearbyRef.current === i && !showDialogue}
          showDialogue={showDialogue && activeDialogueNPC === i}
          dialogueText={dialogueTexts[i]}
        />
      ))}
    </>
  );
}

// ─── Dialogue Manager Hook ───────────────────────────────────────────────────────

/**
 * Hook for managing NPC dialogue state
 */
export function useNPCDialogue(
  npcPositions: readonly number[],
  locale: string = "en"
) {
  const [engine] = useState(() => createDialogueEngine());
  const [isActive, setIsActive] = useState(false);
  const [activeNpcIdx, setActiveNpcIdx] = useState<number | null>(null);
  const [currentTree, setCurrentTree] = useState<DialogueTree | null>(null);
  const [visitedNPCs, setVisitedNPCs] = useState<Set<number>>(new Set());

  useEffect(() => {
    engine.setLocale(locale);
  }, [engine, locale]);

  const startDialogue = useCallback(
    (npcIdx: number) => {
      const hasVisited = visitedNPCs.has(npcIdx);
      const tree = getGreetingDialogue(hasVisited);
      const npcId = `npc_${npcIdx}`;

      setCurrentTree(tree);
      setActiveNpcIdx(npcIdx);
      setIsActive(true);

      engine.start(tree, npcId);
      setVisitedNPCs((prev) => new Set([...prev, npcIdx]));
    },
    [engine, visitedNPCs]
  );

  const endDialogue = useCallback(() => {
    setIsActive(false);
    setActiveNpcIdx(null);
    setCurrentTree(null);
    engine.end();
  }, [engine]);

  const getCurrentText = useCallback((): string | null => {
    if (!isActive || !currentTree || !activeNpcIdx) return null;

    const nodeId = engine.getCurrentNodeId();
    if (!nodeId) return null;

    const node = currentTree.nodes[nodeId];
    if (!node) return null;
    
    if (node.type === "text") {
      const textNode = node as { text: LocalizedText };
      return textNode.text[locale] ?? textNode.text.en;
    }
    
    return null;
  }, [engine, isActive, currentTree, activeNpcIdx, locale]);

  const getChoices = useCallback((): Array<{ id: string; text: string }> => {
    if (!isActive || !currentTree || !activeNpcIdx) return [];

    const nodeId = engine.getCurrentNodeId();
    if (!nodeId) return [];

    const node = currentTree.nodes[nodeId];
    if (!node || node.type !== "choice") return [];

    const choiceNode = node as ChoiceNode;
    
    return choiceNode.choices.map((c) => ({
      id: c.id,
      text: c.text[locale] ?? c.text.en,
    }));
  }, [engine, isActive, currentTree, activeNpcIdx, locale]);

  const selectChoice = useCallback(
    (choiceId: string) => {
      engine.selectChoice(choiceId);
    },
    [engine]
  );

  const advance = useCallback(() => {
    engine.advance();
  }, [engine]);

  const isQuizTriggered = useCallback((): boolean => {
    if (!currentTree) return false;
    const nodeId = engine.getCurrentNodeId();
    if (!nodeId) return false;
    const node = currentTree.nodes[nodeId];
    return node?.type === "quiz";
  }, [engine, currentTree]);

  return {
    isActive,
    activeNpcIdx,
    currentTree,
    startDialogue,
    endDialogue,
    getCurrentText,
    getChoices,
    selectChoice,
    advance,
    isQuizTriggered,
  };
}
