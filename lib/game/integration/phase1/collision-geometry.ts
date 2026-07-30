/**
 * Collision Geometry — Phase 1 Validation Area
 *
 * Phase 1 of production integration: only a SMALL section of the
 * production map is wired with the validated 2.5D collision model.
 * The rest of the production map continues to use legacy rendering
 * without collision (see `WordRunGame.tsx` feature flag).
 *
 * RULE: This file must NEVER be touched outside of Phase 1 integration.
 *       Adding more obstacles here is part of Phase 2+.
 */

import type { BoxObstacle } from "@/lib/game/collision/BoxObstacle";

/**
 * Phase 1 validation area — X range: -10 to +10.
 * Visual elements inside this range that block movement.
 *
 * Coordinates are chosen to align with production map furniture
 * (lockers, bench, etc.) but in Phase 1 we treat them as simplified
 * AABB blockers. Real geometry is rendered by `<WorldScene />` —
 * this list is the COLLISION-only counterpart.
 */
export const PHASE1_OBSTACLES: ReadonlyArray<BoxObstacle> = [
  // Left locker cluster at X = -7 (matches LockerRow spacing)
  {
    id: "locker-left-1",
    minX: -7.4,
    maxX: -6.6,
    minY: 0,
    maxY: 2.4,
  },
  // Right-side bench at X = +5
  {
    id: "bench-right",
    minX: 4.6,
    maxX: 5.4,
    minY: 0,
    maxY: 0.5,
  },
  // Small classroom door threshold at X = +8
  {
    id: "door-threshold",
    minX: 7.7,
    maxX: 8.3,
    minY: 0,
    maxY: 2.0,
  },
];

/**
 * Player spawn point for the Phase 1 validation area.
 * MUST lie outside all obstacles, on the ground.
 */
export const PHASE1_SPAWN = {
  x: -8,
  y: 0,
  z: 0,
} as const;

/**
 * Camera bounds used in Phase 1.
 *
 * We reuse the production `DEFAULT_CAMERA_BOUNDS` so that:
 *   - Camera position is identical between Phase 1 and legacy code.
 *   - Rollback to legacy produces no visual jump.
 */
export const PHASE1_CAMERA_BOUNDS = {
  minX: -34,
  maxX: 34,
} as const;