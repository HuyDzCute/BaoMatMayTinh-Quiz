/**
 * Decorations - Safety & Exit Signs
 * Phase 1 Refactor
 */
"use client";

import { WORLD } from "@/lib/world-constants";

export function ExitSign({ x, side }: { x: number; side: "left" | "right" }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.08 : WORLD.CORRIDOR_WIDTH / 2 - 0.08;
  const rotationY = side === "left" ? 0 : Math.PI;

  return (
    <group position={[x, WORLD.CORRIDOR_HEIGHT - 0.3, z]} rotation={[0, rotationY, 0]}>
      {/* Sign housing */}
      <mesh>
        <boxGeometry args={[0.6, 0.25, 0.08]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Exit text glow */}
      <mesh position={[0, 0, 0.045]}>
        <boxGeometry args={[0.5, 0.15, 0.01]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={2} transparent opacity={0.9} />
      </mesh>

      {/* Glow light */}
      <pointLight position={[0, 0, 0.1]} intensity={0.3} color="#00ff00" distance={2} />
    </group>
  );
}

export function ExitSigns() {
  const xs = [-32, 32];
  const signs: { x: number; side: "left" | "right" }[] = [];

  xs.forEach(x => {
    signs.push({ x, side: "left" });
    signs.push({ x, side: "right" });
  });

  return (
    <group>
      {signs.map((s, i) => (
        <ExitSign key={i} x={s.x} side={s.side} />
      ))}
    </group>
  );
}

export function FireExtinguisher({ x, side }: { x: number; side: "left" | "right" }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.15 : WORLD.CORRIDOR_WIDTH / 2 - 0.15;

  return (
    <group position={[x, 0.45, z]}>
      {/* Cylinder body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.06, 0.07, 0.7, 16]} />
        <meshStandardMaterial color="#dc2626" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Top cap */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.1, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Nozzle/hose */}
      <mesh position={[0.08, 0.35, 0]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.015, 0.015, 0.15, 8]} />
        <meshStandardMaterial color="#dc2626" roughness={0.4} />
      </mesh>

      {/* Handle lever */}
      <mesh position={[0, 0.5, 0.05]}>
        <boxGeometry args={[0.12, 0.02, 0.04]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Pressure gauge */}
      <mesh position={[0, 0.15, 0.075]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.02, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.5} />
      </mesh>
    </group>
  );
}

export function FireExtinguishers() {
  const positions: { x: number; side: "left" | "right" }[] = [
    { x: 8, side: "left" },
    { x: 24, side: "right" },
    { x: 48, side: "left" },
  ];

  return (
    <group>
      {positions.map((p, i) => (
        <FireExtinguisher key={i} x={p.x} side={p.side} />
      ))}
    </group>
  );
}
