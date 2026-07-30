/**
 * NPC Manager
 *
 * Gameplay Phase 2: NPC Foundation
 * Centralized NPC registry and management
 */

import type {
  INPCManager,
  INPCEntity,
  NPCConfig,
  NPCSerializedState,
  Vector3D,
  NPCInteractionEvent,
} from "../types";
import { NPCController } from "./npc-controller";

/**
 * Event listener for all NPC events
 */
type NPCManagerCallback = (event: NPCInteractionEvent) => void;

/**
 * NPC Manager implementation
 */
export class NPCManager implements INPCManager {
  private npcs: Map<string, INPCEntity> = new Map();
  private listeners: Set<NPCManagerCallback> = new Set();

  /**
   * Register a new NPC with config
   */
  register(config: NPCConfig): INPCEntity {
    // Check if NPC already exists
    if (this.npcs.has(config.id)) {
      console.warn(`NPC with id "${config.id}" already exists. Replacing.`);
      this.npcs.delete(config.id);
    }

    const npc = new NPCController(config);

    // Subscribe to NPC events
    npc.subscribe((event) => {
      this.emit(event);
    });

    this.npcs.set(config.id, npc);
    return npc;
  }

  /**
   * Unregister and remove an NPC
   */
  unregister(id: string): boolean {
    const npc = this.npcs.get(id);
    if (npc) {
      npc.despawn();
      this.npcs.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Get NPC by ID
   */
  get(id: string): INPCEntity | undefined {
    return this.npcs.get(id);
  }

  /**
   * Get all NPCs
   */
  getAll(): INPCEntity[] {
    return Array.from(this.npcs.values());
  }

  /**
   * Get NPCs within proximity of a position
   */
  getByProximity(position: Vector3D, radius: number): INPCEntity[] {
    const result: INPCEntity[] = [];

    for (const npc of this.npcs.values()) {
      const state = npc.getState();
      const dx = state.position.x - position.x;
      const dy = state.position.y - position.y;
      const dz = state.position.z - position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance <= radius) {
        result.push(npc);
      }
    }

    // Sort by distance (closest first)
    result.sort((a, b) => {
      const stateA = a.getState();
      const stateB = b.getState();
      const distA = Math.sqrt(
        Math.pow(stateA.position.x - position.x, 2) +
        Math.pow(stateA.position.y - position.y, 2) +
        Math.pow(stateA.position.z - position.z, 2)
      );
      const distB = Math.sqrt(
        Math.pow(stateB.position.x - position.x, 2) +
        Math.pow(stateB.position.y - position.y, 2) +
        Math.pow(stateB.position.z - position.z, 2)
      );
      return distA - distB;
    });

    return result;
  }

  /**
   * Get the closest NPC to a position
   */
  getClosest(position: Vector3D): INPCEntity | null {
    const nearby = this.getByProximity(position, Infinity);
    return nearby.length > 0 ? nearby[0] : null;
  }

  /**
   * Update all NPCs
   */
  update(deltaTime: number, playerPosition?: Vector3D): void {
    for (const npc of this.npcs.values()) {
      npc.update(deltaTime, playerPosition);
    }
  }

  /**
   * Spawn all registered NPCs
   */
  spawnAll(): void {
    for (const npc of this.npcs.values()) {
      npc.spawn();
    }
  }

  /**
   * Despawn all NPCs
   */
  despawnAll(): void {
    for (const npc of this.npcs.values()) {
      npc.despawn();
    }
  }

  /**
   * Serialize all NPC states for saving
   */
  serialize(): NPCSerializedState[] {
    return this.getAll().map((npc) => npc.serialize());
  }

  /**
   * Deserialize and restore NPC states
   */
  deserialize(states: NPCSerializedState[]): void {
    for (const state of states) {
      const npc = this.npcs.get(state.id);
      if (npc) {
        npc.deserialize(state);
      }
    }
  }

  /**
   * Reset all NPCs to initial state
   */
  resetAll(): void {
    for (const npc of this.npcs.values()) {
      npc.reset();
    }
  }

  /**
   * Get NPC count
   */
  getCount(): number {
    return this.npcs.size;
  }

  /**
   * Check if NPC exists
   */
  has(id: string): boolean {
    return this.npcs.has(id);
  }

  /**
   * Subscribe to all NPC events
   */
  subscribe(callback: NPCManagerCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: NPCInteractionEvent): void {
    this.listeners.forEach((callback) => callback(event));
  }

  /**
   * Clear all NPCs
   */
  clear(): void {
    this.despawnAll();
    this.npcs.clear();
    this.listeners.clear();
  }
}

// Singleton instance
let npcManagerInstance: NPCManager | null = null;

/**
 * Get NPC manager singleton
 */
export function getNPCManager(): NPCManager {
  if (!npcManagerInstance) {
    npcManagerInstance = new NPCManager();
  }
  return npcManagerInstance;
}

/**
 * Reset NPC manager singleton
 */
export function resetNPCManager(): void {
  if (npcManagerInstance) {
    npcManagerInstance.clear();
    npcManagerInstance = null;
  }
}
