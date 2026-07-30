/**
 * World Constants — Shared across all environment components
 * Phase 1 Refactor: Separated for Unity migration compatibility
 */

// ─── World Constants ───────────────────────────────────────────────────────────
export const WORLD = {
  // Physics
  GROUND_Y: 0,
  GRAVITY: 22,
  JUMP_VELOCITY: 9,
  PLAYER_SPEED: 6,
  PLAYER_RADIUS: 0.4,
  START_X: 4,

  // Hallway dimensions
  CORRIDOR_LENGTH: 70,
  CORRIDOR_WIDTH: 6,   // z: -3 to +3
  CORRIDOR_HEIGHT: 4,

  // Locker
  LOCKER_WIDTH: 0.5,
  LOCKER_HEIGHT: 2.4,
  LOCKER_DEPTH: 0.3,

  // Door
  DOOR_WIDTH: 1.2,
  DOOR_HEIGHT: 2.6,

  // NPC
  NPC_COUNT: 3,
} as const;

export const NPC_POSITIONS = [14, 32, 52] as const;
export const WORLD_HALF = (WORLD.CORRIDOR_LENGTH ?? 70) / 2 - 1;
export const WORLD_MAX_Z = (WORLD.CORRIDOR_WIDTH ?? 6) / 2 - 0.5;

// ─── Colors ───────────────────────────────────────────────────────────────────
export const COLORS = {
  floor: "#a89078",
  floorTile: "#c4b49a",
  wall: "#e8dcc8",
  wallStripe: "#d4c4a8",
  wallBaseboard: "#8b7355",
  wallChairRail: "#a89078",
  wallCornice: "#f5f0e8",
  wallPanelLine: "#c4b49a",
  lockerBody: "#2563eb",
  lockerDark: "#1d4ed8",
  lockerHandle: "#fbbf24",
  door: "#92400e",
  doorFrame: "#78350f",
  ceiling: "#f5f0e8",
  ceilingLight: "#fef9c3",
  lightGlow: "#fef08a",
  windowFrame: "#f5f0e8",
} as const;
