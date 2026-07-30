"use client";
/**
 * Phase1SideScrollPlayer — Production Adapter
 *
 * Production Integration — Phase 1
 *
 * PURPOSE:
 *   Adapter that connects the validated 2.5D modules to the production
 *   WordRunGame. It reuses:
 *     - SideScrollPlayerStateMachine  (player physics)
 *     - <CameraController>            (side-scroll camera)
 *     - BoxObstacle / collision helpers (collision)
 *
 *   It does NOT depend on any legacy module (PlayerController,
 *   ThirdPersonCamera, GamePlayerIntegrated).
 *
 * INTEGRATION CONTRACT:
 *   The parent (WordRunGame) must:
 *     1. Mount this component instead of <GamePlayerIntegrated />
 *        when the Phase 1 feature flag is ON.
 *     2. Still render <WorldScene /> for visual geometry.
 *     3. Still render all UI (HUD, dialogue, quiz, NPC controllers).
 *     4. Still read playerPosRef.current for NPC proximity etc.
 *
 * WHAT IT DOES NOT DO (Phase 1 scope):
 *   - No NPC interaction.
 *   - No collectible pickup.
 *   - No quiz trigger.
 *   - No dialogue.
 *   - No save / Firebase / cloud sync writes.
 *
 * ROLLBACK:
 *   Setting `NEXT_PUBLIC_ENABLE_PHASE1_SIDESCROLL=false` (default) makes
 *   WordRunGame mount the legacy component instead. This file then has
 *   zero runtime effect.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SideScrollPlayerStateMachine } from "@/lib/game/player/controller/player-state-machine.sideScroll";
import type { Vector3 } from "@/lib/wordrun-types";
import type { BoxObstacle } from "@/lib/game/collision/BoxObstacle";
import {
  PHASE1_OBSTACLES,
  PHASE1_SPAWN,
} from "@/lib/game/integration/phase1/collision-geometry";

export interface Phase1SideScrollPlayerProps {
  /** External input ref (from WordRunGame keyboard handler). */
  externalInputRef: React.MutableRefObject<{
    left: boolean;
    right: boolean;
    forward: boolean;
    backward: boolean;
    jump: boolean;
    run: boolean;
  }>;
  /** Callback each frame — production map writes to playerPosRef here. */
  onPositionUpdate: (pos: Vector3) => void;
  /**
   * Optional obstacle override. Defaults to PHASE1_OBSTACLES.
   * Provided here as a prop for future phases that may inject
   * dynamically-computed obstacles (e.g., from a level definition).
   */
  obstacles?: ReadonlyArray<BoxObstacle>;
}

interface TickPayload {
  x: number;
  y: number;
  z: number;
  facing: 1 | -1;
  movementState: "idle" | "walk" | "jump" | "fall";
}

declare global {
  interface Window {
    __PHASE1_LAST_TICK?: TickPayload;
  }
}

/**
 * Player mesh — same shape as test scene's mesh but uses
 * production-tuned colors so it looks at home in the classroom map.
 *
 * This component is intentionally minimal in Phase 1. It does not
 * import PlayerEntity (legacy). A future Phase 2 may swap in a
 * dedicated production-grade character mesh.
 */
function Phase1PlayerMesh() {
  const groupRef = useRef<THREE.Group>(null);

  // Note: this component is rendered as a sibling by the parent.
  // The parent owns the state machine; this mesh just consumes state.
  // To keep the contract simple, we expose a global window event when
  // the state machine updates. See "PHASE1_LAST_TICK" below.
  useFrame(() => {
    const ev = (window as unknown as { __PHASE1_LAST_TICK?: TickPayload })
      .__PHASE1_LAST_TICK;
    if (!ev || !groupRef.current) return;
    const g = groupRef.current;
    g.position.set(ev.x, ev.y, ev.z);
    g.rotation.y = ev.facing > 0 ? 0 : Math.PI;
  });

  return (
    <group ref={groupRef} position={[PHASE1_SPAWN.x, PHASE1_SPAWN.y, PHASE1_SPAWN.z]}>
      {/* Body */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.85, 4, 8]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial color="#fcd9bd" />
      </mesh>
      {/* Eyes (visual cue for facing direction) */}
      <mesh position={[0.1, 1.55, 0.2]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[-0.1, 1.55, 0.2]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  );
}

/**
 * Tick driver — owns the SideScrollPlayerStateMachine instance,
 * reads external input, writes to window event for the mesh.
 *
 * Returns no JSX. Must be rendered as a child of <Canvas>.
 */
function Phase1PlayerTick({
  externalInputRef,
  onPositionUpdate,
  obstacles,
}: Phase1SideScrollPlayerProps) {
  const sm = useMemo(
    () =>
      new SideScrollPlayerStateMachine({
        startX: PHASE1_SPAWN.x,
        laneZ: PHASE1_SPAWN.z,
      }),
    []
  );

  const lastJumpRef = useRef(false);
  const obstaclesRef = useRef<ReadonlyArray<BoxObstacle>>(
    obstacles ?? PHASE1_OBSTACLES
  );

  useFrame((_, delta) => {
    const dt = Math.min(Math.max(delta, 0), 0.1);
    const input = externalInputRef.current;

    // Edge-triggered jump (avoid auto-bunny-hopping).
    const jumpEdge = input.jump && !lastJumpRef.current;
    lastJumpRef.current = input.jump;

    // SideScrollPlayerStateMachine only knows left/right.
    // Forward/backward are ignored in Phase 1 (this is a side-scroll).
    sm.update(
      dt,
      {
        moveX: input.left ? -1 : input.right ? 1 : 0,
        jump: jumpEdge,
      },
      obstaclesRef.current
    );

    const pos = sm.position;
    onPositionUpdate({ x: pos.x, y: pos.y, z: pos.z });

    // Publish to mesh reader.
    window.__PHASE1_LAST_TICK = {
      x: pos.x,
      y: pos.y,
      z: pos.z,
      facing: sm.state.facing,
      movementState: sm.state.movementState,
    };
  });

  return null;
}

/**
 * Public component — combines the tick driver and the mesh.
 *
 * Usage:
 *   <Phase1SideScrollPlayer
 *     externalInputRef={inputRef}
 *     onPositionUpdate={(pos) => { playerPosRef.current = pos; }}
 *   />
 */
export function Phase1SideScrollPlayer({
  externalInputRef,
  onPositionUpdate,
  obstacles,
}: Phase1SideScrollPlayerProps) {
  return (
    <>
      <Phase1PlayerTick
        externalInputRef={externalInputRef}
        onPositionUpdate={onPositionUpdate}
        obstacles={obstacles}
      />
      <Phase1PlayerMesh />
    </>
  );
}