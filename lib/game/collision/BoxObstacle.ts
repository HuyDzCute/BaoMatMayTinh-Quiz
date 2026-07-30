/**
 * BoxObstacle — Shared collision geometry type for 2.5D side-scrolling.
 *
 * Phase: Module extraction (additive, non-breaking).
 *
 * This is a PURE TYPE + pure-function module. It does NOT depend on
 * React, R3F, Three.js, or any production-side state.
 *
 * Purpose:
 *   - Allow the /test-25d sandbox to reuse the same collision model
 *     as production, without dragging in the full `lib/collision.ts`
 *     dependency surface.
 *   - Mirror the public types and helpers from `lib/collision.ts`.
 *
 * RULE: This file must NEVER import from `lib/collision.ts`. It is
 * the canonical location for the side-scroll collision model.
 *
 * RULE: `lib/collision.ts` remains the production-side entry point
 * for now. New code should prefer this module. A future refactor may
 * consolidate them.
 */

// ─────────────────────────────────────────────────────────────────────────────
// AABB TYPE — single source of truth for 2.5D box obstacles.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Axis-aligned box obstacle.
 *
 * 2.5D side-scrolling semantics:
 *   - X axis: gameplay movement axis (blocks horizontal motion)
 *   - Y axis: vertical axis (jump/landing)
 *   - Z axis: depth — NOT used for collision (player Z is locked)
 */
export interface BoxObstacle {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Result of resolving horizontal movement against obstacles.
 */
export interface HorizontalResolveResult {
  /** Final X position after resolution. */
  x: number;
  /** True if an obstacle or level bound blocked movement. */
  blocked: boolean;
  /** ID of the blocking obstacle, or empty string if no obstacle. */
  obstacleId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// COLLISION CONFIG — pure constants, no React/Three.js deps.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pure collision configuration. Mirrors `COLLISION_CONFIG` from
 * `lib/collision.ts` but is independently importable.
 */
export const COLLISION_CONFIG = {
  /** Player collision half-width on X axis. */
  playerRadius: 0.4,
  /** Player collision height on Y axis. */
  playerHeight: 1.7,

  /** Floor Y position. */
  groundLevel: 0,

  /** Level horizontal bounds (side-scroll playable area). */
  levelMinX: -34,
  levelMaxX: 34,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// HORIZONTAL RESOLUTION — pure function, frame-rate independent input.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve horizontal (X axis) movement against obstacles and level bounds.
 *
 * Behavior:
 *   - Computes desired X position from current + velocity * dt.
 *   - Clamps to [levelMinX + r, levelMaxX - r].
 *   - For each obstacle with vertical overlap, if the player AABB
 *     intersects the obstacle AABB, snaps to the obstacle's edge
 *     along the direction of motion.
 *
 * @param currentX    Current player X position.
 * @param velocityX   Player X velocity (units/sec).
 * @param deltaTime   Frame delta in seconds.
 * @param playerY     Current player Y position (feet).
 * @param obstacles   List of box obstacles.
 */
export function resolveHorizontalMovement(
  currentX: number,
  velocityX: number,
  deltaTime: number,
  playerY: number,
  obstacles: ReadonlyArray<BoxObstacle>
): HorizontalResolveResult {
  let desiredX = currentX + velocityX * deltaTime;
  let blocked = false;
  let obstacleId = "";

  // Level bounds
  if (desiredX < COLLISION_CONFIG.levelMinX + COLLISION_CONFIG.playerRadius) {
    desiredX = COLLISION_CONFIG.levelMinX + COLLISION_CONFIG.playerRadius;
    blocked = true;
  }
  if (desiredX > COLLISION_CONFIG.levelMaxX - COLLISION_CONFIG.playerRadius) {
    desiredX = COLLISION_CONFIG.levelMaxX - COLLISION_CONFIG.playerRadius;
    blocked = true;
  }

  // Obstacles
  const playerMinX = desiredX - COLLISION_CONFIG.playerRadius;
  const playerMaxX = desiredX + COLLISION_CONFIG.playerRadius;
  const playerMinY = playerY;
  const playerMaxY = playerY + COLLISION_CONFIG.playerHeight;

  for (const obs of obstacles) {
    if (playerMaxY < obs.minY || playerMinY > obs.maxY) continue;
    if (playerMaxX > obs.minX && playerMinX < obs.maxX) {
      if (velocityX > 0) {
        desiredX = obs.minX - COLLISION_CONFIG.playerRadius;
      } else if (velocityX < 0) {
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
 * Check whether a given (x, y) point is inside any obstacle's
 * "solid" zone (with player radius padding).
 */
export function isValidPosition(
  x: number,
  y: number,
  obstacles: ReadonlyArray<BoxObstacle>
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

// ─────────────────────────────────────────────────────────────────────────────
// VERTICAL RESOLUTION — pure function, no React/Three.js deps.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve vertical (Y axis) movement against floor and platforms.
 *
 * Returns the resolved Y, new velocity, and ground flag.
 */
export function resolveVerticalMovement(
  currentY: number,
  velocityY: number,
  deltaTime: number,
  currentX: number,
  obstacles: ReadonlyArray<BoxObstacle>
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
    if (playerMaxX < obs.minX || playerMinX > obs.maxX) continue;

    // Ceiling: moving up into obstacle bottom
    if (
      newVy > 0 &&
      newY + COLLISION_CONFIG.playerHeight > obs.minY &&
      currentY + COLLISION_CONFIG.playerHeight <= obs.minY
    ) {
      newY = obs.minY - COLLISION_CONFIG.playerHeight;
      newVy = 0;
      return { y: newY, vy: newVy, onGround };
    }

    // Platform landing: moving down onto obstacle top
    if (
      newVy < 0 &&
      newY < obs.maxY &&
      currentY >= obs.maxY
    ) {
      newY = obs.maxY;
      newVy = 0;
      onGround = true;
      return { y: newY, vy: newVy, onGround };
    }
  }

  return { y: newY, vy: newVy, onGround };
}
