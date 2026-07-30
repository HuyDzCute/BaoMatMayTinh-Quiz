/**
 * NPC Types
 *
 * Gameplay Phase 2: NPC Foundation
 * Core type definitions for NPC entities
 */

/**
 * NPC movement state
 */
export type NPCMovementState = "idle" | "walk" | "run" | "jump" | "fall";

/**
 * NPC behavior state
 */
export type NPCBehaviorState = "idle" | "patrol" | "wait" | "interact" | "disabled";

/**
 * NPC interaction state
 */
export type NPCInteractionState = "available" | "cooldown" | "interacting" | "completed";

/**
 * Patrol type
 */
export type PatrolType = "loop" | "pingpong";

/**
 * 3D Vector type
 */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Waypoint for patrol paths
 */
export interface Waypoint {
  position: Vector3D;
  waitTime: number; // seconds to wait at this waypoint
  facing?: number; // rotation in radians
}

/**
 * NPC configuration
 */
export interface NPCConfig {
  readonly id: string;
  readonly name: string;
  readonly spawnPosition: Vector3D;
  readonly facing: number;
  readonly color: string;
  readonly interactionRadius: number;
  readonly interactionCooldown: number; // seconds
  readonly patrolType: PatrolType;
  readonly patrolSpeed: number;
  readonly idleAnimationEnabled: boolean;
  readonly metadata?: Record<string, unknown>;
}

/**
 * NPC state
 */
export interface NPCState {
  id: string;
  position: Vector3D;
  rotation: number;
  behaviorState: NPCBehaviorState;
  movementState: NPCMovementState;
  interactionState: NPCInteractionState;
  currentWaypointIndex: number;
  patrolDirection: 1 | -1;
  waitTimer: number;
  interactionCooldownTimer: number;
  isInteracting: boolean;
  lastInteractionTime: number;
  data: Record<string, unknown>;
}

/**
 * NPC entity interface
 */
export interface INPCEntity {
  readonly id: string;
  readonly config: NPCConfig;
  getState(): NPCState;
  update(deltaTime: number, playerPosition?: Vector3D): void;
  spawn(): void;
  despawn(): void;
  interact(): void;
  endInteraction(): void;
  reset(): void;
  serialize(): NPCSerializedState;
  deserialize(state: Partial<NPCSerializedState>): void;
  isSpawned(): boolean;
  canInteract(): boolean;
  isPlayerNearby(playerPosition: Vector3D): boolean;
  getDistanceToPlayer(playerPosition: Vector3D): number;
}

/**
 * NPC serialized state for save/load
 */
export interface NPCSerializedState {
  id: string;
  position: Vector3D;
  rotation: number;
  behaviorState: NPCBehaviorState;
  interactionState: NPCInteractionState;
  currentWaypointIndex: number;
  patrolDirection: 1 | -1;
  lastInteractionTime: number;
  data: Record<string, unknown>;
}

/**
 * Interaction event
 */
export interface NPCInteractionEvent {
  type: "proximity_enter" | "proximity_exit" | "interact" | "interact_start" | "interact_end" | "cooldown_start" | "cooldown_end";
  npcId: string;
  playerPosition?: Vector3D;
  timestamp: number;
}

/**
 * NPC Manager interface
 */
export interface INPCManager {
  register(config: NPCConfig): INPCEntity;
  unregister(id: string): boolean;
  get(id: string): INPCEntity | undefined;
  getAll(): INPCEntity[];
  getByProximity(position: Vector3D, radius: number): INPCEntity[];
  update(deltaTime: number, playerPosition?: Vector3D): void;
  spawnAll(): void;
  despawnAll(): void;
  serialize(): NPCSerializedState[];
  deserialize(states: NPCSerializedState[]): void;
}

/**
 * Default NPC configuration factory
 */
export function createNPCConfig(
  id: string,
  name: string,
  spawnPosition: Vector3D,
  options?: Partial<Omit<NPCConfig, "id" | "name" | "spawnPosition">>
): NPCConfig {
  return {
    id,
    name,
    spawnPosition,
    facing: 0,
    color: "#f472b6",
    interactionRadius: 2.5,
    interactionCooldown: 5,
    patrolType: "loop",
    patrolSpeed: 2,
    idleAnimationEnabled: true,
    ...options,
  };
}

/**
 * Create default NPC state
 */
export function createDefaultNPCState(id: string, config: NPCConfig): NPCState {
  return {
    id,
    position: { ...config.spawnPosition },
    rotation: config.facing,
    behaviorState: "idle",
    movementState: "idle",
    interactionState: "available",
    currentWaypointIndex: 0,
    patrolDirection: 1,
    waitTimer: 0,
    interactionCooldownTimer: 0,
    isInteracting: false,
    lastInteractionTime: 0,
    data: {},
  };
}
