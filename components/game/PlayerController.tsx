/**
 * WordRun3D — Player Controller
 *
 * Feature 2: Player capsule với Idle/Run animations.
 * Physics: gravity, jump, corridor bounds.
 */
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WORLD } from "./WorldScene";
import type { InputState, Vector3 } from "@/lib/wordrun-types";

const PLAYER_HEIGHT = 1.6;
const WORLD_HALF_X = (WORLD.CORRIDOR_LENGTH ?? 70) / 2 - 1;
const CORRIDOR_HALF_Z = (WORLD.CORRIDOR_WIDTH ?? 6) / 2 - 0.5;

export function PlayerController({
  inputRef,
  onPosUpdate,
  paused,
  onFall,
}: {
  inputRef: React.MutableRefObject<InputState>;
  onPosUpdate: (pos: Vector3) => void;
  paused: boolean;
  onFall: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);

  // Physics state
  const physics = useRef<{
    x: number;
    y: number;
    z: number;
    vy: number;
    onGround: boolean;
    facing: 1 | -1;
    runCycle: number;
    isMoving: boolean;
  }>({
    x: WORLD.START_X,
    y: WORLD.GROUND_Y + PLAYER_HEIGHT / 2,
    z: 0,
    vy: 0,
    onGround: true,
    facing: 1,
    runCycle: 0,
    isMoving: false,
  });

  useFrame((_, dt) => {
    if (paused) return;
    const p = physics.current;
    const input = inputRef.current;

    // ── Horizontal movement ──
    let vx = 0;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    if (vx !== 0) p.facing = vx > 0 ? 1 : -1;
    p.isMoving = vx !== 0;

    const nextX = p.x + vx * WORLD.PLAYER_SPEED * dt;
    p.x = Math.max(-WORLD_HALF_X, Math.min(WORLD_HALF_X, nextX));

    // ── Jump ──
    if (input.jump && p.onGround) {
      p.vy = WORLD.JUMP_VELOCITY;
      p.onGround = false;
    }

    // ── Gravity ──
    p.vy -= WORLD.GRAVITY * dt;
    p.y += p.vy * dt;

    const groundLevel = WORLD.GROUND_Y + PLAYER_HEIGHT / 2;
    if (p.y <= groundLevel) {
      p.y = groundLevel;
      p.vy = 0;
      p.onGround = true;
    }

    // ── Fall off world (below floor) ──
    if (p.y < -5) {
      p.x = WORLD.START_X;
      p.y = groundLevel;
      p.vy = 0;
      onFall();
    }

    // ── Run animation ──
    if (p.isMoving) {
      p.runCycle += dt * 8;
    } else {
      p.runCycle = THREE.MathUtils.lerp(p.runCycle, 0, dt * 5);
    }

    // ── Sync group ──
    if (groupRef.current) {
      groupRef.current.position.set(p.x, p.y, p.z);
      groupRef.current.scale.x = p.facing;
    }

    // ── Sync body (head bob) ──
    if (bodyRef.current) {
      const bob = p.isMoving ? Math.sin(p.runCycle) * 0.04 : 0;
      bodyRef.current.position.y = bob;
    }

    onPosUpdate({ x: p.x, y: p.y, z: p.z });
  });

  return (
    <group ref={groupRef} position={[WORLD.START_X, WORLD.GROUND_Y + PLAYER_HEIGHT / 2, 0]}>
      {/* Body (cylinder) */}
      <mesh ref={bodyRef} castShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[WORLD.PLAYER_RADIUS, WORLD.PLAYER_RADIUS, PLAYER_HEIGHT * 0.6, 16]} />
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#1d4ed8"
          emissiveIntensity={0.3}
          metalness={0.2}
          roughness={0.6}
        />
      </mesh>

      {/* Head (sphere) */}
      <mesh castShadow position={[0, PLAYER_HEIGHT * 0.35, 0]}>
        <sphereGeometry args={[WORLD.PLAYER_RADIUS * 0.9, 16, 16]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={0.2}
          roughness={0.5}
        />
      </mesh>

      {/* Eyes */}
      <mesh position={[WORLD.PLAYER_RADIUS * 0.5, PLAYER_HEIGHT * 0.37, WORLD.PLAYER_RADIUS * 0.5]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[WORLD.PLAYER_RADIUS * 0.5, PLAYER_HEIGHT * 0.37, -WORLD.PLAYER_RADIUS * 0.5]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  );
}
