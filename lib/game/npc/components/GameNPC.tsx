"use client";

/**
 * Game NPC Component
 *
 * Gameplay Phase 2: NPC Foundation
 * Main NPC component that combines all systems
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { NPCProvider, useNPCContext } from "./NPCContext";
import { NPCEntity } from "./NPCEntity";
import type { NPCConfig, Vector3D, INPCEntity } from "../types";

/**
 * Game NPC props
 */
export interface GameNPCProps {
  /** NPC config to register */
  config?: NPCConfig;
  /** Auto-spawn NPC */
  autoSpawn?: boolean;
  /** Enable animations */
  animate?: boolean;
  /** Children */
  children?: React.ReactNode;
}

/**
 * Game NPC internal component
 */
function GameNPCInternal({
  animate = true,
  children,
}: {
  animate?: boolean;
  children?: React.ReactNode;
}) {
  const { npcManager, update, nearbyNPCs } = useNPCContext();
  const lastTime = useRef(0);
  const playerPosRef = useRef<Vector3D>({ x: 0, y: 0, z: 0 });

  // Main update loop
  useFrame((state, delta) => {
    // Calculate delta time
    const currentTime = state.clock.getElapsedTime();
    const deltaTime = lastTime.current > 0 ? currentTime - lastTime.current : delta;
    lastTime.current = currentTime;

    // Update NPCs with player position
    update(deltaTime, playerPosRef.current);
  });

  // Get all spawned NPCs
  const npcs: INPCEntity[] = useMemo(() => {
    return npcManager.getAll().filter((npc: INPCEntity) => npc.isSpawned());
  }, [npcManager]);

  return (
    <>
      {/* Render all NPCs */}
      {npcs.map((npc: INPCEntity) => (
        <NPCEntity key={npc.id} npc={npc} animate={animate} />
      ))}

      {/* Interaction prompt for nearby NPCs */}
      {nearbyNPCs.length > 0 && (
        <InteractionPrompts npcIds={nearbyNPCs} />
      )}

      {/* Children */}
      {children}
    </>
  );
}

/**
 * Interaction prompts component
 */
function InteractionPrompts({ npcIds }: { npcIds: string[] }) {
  const { npcManager } = useNPCContext();

  return (
    <>
      {npcIds.map((npcId) => {
        const npc = npcManager.get(npcId);
        if (!npc) return null;

        const state = npc.getState();
        if (state.interactionState === "cooldown") return null;

        return (
          <InteractionPrompt
            key={npcId}
            position={state.position}
            npcName={npc.config.name}
            canInteract={npc.canInteract()}
          />
        );
      })}
    </>
  );
}

/**
 * Single interaction prompt
 */
function InteractionPrompt({
  npcName,
  canInteract,
}: {
  position: Vector3D;
  npcName: string;
  canInteract: boolean;
}) {
  // This is a placeholder - actual UI rendering would use Html from @react-three/drei
  // or a separate DOM overlay
  void npcName;
  void canInteract;
  return null;
}

/**
 * Game NPC component with provider
 */
export function GameNPC(props: GameNPCProps) {
  return (
    <NPCProvider autoSpawn={props.autoSpawn} configs={props.config ? [props.config] : []}>
      <GameNPCInternal animate={props.animate}>
        {props.children}
      </GameNPCInternal>
    </NPCProvider>
  );
}

/**
 * Game NPC manager component (manages multiple NPCs)
 */
export interface GameNPCManagerProps {
  /** NPC configs to register */
  configs: NPCConfig[];
  /** Auto-spawn NPCs */
  autoSpawn?: boolean;
  /** Enable animations */
  animate?: boolean;
  /** Player position ref for proximity detection */
  playerPositionRef?: React.MutableRefObject<Vector3D>;
  /** Callback when NPC is nearby */
  onNPCNearby?: (npcId: string | null) => void;
  /** Callback when interaction starts */
  onInteractionStart?: (npcId: string) => void;
  /** Callback when interaction ends */
  onInteractionEnd?: (npcId: string) => void;
  /** Children */
  children?: React.ReactNode;
}

export function GameNPCManager({
  configs,
  autoSpawn = true,
  animate = true,
  playerPositionRef,
  onNPCNearby,
  onInteractionStart,
  onInteractionEnd,
  children,
}: GameNPCManagerProps) {
  return (
    <NPCProvider autoSpawn={autoSpawn} configs={configs}>
      <GameNPCManagerInternal
        animate={animate}
        playerPositionRef={playerPositionRef}
        onNPCNearby={onNPCNearby}
        onInteractionStart={onInteractionStart}
        onInteractionEnd={onInteractionEnd}
      >
        {children}
      </GameNPCManagerInternal>
    </NPCProvider>
  );
}

function GameNPCManagerInternal({
  animate,
  playerPositionRef,
  onNPCNearby,
  onInteractionStart,
  onInteractionEnd,
  children,
}: {
  animate?: boolean;
  playerPositionRef?: React.MutableRefObject<Vector3D>;
  onNPCNearby?: (npcId: string | null) => void;
  onInteractionStart?: (npcId: string) => void;
  onInteractionEnd?: (npcId: string) => void;
  children?: React.ReactNode;
}) {
  const { npcManager, update, nearbyNPCs, selectedNPC } = useNPCContext();
  const lastTime = useRef(0);
  const lastNearbyRef = useRef<string | null>(null);

  // Main update loop
  useFrame((state, delta) => {
    // Calculate delta time
    const currentTime = state.clock.getElapsedTime();
    const deltaTime = lastTime.current > 0 ? currentTime - lastTime.current : delta;
    lastTime.current = currentTime;

    // Get player position from ref if provided
    const playerPos = playerPositionRef?.current;

    // Update NPCs
    update(deltaTime, playerPos);

    // Check for nearby NPC changes
    const closestNPC = nearbyNPCs.length > 0 ? nearbyNPCs[0] : null;
    if (closestNPC !== lastNearbyRef.current) {
      lastNearbyRef.current = closestNPC;
      onNPCNearby?.(closestNPC);
    }

    // Check for interaction state changes
    const lastSelectedRef = useRef<string | null>(null);
    if (selectedNPC !== lastSelectedRef.current) {
      if (lastSelectedRef.current && !selectedNPC) {
        onInteractionEnd?.(lastSelectedRef.current);
      }
      lastSelectedRef.current = selectedNPC;
    }
    if (selectedNPC && onInteractionStart) {
      const npc = npcManager.get(selectedNPC);
      const npcState = npc?.getState();
      if (npcState && !npcState.isInteracting) {
        onInteractionStart(selectedNPC);
      }
    }
  });

  // Get all spawned NPCs
  const npcs: INPCEntity[] = useMemo(() => {
    return npcManager.getAll().filter((npc: INPCEntity) => npc.isSpawned());
  }, [npcManager]);

  return (
    <>
      {/* Render all NPCs */}
      {npcs.map((npc: INPCEntity) => (
        <NPCEntity key={npc.id} npc={npc} animate={animate} />
      ))}

      {/* Children */}
      {children}
    </>
  );
}

// Re-export
export { NPCProvider, useNPCContext, useNearbyNPCs, useSelectedNPC, useNPC, useNPCInteraction } from "./NPCContext";
export { NPCEntity } from "./NPCEntity";
