/**
 * NPC Controller
 *
 * Gameplay Phase 2: NPC Foundation
 * Core NPC entity logic (separated from rendering)
 */

import type {
  INPCEntity,
  NPCState,
  NPCConfig,
  NPCSerializedState,
  Vector3D,
  NPCInteractionEvent,
  NPCBehaviorState,
} from "../types";
import { createDefaultNPCState } from "../types";
import { PatrolSystem } from "../patrol";

/**
 * Event listener type for NPC events
 */
type NPCCallback = (event: NPCInteractionEvent) => void;

/**
 * NPC controller implementation
 */
export class NPCController implements INPCEntity {
  readonly id: string;
  readonly config: NPCConfig;

  private state: NPCState;
  private patrolSystem: PatrolSystem | null = null;
  private listeners: Set<NPCCallback> = new Set();
  private wasPlayerNearby = false;
  private isActive = false;

  /**
   * Create NPC controller
   */
  constructor(config: NPCConfig) {
    this.id = config.id;
    this.config = config;
    this.state = createDefaultNPCState(config.id, config);

    // Initialize patrol if waypoints are configured
    // Note: patrol is optional, NPCs can be static
  }

  /**
   * Get current state
   */
  getState(): NPCState {
    return { ...this.state };
  }

  /**
   * Spawn NPC at spawn position
   */
  spawn(): void {
    this.state.position = { ...this.config.spawnPosition };
    this.state.rotation = this.config.facing;
    this.state.behaviorState = "idle";
    this.state.movementState = "idle";
    this.isActive = true;
    this.emit({ type: "interact_end", npcId: this.id, timestamp: Date.now() });
  }

  /**
   * Despawn NPC
   */
  despawn(): void {
    this.isActive = false;
  }

  /**
   * Update NPC state
   * @param deltaTime - Time since last update (seconds)
   * @param playerPosition - Optional player position for proximity detection
   */
  update(deltaTime: number, playerPosition?: Vector3D): void {
    if (!this.isActive) return;

    const dt = Math.min(deltaTime, 0.1); // Clamp delta time

    // Update cooldown timer
    if (this.state.interactionCooldownTimer > 0) {
      this.state.interactionCooldownTimer -= dt;
      if (this.state.interactionCooldownTimer <= 0) {
        this.state.interactionCooldownTimer = 0;
        this.state.interactionState = "available";
        this.emit({
          type: "cooldown_end",
          npcId: this.id,
          timestamp: Date.now(),
        });
      }
    }

    // Handle interaction
    if (this.state.isInteracting) {
      // During interaction, NPC should be idle
      this.state.movementState = "idle";
      this.state.behaviorState = "interact";
      return;
    }

    // Proximity detection
    if (playerPosition) {
      const distance = this.calculateDistance(playerPosition);
      const isPlayerNearby = distance <= this.config.interactionRadius;

      if (isPlayerNearby && !this.wasPlayerNearby) {
        this.wasPlayerNearby = true;
        this.emit({
          type: "proximity_enter",
          npcId: this.id,
          playerPosition,
          timestamp: Date.now(),
        });
      } else if (!isPlayerNearby && this.wasPlayerNearby) {
        this.wasPlayerNearby = false;
        this.emit({
          type: "proximity_exit",
          npcId: this.id,
          playerPosition,
          timestamp: Date.now(),
        });
      }
    }

    // Update patrol if active
    if (this.patrolSystem && this.patrolSystem.isEnabled()) {
      this.updatePatrol(dt);
    } else {
      // Idle behavior
      this.state.movementState = "idle";
      this.state.behaviorState = "idle";
    }
  }

  /**
   * Update patrol behavior
   */
  private updatePatrol(dt: number): void {
    if (!this.patrolSystem) return;

    const result = this.patrolSystem.update(dt);

    // Update position
    this.state.position = result.nextPosition;

    // Update state based on patrol result
    if (result.shouldWait) {
      this.state.movementState = "idle";
      this.state.behaviorState = "wait";
    } else if (result.reachedWaypoint) {
      this.state.movementState = "idle";
      this.state.behaviorState = "idle";
    } else {
      this.state.movementState = "walk";
      this.state.behaviorState = "patrol";

      // Update rotation to face movement direction
      const current = this.patrolSystem.getCurrentPosition();
      const target = this.patrolSystem.getCurrentWaypoint()?.position;
      if (target) {
        const dx = target.x - current.x;
        const dz = target.z - current.z;
        if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
          this.state.rotation = Math.atan2(dx, dz);
        }
      }
    }

    // Update NPC state with patrol info
    this.state.currentWaypointIndex = this.patrolSystem.getState().currentIndex;
    this.state.patrolDirection = this.patrolSystem.getState().direction;
  }

  /**
   * Trigger interaction with NPC
   */
  interact(): void {
    if (!this.isActive) return;
    if (this.state.interactionState === "cooldown") return;
    if (this.state.interactionState === "interacting") return;

    this.state.isInteracting = true;
    this.state.interactionState = "interacting";
    this.state.behaviorState = "interact";
    this.state.lastInteractionTime = Date.now();

    this.emit({
      type: "interact_start",
      npcId: this.id,
      playerPosition: this.state.position,
      timestamp: Date.now(),
    });
  }

  /**
   * End interaction
   */
  endInteraction(): void {
    if (!this.state.isInteracting) return;

    this.state.isInteracting = false;
    this.state.interactionState = "cooldown";
    this.state.interactionCooldownTimer = this.config.interactionCooldown;
    this.state.behaviorState = "idle";

    this.emit({
      type: "interact_end",
      npcId: this.id,
      timestamp: Date.now(),
    });
  }

  /**
   * Reset NPC to initial state
   */
  reset(): void {
    this.state = createDefaultNPCState(this.config.id, this.config);
    if (this.patrolSystem) {
      this.patrolSystem.reset();
    }
    this.wasPlayerNearby = false;
    this.isActive = false;
  }

  /**
   * Serialize state for save/load
   */
  serialize(): NPCSerializedState {
    return {
      id: this.id,
      position: { ...this.state.position },
      rotation: this.state.rotation,
      behaviorState: this.state.behaviorState,
      interactionState: this.state.interactionState,
      currentWaypointIndex: this.state.currentWaypointIndex,
      patrolDirection: this.state.patrolDirection,
      lastInteractionTime: this.state.lastInteractionTime,
      data: { ...this.state.data },
    };
  }

  /**
   * Deserialize state from save/load
   */
  deserialize(state: Partial<NPCSerializedState>): void {
    if (state.position) {
      this.state.position = { ...state.position };
    }
    if (state.rotation !== undefined) {
      this.state.rotation = state.rotation;
    }
    if (state.behaviorState) {
      this.state.behaviorState = state.behaviorState;
    }
    if (state.interactionState) {
      this.state.interactionState = state.interactionState;
    }
    if (state.currentWaypointIndex !== undefined) {
      this.state.currentWaypointIndex = state.currentWaypointIndex;
      if (this.patrolSystem) {
        this.patrolSystem.setWaypointIndex(state.currentWaypointIndex);
      }
    }
    if (state.patrolDirection) {
      this.state.patrolDirection = state.patrolDirection;
      if (this.patrolSystem) {
        this.patrolSystem.setDirection(state.patrolDirection);
      }
    }
    if (state.lastInteractionTime !== undefined) {
      this.state.lastInteractionTime = state.lastInteractionTime;
    }
    if (state.data) {
      this.state.data = { ...state.data };
    }

    // Recalculate cooldown timer based on last interaction
    if (state.interactionState === "cooldown") {
      const timeSinceInteraction = (Date.now() - this.state.lastInteractionTime) / 1000;
      this.state.interactionCooldownTimer = Math.max(
        0,
        this.config.interactionCooldown - timeSinceInteraction
      );
    }
  }

  /**
   * Check if player is nearby
   */
  isPlayerNearby(playerPosition: Vector3D): boolean {
    return this.calculateDistance(playerPosition) <= this.config.interactionRadius;
  }

  /**
   * Get distance to player
   */
  getDistanceToPlayer(playerPosition: Vector3D): number {
    return this.calculateDistance(playerPosition);
  }

  /**
   * Calculate 3D distance
   */
  private calculateDistance(other: Vector3D): number {
    const dx = this.state.position.x - other.x;
    const dy = this.state.position.y - other.y;
    const dz = this.state.position.z - other.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Set behavior state directly
   */
  setBehaviorState(state: NPCBehaviorState): void {
    this.state.behaviorState = state;
  }

  /**
   * Enable/disable patrol
   */
  setPatrolEnabled(enabled: boolean): void {
    if (this.patrolSystem) {
      this.patrolSystem.setEnabled(enabled);
    }
  }

  /**
   * Set patrol path
   */
  setPatrol(patrolSystem: PatrolSystem): void {
    this.patrolSystem = patrolSystem;
  }

  /**
   * Subscribe to NPC events
   */
  subscribe(callback: NPCCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Emit event to listeners
   */
  private emit(event: NPCInteractionEvent): void {
    this.listeners.forEach((callback) => callback(event));
  }

  /**
   * Check if NPC is active
   */
  isSpawned(): boolean {
    return this.isActive;
  }

  /**
   * Check if interaction is available
   */
  canInteract(): boolean {
    return (
      this.isActive &&
      !this.state.isInteracting &&
      this.state.interactionState !== "cooldown"
    );
  }
}
