/**
 * Core Environment Components - Lockers
 * Phase 1 Refactor
 */
"use client";

import { WORLD, WORLD_HALF, COLORS as C } from "@/lib/world-constants";

export function Locker({ position, color = C.lockerBody }: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      {/* Main body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[WORLD.LOCKER_WIDTH - 0.02, WORLD.LOCKER_HEIGHT, WORLD.LOCKER_DEPTH]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.3} />
      </mesh>

      {/* Door panel (slightly raised) */}
      <mesh castShadow position={[0, 0.1, WORLD.LOCKER_DEPTH / 2 + 0.005]}>
        <boxGeometry args={[WORLD.LOCKER_WIDTH * 0.85, WORLD.LOCKER_HEIGHT * 0.9, 0.01]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.35} />
      </mesh>

      {/* Vents (top) */}
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={`vent-${i}`} position={[(i - 1.5) * 0.1, WORLD.LOCKER_HEIGHT / 2 - 0.1, WORLD.LOCKER_DEPTH / 2 + 0.001]}>
          <boxGeometry args={[0.06, 0.03, 0.02]} />
          <meshStandardMaterial color={C.lockerDark} roughness={0.9} />
        </mesh>
      ))}

      {/* Handle/lock mechanism */}
      <mesh position={[WORLD.LOCKER_WIDTH / 2 - 0.08, 0.15, WORLD.LOCKER_DEPTH / 2 + 0.025]}>
        <boxGeometry args={[0.04, 0.12, 0.04]} />
        <meshStandardMaterial color={C.lockerHandle} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Locker number */}
      <mesh position={[0, WORLD.LOCKER_HEIGHT / 2 - 0.2, WORLD.LOCKER_DEPTH / 2 + 0.006]}>
        <boxGeometry args={[0.1, 0.08, 0.01]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>

      {/* Air vent grill at bottom */}
      <mesh position={[0, -WORLD.LOCKER_HEIGHT / 2 + 0.15, WORLD.LOCKER_DEPTH / 2 + 0.001]}>
        <boxGeometry args={[WORLD.LOCKER_WIDTH * 0.7, 0.15, 0.01]} />
        <meshStandardMaterial color={C.lockerDark} roughness={0.9} />
      </mesh>
    </group>
  );
}

export function LockerRow({ side }: { side: "left" | "right" }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + WORLD.LOCKER_DEPTH / 2 : WORLD.CORRIDOR_WIDTH / 2 - WORLD.LOCKER_DEPTH / 2;
  const lockerColors = [C.lockerBody, "#dc2626", "#16a34a", "#9333ea", "#ea580c"];
  const count = Math.floor(WORLD.CORRIDOR_LENGTH / WORLD.LOCKER_WIDTH) - 2;
  const startX = -WORLD_HALF + WORLD.LOCKER_WIDTH + 1;

  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <Locker key={i} position={[startX + i * WORLD.LOCKER_WIDTH, WORLD.GROUND_Y + WORLD.LOCKER_HEIGHT / 2 + 0.075, z]} color={lockerColors[i % lockerColors.length]} />
      ))}
    </group>
  );
}

export function ColoredLocker({ x, z, index }: { x: number; z: number; index: number }) {
  const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];
  const lockerColor = colors[index % colors.length];

  return (
    <group position={[x, 0, z]}>
      {/* Body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.35, 1.8, 0.3]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.8} metalness={0.1} />
      </mesh>
      {/* Door panel */}
      <mesh position={[0, 0, 0.155]}>
        <boxGeometry args={[0.32, 1.7, 0.02]} />
        <meshStandardMaterial color={lockerColor} roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Handle */}
      <mesh position={[0.1, 0, 0.175]}>
        <boxGeometry args={[0.04, 0.15, 0.02]} />
        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Vents at top */}
      {[0.6, 0.45, 0.3].map((vy, i) => (
        <mesh key={`vent-${i}`} position={[0, vy, 0.16]}>
          <boxGeometry args={[0.2, 0.02, 0.02]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
