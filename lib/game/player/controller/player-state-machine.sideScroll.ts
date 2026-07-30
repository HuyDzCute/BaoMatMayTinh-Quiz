/**
 * PlayerStateMachine — Side-Scroll Only
 *
 * Phase: New module (additive, non-breaking).
 *
 * This is a PURE state machine for the 2.5D side-scrolling gameplay model:
 *   - Movement axis: X (only)
 *   - Depth axis Z: locked at the configured LANE_Z (constant)
 *   - Jump axis Y: gravity + jump velocity
 *
 * It does NOT import React, R3F, Three.js, or any production controller.
 * It does NOT mutate the network, the DOM, or any module-level state.
 *
 * USAGE (from a useFrame loop in a test scene):
 *
 *   const sm = new SideScrollPlayerStateMachine({ startX: 0, laneZ: 0 });
 *   useFrame((_, dt) => {
 *     sm.update(dt, { moveX: -1 | 0 | 1, jump: edgeTriggered });
 *     const pos = sm.position; // { x, y, z }
 *     // ... render mesh.position.set(pos.x, pos.y, pos.z);
 *   });
 *
 * RULE: This file must remain a pure module so the /test-25d sandbox can
 * validate the gameplay model without depending on the production-side
 * `PlayerController` (which still supports multi-axis movement for legacy
 * reasons).
 */

import {
  COLLISION_CONFIG,
  resolveHorizontalMovement,
  resolveVerticalMovement,
  type BoxObstacle,
} from "../../collision/BoxObstacle";

// ─────────────────────────────────────────────────────────────────────────────
// INPUT MODEL — minimal edge-triggered input for a side-scroll player.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Side-scroll input. All fields are passed each frame.
 * `jump` MUST be edge-triggered by the caller (true only on the frame
 * the key transitioned from up to down) to avoid auto-bunny-hopping.
 */
export interface SideScrollInput {
  /** -1, 0, +1. Movement is exactly along X. */
  moveX: -1 | 0 | 1;
  /** Edge-triggered jump. */
  jump: boolean;
  /** Optional explicit speed (units/sec). Default uses config. */
  speed?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — pure constants.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tunable physics parameters. Defaults mirror the test scene and the
 * production world constants. Callers may override per scene.
 */
export interface SideScrollPlayerConfig {
  /** Initial X position. */
  startX: number;
  /** Lane Z (locked; player Z is always this value). */
  laneZ: number;
  /** Walk speed in units/sec. */
  walkSpeed: number;
  /** Initial jump impulse velocity. */
  jumpVelocity: number;
  /** Gravity acceleration. */
  gravity: number;
  /** Player half-width used for horizontal collision. */
  playerRadius: number;
  /** Player full height used for vertical overlap. */
  playerHeight: number;
  /** Ground Y. */
  groundY: number;
  /** Frame-rate-independent accel/decel coefficient (1/sec). */
  accel: number;
  /** Frame-rate-independent ground decel coefficient. */
  groundDecel: number;
  /** Frame-rate-independent air decel coefficient. */
  airDecel: number;
}

export const DEFAULT_SIDE_SCROLL_CONFIG: SideScrollPlayerConfig = {
  startX: 0,
  laneZ: 0,
  walkSpeed: 5,
  jumpVelocity: 9,
  gravity: 22,
  playerRadius: COLLISION_CONFIG.playerRadius,
  playerHeight: COLLISION_CONFIG.playerHeight,
  groundY: COLLISION_CONFIG.groundLevel,
  accel: 24,
  groundDecel: 14,
  airDecel: 2,
};

// ─────────────────────────────────────────────────────────────────────────────
// STATE — pure data.
// ─────────────────────────────────────────────────────────────────────────────

export interface SideScrollPlayerState {
  /** World position. Z is always equal to config.laneZ. */
  x: number;
  y: number;
  z: number;
  /** Current velocity. Z is always 0. */
  vx: number;
  vy: number;
  vz: 0;
  /** Player is on the ground (Y == groundY, vy == 0). */
  onGround: boolean;
  /** Facing: +1 right, -1 left. */
  facing: 1 | -1;
  /** Movement state for the state machine. */
  movementState: "idle" | "walk" | "jump" | "fall";
  /** Direction of last non-zero movement input. */
  direction: -1 | 0 | 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE MACHINE CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deterministic, side-scroll-only player state machine.
 *
 * The state machine emits absolute world positions each frame.
 * Rendering is the caller's responsibility.
 */
export class SideScrollPlayerStateMachine {
  readonly config: SideScrollPlayerConfig;

  private _state: SideScrollPlayerState;
  private _wasJumpPressed = false;

  constructor(config: Partial<SideScrollPlayerConfig> = {}) {
    this.config = { ...DEFAULT_SIDE_SCROLL_CONFIG, ...config };
    this._state = this.makeInitialState();
  }

  /** Read-only snapshot of current state. */
  get state(): Readonly<SideScrollPlayerState> {
    return this._state;
  }

  /** Convenience: shorthand for `state.x/y/z`. */
  get position(): { x: number; y: number; z: number } {
    return { x: this._state.x, y: this._state.y, z: this._state.z };
  }

  /**
   * Advance the state machine by one fixed timestep.
   *
   * @param dt         Seconds since last update (clamped internally).
   * @param input      Side-scroll input snapshot.
   * @param obstacles  Box obstacles (default: empty).
   */
  update(
    dt: number,
    input: SideScrollInput,
    obstacles: ReadonlyArray<BoxObstacle> = []
  ): void {
    const safeDt = Math.min(Math.max(dt, 0), 0.1);
    const s = this._state;
    const cfg = this.config;
    const speed = input.speed ?? cfg.walkSpeed;

    // ── 1. Compute target velocity from input ─────────────────────────────────
    const targetVx = input.moveX * speed;
    const accel = targetVx !== 0 ? cfg.accel : s.onGround ? cfg.groundDecel : cfg.airDecel;

    // Frame-rate-independent lerp toward target
    const t = Math.min(accel * safeDt, 1);
    s.vx = lerp(s.vx, targetVx, t);

    // Track direction & facing
    if (s.vx > 0.3) {
      s.facing = 1;
      s.direction = 1;
    } else if (s.vx < -0.3) {
      s.facing = -1;
      s.direction = -1;
    } else if (targetVx === 0) {
      s.direction = 0;
    }

    // ── 2. Resolve horizontal movement (collision + bounds) ───────────────────
    const horiz = resolveHorizontalMovement(
      s.x,
      s.vx,
      safeDt,
      s.y,
      obstacles
    );
    s.x = horiz.x;
    if (horiz.blocked) s.vx = 0;

    // ── 3. Jump (edge-triggered, only on ground) ──────────────────────────────
    if (input.jump && !this._wasJumpPressed && s.onGround) {
      s.vy = cfg.jumpVelocity;
      s.onGround = false;
    }
    this._wasJumpPressed = input.jump;

    // ── 4. Apply gravity & resolve vertical movement ──────────────────────────
    s.vy -= cfg.gravity * safeDt;
    const vert = resolveVerticalMovement(s.y, s.vy, safeDt, s.x, obstacles);
    s.y = vert.y;
    s.vy = vert.vy;
    s.onGround = vert.onGround;

    // ── 5. Z is locked at laneZ (always) ──────────────────────────────────────
    s.z = cfg.laneZ;
    s.vz = 0;

    // ── 6. Update movement state for downstream rendering ────────────────────
    if (!s.onGround) {
      s.movementState = s.vy > 0 ? "jump" : "fall";
    } else {
      if (Math.abs(s.vx) < 0.1) s.movementState = "idle";
      else s.movementState = "walk";
    }
  }

  /** Reset to initial spawn position. Velocity is cleared. */
  reset(): void {
    this._state = this.makeInitialState();
    this._wasJumpPressed = false;
  }

  /** Snap to a specific X (Y reset to ground). */
  setX(x: number): void {
    this._state.x = x;
    this._state.vx = 0;
  }

  private makeInitialState(): SideScrollPlayerState {
    return {
      x: this.config.startX,
      y: this.config.groundY,
      z: this.config.laneZ,
      vx: 0,
      vy: 0,
      vz: 0,
      onGround: true,
      facing: 1,
      movementState: "idle",
      direction: 0,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
