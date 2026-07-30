/**
 * WordRun3D — Game Collision System
 *
 * 2.5D Side-Scrolling Collision
 *
 * For a side-scrolling game, collision is much simpler:
 * - Horizontal bounds (level start/end)
 * - Floor (gravity-based)
 * - Obstacle blocking (boxes that block horizontal movement)
 * - NO depth-axis collision (Z is locked)
 * - NO camera collision (camera is fixed)
 *
 * Walls along the corridor (Z direction) are NOT collidable
 * because player cannot move in Z direction.
 */
"use client";

import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════════════════════
// COLLISION CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export const COLLISION_CONFIG = {
  // Player collision (X-axis only)
  playerRadius: 0.4,           // Player collision half-width
  playerHeight: 1.7,           // Player collision height

  // Ground
  groundLevel: 0,              // Y position of ground

  // Horizontal bounds
  levelMinX: -34,
  levelMaxX: 34,
};

// ═══════════════════════════════════════════════════════════════════════════════
// OBSTACLE INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simple box obstacle that blocks horizontal movement.
 * Defined in world space with min/max bounds.
 */
export interface BoxObstacle {
  id: string;
  minX: number;    // Left edge
  maxX: number;    // Right edge
  minY: number;    // Bottom edge
  maxY: number;    // Top edge
  // Z bounds not needed - side-scrolling
}

/**
 * Result of resolving horizontal movement against obstacles.
 */
export interface HorizontalResolveResult {
  x: number;             // Final X position
  blocked: boolean;      // True if an obstacle blocked movement
  obstacleId: string;    // ID of blocking obstacle (or "")
}

// ═══════════════════════════════════════════════════════════════════════════════
// HORIZONTAL MOVEMENT RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve horizontal movement against obstacles and level bounds.
 * Used by PlayerController to safely move along X axis.
 */
export function resolveHorizontalMovement(
  currentX: number,
  velocityX: number,
  deltaTime: number,
  playerY: number,
  obstacles: BoxObstacle[]
): HorizontalResolveResult {
  // Calculate desired X position
  let desiredX = currentX + velocityX * deltaTime;
  let blocked = false;
  let obstacleId = "";

  // Apply level bounds
  if (desiredX < COLLISION_CONFIG.levelMinX + COLLISION_CONFIG.playerRadius) {
    desiredX = COLLISION_CONFIG.levelMinX + COLLISION_CONFIG.playerRadius;
    blocked = true;
  }
  if (desiredX > COLLISION_CONFIG.levelMaxX - COLLISION_CONFIG.playerRadius) {
    desiredX = COLLISION_CONFIG.levelMaxX - COLLISION_CONFIG.playerRadius;
    blocked = true;
  }

  // Check against obstacles
  const playerMinX = desiredX - COLLISION_CONFIG.playerRadius;
  const playerMaxX = desiredX + COLLISION_CONFIG.playerRadius;
  const playerMinY = playerY;
  const playerMaxY = playerY + COLLISION_CONFIG.playerHeight;

  for (const obs of obstacles) {
    // Skip if no vertical overlap
    if (playerMaxY < obs.minY || playerMinY > obs.maxY) {
      continue;
    }

    // Horizontal overlap check
    if (playerMaxX > obs.minX && playerMinX < obs.maxX) {
      // Collision detected. Resolve based on movement direction.
      if (velocityX > 0) {
        // Moving right - block at obstacle's left edge
        desiredX = obs.minX - COLLISION_CONFIG.playerRadius;
      } else if (velocityX < 0) {
        // Moving left - block at obstacle's right edge
        desiredX = obs.maxX + COLLISION_CONFIG.playerRadius;
      }
      blocked = true;
      obstacleId = obs.id;
      break;
    }
  }

  return { x: desiredX, blocked, obstacleId };
}

/**
 * Check if a position is valid (not inside any obstacle).
 */
export function isValidPosition(
  x: number,
  y: number,
  obstacles: BoxObstacle[]
): boolean {
  for (const obs of obstacles) {
    if (
      x >= obs.minX - COLLISION_CONFIG.playerRadius &&
      x <= obs.maxX + COLLISION_CONFIG.playerRadius &&
      y >= obs.minY &&
      y <= obs.maxY - 0.1
    ) {
      return false;
    }
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUND / FALLING RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve vertical (Y-axis) movement against floor and platforms.
 * Returns the resolved Y position and whether player is on ground.
 */
export function resolveVerticalMovement(
  currentY: number,
  velocityY: number,
  deltaTime: number,
  currentX: number,
  obstacles: BoxObstacle[]
): { y: number; vy: number; onGround: boolean } {
  let newY = currentY + velocityY * deltaTime;
  let newVy = velocityY;
  let onGround = false;

  // Floor check
  if (newY <= COLLISION_CONFIG.groundLevel) {
    newY = COLLISION_CONFIG.groundLevel;
    newVy = 0;
    onGround = true;
    return { y: newY, vy: newVy, onGround };
  }

  // Platform/ceiling check
  const playerMinX = currentX - COLLISION_CONFIG.playerRadius;
  const playerMaxX = currentX + COLLISION_CONFIG.playerRadius;

  for (const obs of obstacles) {
    // Horizontal overlap check
    if (playerMaxX < obs.minX || playerMinX > obs.maxX) {
      continue;
    }

    // Hitting ceiling (moving up into obstacle bottom)
    if (newVy > 0 && newY + COLLISION_CONFIG.playerHeight > obs.minY &&
        currentY + COLLISION_CONFIG.playerHeight <= obs.minY) {
      newY = obs.minY - COLLISION_CONFIG.playerHeight;
      newVy = 0;
      return { y: newY, vy: newVy, onGround };
    }

    // Landing on top of platform (moving down onto obstacle top)
    if (newVy < 0 && newY < obs.maxY &&
        currentY >= obs.maxY) {
      newY = obs.maxY;
      newVy = 0;
      onGround = true;
      return { y: newY, vy: newVy, onGround };
    }
  }

  return { y: newY, vy: newVy, onGround };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE OBSTACLE BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build collision obstacles from scene meshes.
 * Used by CameraController or future systems.
 * (Not used by player currently - player uses bounds + gravity only.)
 */
export function buildObstaclesFromScene(scene: THREE.Scene): BoxObstacle[] {
  const obstacles: BoxObstacle[] = [];

  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (!obj.geometry) return;

    const name = obj.name.toLowerCase();

    // Only include specific obstacle types
    if (
      name.includes("desk") ||
      name.includes("chair") ||
      name.includes("locker") ||
      name.includes("vending") ||
      name.includes("cooler") ||
      name.includes("wall") ||
      name.includes("door")
    ) {
      // Compute world-space bounding box
      const box = new THREE.Box3().setFromObject(obj);
      if (!box.isEmpty()) {
        obstacles.push({
          id: obj.name || "unknown",
          minX: box.min.x,
          maxX: box.max.x,
          minY: box.min.y,
          maxY: box.max.y,
        });
      }
    }
  });

  return obstacles;
}
