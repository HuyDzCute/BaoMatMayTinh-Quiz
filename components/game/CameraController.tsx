/**
 * WordRun3D — Classic 2.5D Side-Scrolling Camera
 *
 * First-principles design.
 *
 * The camera is a simple deterministic follower:
 *
 *   CAMERA.X = clamp(player.x + horizontalOffset, levelMinX, levelMaxX)
 *   CAMERA.Y = fixedHeight + tinyVerticalFollow(jumpHeight)
 *   CAMERA.Z = fixedDepth     ← ALWAYS FIXED. Camera does not orbit.
 *
 *   CAMERA.lookAt(camera.x + lookAheadX, camera.y + lookHeight, 0)
 *
 * Properties guaranteed:
 * - Camera NEVER rotates around player
 * - Camera NEVER moves in Z
 * - Camera NEVER enters walls (because Z is fixed)
 * - Player is ALWAYS visible (look-at always points at gameplay plane)
 * - No mouse / orbit / free-look / sphere casting
 *
 * Update order is fixed and explicit:
 *   1. Read player position
 *   2. Compute desired camera X
 *   3. Clamp to level bounds
 *   4. Smooth (single lerp)
 *   5. Set camera position
 *   6. Set camera lookAt
 */
"use client";

/* eslint-disable react-hooks/immutability */

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Vector3 } from "@/lib/wordrun-types";
import {
  type CameraBounds,
  DEFAULT_CAMERA_BOUNDS,
} from "./camera/CameraBounds";

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — single source of truth, no magic numbers elsewhere
// ═══════════════════════════════════════════════════════════════════════════════

/** Fixed camera depth. Camera lives here for the whole level. */
const CAMERA_Z = -8;

/** Fixed camera height when player is on the ground. */
const CAMERA_Y = 3;

/** Where on the player the camera looks at (Y offset from player feet). */
const LOOK_AT_Y = 1.0;

/** Player appears slightly left of screen center, leaving room ahead. */
const PLAYER_X_OFFSET = -1.2;

/** Camera leads player in movement direction by this amount. */
const LOOK_AHEAD_X = 1.5;

/** Camera vertical follow during jumps. */
const VERTICAL_FOLLOW = 0.15;

/** Vertical follow is OFF below this Y. */
const VERTICAL_DEAD_ZONE_Y = 0.5;

/** Smooth follow strength. 0 = instant, 1 = never. */
const SMOOTHING = 0.18;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface CameraControllerProps {
  /** Mutable ref to current player position. Read-only by camera. */
  playerPosRef: React.MutableRefObject<Vector3>;
  /**
   * Optional camera bounds. If omitted, defaults to production bounds
   * (`DEFAULT_CAMERA_BOUNDS`). The /test-25d sandbox passes
   * `TEST_CAMERA_BOUNDS` for its narrower validation level.
   */
  bounds?: CameraBounds;
}

export function CameraController({
  playerPosRef,
  bounds = DEFAULT_CAMERA_BOUNDS,
}: CameraControllerProps) {
  const { camera } = useThree();

  // Single smoothed X value. Everything else is derived or fixed.
  const smoothedX = useRef<number>(0);
  const smoothedLookX = useRef<number>(0);
  const initialized = useRef<boolean>(false);

  // Velocity tracking (computed from position delta inside useFrame).
  const lastPlayerX = useRef<number>(0);
  const smoothedVx = useRef<number>(0);

  // Reusable Vector3 to avoid GC pressure
  const lookTarget = useRef(new THREE.Vector3());

  // ─────────────────────────────────────────────────────────────────────────────
  // INITIALIZE: snap camera to player on first frame, no animation, no magic.
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playerPosRef.current) return;

    const px = playerPosRef.current.x;
    const startX = clamp(px + PLAYER_X_OFFSET, bounds.minX, bounds.maxX);

    smoothedX.current = startX;
    smoothedLookX.current = px;
    lastPlayerX.current = px;
    smoothedVx.current = 0;

    camera.position.set(startX, CAMERA_Y, CAMERA_Z);
    lookTarget.current.set(px, LOOK_AT_Y, 0);
    camera.lookAt(lookTarget.current);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 55;
      camera.updateProjectionMatrix();
    }

    initialized.current = true;
  }, [camera, playerPosRef, bounds.minX, bounds.maxX]);

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN UPDATE LOOP — explicit, deterministic, side-scrolling only.
  // ─────────────────────────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!initialized.current) return;
    if (!playerPosRef.current) return;

    // Cap delta to prevent jumps after tab-switch
    const dt = Math.min(delta, 0.05);

    const player = playerPosRef.current;

    // Safety: invalid player → do nothing this frame
    if (
      !Number.isFinite(player.x) ||
      !Number.isFinite(player.y) ||
      !Number.isFinite(player.z)
    ) {
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Compute instantaneous velocity from position delta.
    // ─────────────────────────────────────────────────────────────────────────
    const instantVx = (player.x - lastPlayerX.current) / Math.max(dt, 0.001);
    lastPlayerX.current = player.x;

    // Smooth velocity (single-pole low-pass). Eliminates jitter for camera.
    const velT = 1 - Math.pow(1 - 0.2, dt * 60);
    smoothedVx.current = lerp(smoothedVx.current, instantVx, velT);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Compute desired X with look-ahead based on smoothed velocity.
    // ─────────────────────────────────────────────────────────────────────────
    const lookahead = clamp(smoothedVx.current * 0.25, -LOOK_AHEAD_X, LOOK_AHEAD_X);
    const desiredXRaw = player.x + lookahead + PLAYER_X_OFFSET;
    const desiredX = clamp(desiredXRaw, bounds.minX, bounds.maxX);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Smooth camera X (single lerp, frame-rate independent).
    // ─────────────────────────────────────────────────────────────────────────
    const t = 1 - Math.pow(1 - SMOOTHING, dt * 60);
    smoothedX.current = lerp(smoothedX.current, desiredX, t);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Compute camera Y (fixed + tiny jump follow with dead zone).
    // ─────────────────────────────────────────────────────────────────────────
    let camY = CAMERA_Y;
    if (player.y > VERTICAL_DEAD_ZONE_Y) {
      camY = CAMERA_Y + (player.y - VERTICAL_DEAD_ZONE_Y) * VERTICAL_FOLLOW;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5: Smooth look-at X (player position, no lookahead).
    // ─────────────────────────────────────────────────────────────────────────
    smoothedLookX.current = lerp(smoothedLookX.current, player.x, t);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6: Apply camera position. Z and Y are deterministic.
    // ─────────────────────────────────────────────────────────────────────────
    camera.position.x = smoothedX.current;
    camera.position.y = camY;
    camera.position.z = CAMERA_Z; // ← ALWAYS FIXED. No orbit, no depth change.

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 7: Apply look-at. Always points at gameplay plane (Z=0).
    // ─────────────────────────────────────────────────────────────────────────
    lookTarget.current.set(
      smoothedLookX.current,
      player.y + LOOK_AT_Y,
      0 // ← gameplay plane
    );
    camera.lookAt(lookTarget.current);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 8: Final safety. Should never trigger, but cheap to check.
    // ─────────────────────────────────────────────────────────────────────────
    if (
      !Number.isFinite(camera.position.x) ||
      !Number.isFinite(camera.position.y) ||
      !Number.isFinite(camera.position.z)
    ) {
      camera.position.set(player.x, CAMERA_Y, CAMERA_Z);
      camera.lookAt(player.x, player.y + LOOK_AT_Y, 0);
    }
  });

  // No JSX — camera only manipulates the THREE.PerspectiveCamera
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}