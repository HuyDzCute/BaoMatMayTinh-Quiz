/**
 * Patrol Types
 *
 * Gameplay Phase 2: NPC Foundation
 * Patrol system type definitions
 */

import type { Waypoint, PatrolType, Vector3D } from "./npc-types";

/**
 * Patrol state
 */
export interface PatrolState {
  waypoints: Waypoint[];
  currentIndex: number;
  direction: 1 | -1;
  waitTimer: number;
  isWaiting: boolean;
}

/**
 * Patrol configuration
 */
export interface PatrolConfig {
  type: PatrolType;
  waypoints: Waypoint[];
  speed: number;
  loop: boolean;
  waitAtWaypoints: boolean;
}

/**
 * Patrol result
 */
export interface PatrolResult {
  nextPosition: Vector3D;
  reachedWaypoint: boolean;
  shouldWait: boolean;
}

/**
 * Create default patrol config
 */
export function createPatrolConfig(
  waypoints: Waypoint[],
  type: PatrolType = "loop",
  speed: number = 2
): PatrolConfig {
  return {
    type,
    waypoints,
    speed,
    loop: true,
    waitAtWaypoints: true,
  };
}

/**
 * Create simple two-point patrol
 */
export function createLinearPatrol(
  start: Vector3D,
  end: Vector3D,
  speed: number = 2,
  waitTime: number = 1
): PatrolConfig {
  return {
    type: "pingpong",
    waypoints: [
      { position: start, waitTime },
      { position: end, waitTime },
    ],
    speed,
    loop: true,
    waitAtWaypoints: true,
  };
}

/**
 * Create circular patrol
 */
export function createCircularPatrol(
  center: Vector3D,
  radius: number,
  pointCount: number = 4,
  speed: number = 2,
  waitTime: number = 0.5
): PatrolConfig {
  const waypoints: Waypoint[] = [];
  for (let i = 0; i < pointCount; i++) {
    const angle = (i / pointCount) * Math.PI * 2;
    waypoints.push({
      position: {
        x: center.x + Math.cos(angle) * radius,
        y: center.y,
        z: center.z + Math.sin(angle) * radius,
      },
      waitTime,
    });
  }
  return {
    type: "loop",
    waypoints,
    speed,
    loop: true,
    waitAtWaypoints: true,
  };
}
