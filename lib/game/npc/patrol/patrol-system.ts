/**
 * Patrol System
 *
 * Gameplay Phase 2: NPC Foundation
 * Handles NPC patrol behavior
 */

import type {
  PatrolState,
  PatrolConfig,
  PatrolResult,
  Waypoint,
  PatrolType,
} from "../types";

/**
 * Patrol system class
 */
export class PatrolSystem {
  private state: PatrolState;
  private config: PatrolConfig;
  private enabled = true;

  /**
   * Create patrol system
   */
  constructor(config: PatrolConfig) {
    this.config = config;
    this.state = {
      waypoints: config.waypoints,
      currentIndex: 0,
      direction: 1,
      waitTimer: 0,
      isWaiting: false,
    };
  }

  /**
   * Update patrol system
   */
  update(deltaTime: number): PatrolResult {
    if (!this.enabled || this.config.waypoints.length === 0) {
      return {
        nextPosition: this.getCurrentPosition(),
        reachedWaypoint: false,
        shouldWait: false,
      };
    }

    const currentWaypoint = this.state.waypoints[this.state.currentIndex];

    // Handle waiting at waypoint
    if (this.state.isWaiting) {
      this.state.waitTimer -= deltaTime;
      if (this.state.waitTimer <= 0) {
        this.state.isWaiting = false;
        this.state.waitTimer = 0;
        this.moveToNextWaypoint();
      }
      return {
        nextPosition: currentWaypoint.position,
        reachedWaypoint: false,
        shouldWait: true,
      };
    }

    // Move towards current waypoint
    const target = currentWaypoint.position;
    const current = this.getCurrentPosition();

    const dx = target.x - current.x;
    const dz = target.z - current.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < 0.1) {
      // Reached waypoint
      if (this.config.waitAtWaypoints && currentWaypoint.waitTime > 0) {
        this.state.isWaiting = true;
        this.state.waitTimer = currentWaypoint.waitTime;
      } else {
        this.moveToNextWaypoint();
      }
      return {
        nextPosition: target,
        reachedWaypoint: true,
        shouldWait: this.state.isWaiting,
      };
    }

    // Move towards target
    const speed = this.config.speed * deltaTime;
    const moveX = (dx / distance) * Math.min(speed, distance);
    const moveZ = (dz / distance) * Math.min(speed, distance);

    return {
      nextPosition: {
        x: current.x + moveX,
        y: current.y,
        z: current.z + moveZ,
      },
      reachedWaypoint: false,
      shouldWait: false,
    };
  }

  /**
   * Get current position (from last update)
   */
  getCurrentPosition(): { x: number; y: number; z: number } {
    if (this.state.waypoints.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }
    return this.state.waypoints[this.state.currentIndex].position;
  }

  /**
   * Get current waypoint
   */
  getCurrentWaypoint(): Waypoint | null {
    if (this.state.waypoints.length === 0) return null;
    return this.state.waypoints[this.state.currentIndex];
  }

  /**
   * Move to next waypoint
   */
  private moveToNextWaypoint(): void {
    const count = this.state.waypoints.length;
    if (count === 0) return;

    if (this.config.type === "pingpong") {
      // Ping-pong: go forward, then backward
      const nextIndex = this.state.currentIndex + this.state.direction;

      if (nextIndex >= count) {
        this.state.direction = -1;
        this.state.currentIndex = count - 2;
        if (this.state.currentIndex < 0) this.state.currentIndex = 0;
      } else if (nextIndex < 0) {
        this.state.direction = 1;
        this.state.currentIndex = 1;
        if (this.state.currentIndex >= count) this.state.currentIndex = count - 1;
      } else {
        this.state.currentIndex = nextIndex;
      }
    } else {
      // Loop: always go forward
      this.state.currentIndex = (this.state.currentIndex + 1) % count;
    }
  }

  /**
   * Reset to beginning
   */
  reset(): void {
    this.state.currentIndex = 0;
    this.state.direction = 1;
    this.state.waitTimer = 0;
    this.state.isWaiting = false;
  }

  /**
   * Enable/disable patrol
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if patrol is active
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get current state
   */
  getState(): PatrolState {
    return { ...this.state };
  }

  /**
   * Set current waypoint index (for deserialization)
   */
  setWaypointIndex(index: number): void {
    if (index >= 0 && index < this.state.waypoints.length) {
      this.state.currentIndex = index;
    }
  }

  /**
   * Set patrol direction (for deserialization)
   */
  setDirection(direction: 1 | -1): void {
    this.state.direction = direction;
  }

  /**
   * Get patrol type
   */
  getPatrolType(): PatrolType {
    return this.config.type;
  }

  /**
   * Get waypoint count
   */
  getWaypointCount(): number {
    return this.state.waypoints.length;
  }
}
