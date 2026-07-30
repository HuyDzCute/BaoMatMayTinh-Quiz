/**
 * NPC Registry
 *
 * Gameplay Phase 2: NPC Foundation
 * Central NPC configuration registry
 */

import type { NPCConfig } from "../types";
import { createNPCConfig } from "../types";

/**
 * Default NPC configurations for WordRun game
 */
export const NPC_REGISTRY: Record<string, NPCConfig> = {
  "npc_teacher_1": createNPCConfig(
    "npc_teacher_1",
    "Teacher Sarah",
    { x: 14, y: 0, z: 0 },
    {
      color: "#f472b6", // Pink
      facing: 0,
      interactionRadius: 2.5,
      interactionCooldown: 5,
      patrolType: "loop",
      patrolSpeed: 0, // 0 = no patrol (static NPC)
      idleAnimationEnabled: true,
      metadata: {
        type: "teacher",
        greeting: "Hello! Ready for a vocabulary challenge?",
      },
    }
  ),

  "npc_teacher_2": createNPCConfig(
    "npc_teacher_2",
    "Teacher Michael",
    { x: 32, y: 0, z: 0 },
    {
      color: "#a78bfa", // Purple
      facing: 0,
      interactionRadius: 2.5,
      interactionCooldown: 5,
      patrolType: "loop",
      patrolSpeed: 0, // 0 = no patrol (static NPC)
      idleAnimationEnabled: true,
      metadata: {
        type: "teacher",
        greeting: "Welcome! Let's test your English skills!",
      },
    }
  ),

  "npc_teacher_3": createNPCConfig(
    "npc_teacher_3",
    "Teacher Lisa",
    { x: 52, y: 0, z: 0 },
    {
      color: "#34d399", // Green
      facing: 0,
      interactionRadius: 2.5,
      interactionCooldown: 5,
      patrolType: "loop",
      patrolSpeed: 0, // 0 = no patrol (static NPC)
      idleAnimationEnabled: true,
      metadata: {
        type: "teacher",
        greeting: "Great to see you! Ready for the next challenge?",
      },
    }
  ),
};

/**
 * Get NPC config by ID
 */
export function getNPCConfig(id: string): NPCConfig | undefined {
  return NPC_REGISTRY[id];
}

/**
 * Get all NPC configs
 */
export function getAllNPCConfigs(): NPCConfig[] {
  return Object.values(NPC_REGISTRY);
}

/**
 * Get NPC configs by type
 */
export function getNPCConfigsByType(type: string): NPCConfig[] {
  return Object.values(NPC_REGISTRY).filter(
    (config) => config.metadata?.type === type
  );
}

/**
 * Register a custom NPC config
 */
export function registerNPCConfig(config: NPCConfig): void {
  NPC_REGISTRY[config.id] = config;
}

/**
 * Create a patrol-enabled NPC config
 */
export function createPatrolNPCConfig(
  id: string,
  name: string,
  startPosition: { x: number; y: number; z: number },
  endPosition: { x: number; y: number; z: number },
  options?: Partial<Omit<NPCConfig, "id" | "name" | "spawnPosition" | "patrolType" | "patrolSpeed">>
): NPCConfig {
  return createNPCConfig(id, name, startPosition, {
    patrolType: "pingpong",
    patrolSpeed: 2,
    ...options,
  });
}
