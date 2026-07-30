/**
 * Core Environment Components - Doors
 * Phase 1 Refactor
 */
"use client";

import { WORLD, COLORS as C } from "@/lib/world-constants";

export function ClassroomDoor({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;
  const isLeft = z < 0;

  return (
    <group position={position}>
      {/* Door frame (outer) */}
      <mesh position={[0, WORLD.DOOR_HEIGHT / 2 + 0.1, 0]}>
        <boxGeometry args={[WORLD.DOOR_WIDTH + 0.18, WORLD.DOOR_HEIGHT + 0.2, WORLD.LOCKER_DEPTH + 0.08]} />
        <meshStandardMaterial color={C.doorFrame} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Door frame inner trim */}
      <mesh position={[0, WORLD.DOOR_HEIGHT / 2 + 0.05, 0]}>
        <boxGeometry args={[WORLD.DOOR_WIDTH + 0.08, WORLD.DOOR_HEIGHT + 0.08, WORLD.LOCKER_DEPTH + 0.04]} />
        <meshStandardMaterial color="#5c4033" roughness={0.8} />
      </mesh>

      {/* Main door panel */}
      <mesh castShadow position={[0, WORLD.DOOR_HEIGHT / 2 + 0.05, isLeft ? 0.02 : -0.02]}>
        <boxGeometry args={[WORLD.DOOR_WIDTH, WORLD.DOOR_HEIGHT, WORLD.LOCKER_DEPTH]} />
        <meshStandardMaterial color={C.door} roughness={0.75} metalness={0.02} />
      </mesh>

      {/* Door panel insets (raised panels) */}
      <mesh position={[0, WORLD.DOOR_HEIGHT * 0.7, isLeft ? WORLD.LOCKER_DEPTH / 2 + 0.01 : -WORLD.LOCKER_DEPTH / 2 - 0.01]}>
        <boxGeometry args={[WORLD.DOOR_WIDTH * 0.7, WORLD.DOOR_HEIGHT * 0.35, 0.02]} />
        <meshStandardMaterial color={C.door} roughness={0.7} metalness={0.02} />
      </mesh>
      <mesh position={[0, WORLD.DOOR_HEIGHT * 0.25, isLeft ? WORLD.LOCKER_DEPTH / 2 + 0.01 : -WORLD.LOCKER_DEPTH / 2 - 0.01]}>
        <boxGeometry args={[WORLD.DOOR_WIDTH * 0.7, WORLD.DOOR_HEIGHT * 0.3, 0.02]} />
        <meshStandardMaterial color={C.door} roughness={0.7} metalness={0.02} />
      </mesh>

      {/* Door handle/lever */}
      <mesh position={[isLeft ? WORLD.DOOR_WIDTH / 2 - 0.12 : -WORLD.DOOR_WIDTH / 2 + 0.12, WORLD.DOOR_HEIGHT / 2 - 0.05, isLeft ? WORLD.LOCKER_DEPTH / 2 + 0.05 : -WORLD.LOCKER_DEPTH / 2 - 0.05]}>
        <boxGeometry args={[0.06, 0.22, 0.06]} />
        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Door handle plate */}
      <mesh position={[isLeft ? WORLD.DOOR_WIDTH / 2 - 0.12 : -WORLD.DOOR_WIDTH / 2 + 0.12, WORLD.DOOR_HEIGHT / 2 - 0.05, isLeft ? WORLD.LOCKER_DEPTH / 2 + 0.025 : -WORLD.LOCKER_DEPTH / 2 - 0.025]}>
        <boxGeometry args={[0.08, 0.3, 0.02]} />
        <meshStandardMaterial color="#c9a227" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Kick plate (bottom) */}
      <mesh position={[0, 0.05, isLeft ? WORLD.LOCKER_DEPTH / 2 + 0.001 : -WORLD.LOCKER_DEPTH / 2 - 0.001]}>
        <boxGeometry args={[WORLD.DOOR_WIDTH - 0.04, 0.1, 0.02]} />
        <meshStandardMaterial color="#8b8b8b" metalness={0.6} roughness={0.5} />
      </mesh>

      {/* Room number plate */}
      <mesh position={[isLeft ? WORLD.DOOR_WIDTH / 2 - 0.15 : -WORLD.DOOR_WIDTH / 2 + 0.15, WORLD.DOOR_HEIGHT - 0.35, isLeft ? WORLD.LOCKER_DEPTH / 2 + 0.001 : -WORLD.LOCKER_DEPTH / 2 - 0.001]}>
        <boxGeometry args={[0.3, 0.18, 0.015]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.9} />
      </mesh>

      {/* Room number text placeholder */}
      <mesh position={[isLeft ? WORLD.DOOR_WIDTH / 2 - 0.15 : -WORLD.DOOR_WIDTH / 2 + 0.15, WORLD.DOOR_HEIGHT - 0.35, isLeft ? WORLD.LOCKER_DEPTH / 2 + 0.006 : -WORLD.LOCKER_DEPTH / 2 - 0.006]}>
        <boxGeometry args={[0.25, 0.12, 0.01]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>

      {/* Peephole */}
      <mesh position={[0, WORLD.DOOR_HEIGHT * 0.75, isLeft ? WORLD.LOCKER_DEPTH / 2 + 0.025 : -WORLD.LOCKER_DEPTH / 2 - 0.025]}>
        <cylinderGeometry args={[0.03, 0.03, 0.04, 16]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Door closer (hydraulic) */}
      <mesh position={[isLeft ? -WORLD.DOOR_WIDTH / 2 + 0.1 : WORLD.DOOR_WIDTH / 2 - 0.1, WORLD.DOOR_HEIGHT * 0.7, isLeft ? WORLD.LOCKER_DEPTH / 2 + 0.04 : -WORLD.LOCKER_DEPTH / 2 - 0.04]}>
        <cylinderGeometry args={[0.025, 0.025, 0.15, 8]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
}

export function DoorsRow() {
  const positions: [number, number, number][] = [
    [10, 0, -WORLD.CORRIDOR_WIDTH / 2 - WORLD.LOCKER_DEPTH / 2 - 0.01],
    [10, 0, WORLD.CORRIDOR_WIDTH / 2 + WORLD.LOCKER_DEPTH / 2 + 0.01],
    [28, 0, -WORLD.CORRIDOR_WIDTH / 2 - WORLD.LOCKER_DEPTH / 2 - 0.01],
    [28, 0, WORLD.CORRIDOR_WIDTH / 2 + WORLD.LOCKER_DEPTH / 2 + 0.01],
    [46, 0, -WORLD.CORRIDOR_WIDTH / 2 - WORLD.LOCKER_DEPTH / 2 - 0.01],
    [46, 0, WORLD.CORRIDOR_WIDTH / 2 + WORLD.LOCKER_DEPTH / 2 + 0.01],
  ];
  return (
    <group>
      {positions.map((pos, i) => (
        <ClassroomDoor key={i} position={pos} />
      ))}
    </group>
  );
}
