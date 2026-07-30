/**
 * CameraBounds — Shared camera bounds type for 2.5D side-scrolling.
 *
 * Phase: Module extraction (additive, non-breaking).
 *
 * Purpose:
 *   - Allow `SideScrollCameraController` to accept level bounds via props
 *     instead of hard-coded constants.
 *   - Provide a default factory that mirrors production bounds, so existing
 *     callers continue to work without changes.
 *
 * RULE: This file must NEVER import React, R3F, or Three.js.
 *       It is pure types and constants.
 */

import { WORLD } from "@/lib/world-constants";

/**
 * Camera horizontal bounds — restricts how far the camera can travel
 * along the X axis. Camera X is clamped to [minX, maxX] regardless
 * of player position.
 */
export interface CameraBounds {
  /** Minimum camera X (inclusive). */
  minX: number;
  /** Maximum camera X (inclusive). */
  maxX: number;
}

/**
 * Production default — uses `WORLD.PLAYABLE_MIN_X` and `WORLD.PLAYABLE_MAX_X`.
 * This keeps backward compatibility with any caller that does not pass bounds.
 */
export const DEFAULT_CAMERA_BOUNDS: CameraBounds = {
  minX: WORLD.PLAYABLE_MIN_X,
  maxX: WORLD.PLAYABLE_MAX_X,
};

/**
 * Test sandbox default — narrower level used by `/test-25d` for fast validation.
 * Matches the bounds in `MinimalSideScrollTest.tsx` (CFG.levelMinX/MaxX).
 */
export const TEST_CAMERA_BOUNDS: CameraBounds = {
  minX: -14,
  maxX: 14,
};

/**
 * Clamp an X value to the given bounds.
 */
export function clampToBounds(x: number, bounds: CameraBounds): number {
  if (x < bounds.minX) return bounds.minX;
  if (x > bounds.maxX) return bounds.maxX;
  return x;
}
