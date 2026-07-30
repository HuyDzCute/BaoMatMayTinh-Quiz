/**
 * Lighting System - Ceiling Lights
 * Phase 1 Refactor
 */
"use client";

import { WORLD, WORLD_HALF } from "@/lib/world-constants";

export function CeilingLight({ x }: { x: number }) {
  return (
    <group position={[x, WORLD.CORRIDOR_HEIGHT - 0.08, 0]}>
      {/* Light fixture housing */}
      <mesh>
        <boxGeometry args={[1.2, 0.06, 0.4]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* Fluorescent tube glow */}
      <mesh position={[0, -0.04, 0]}>
        <boxGeometry args={[1.0, 0.02, 0.25]} />
        <meshStandardMaterial color="#fef9c3" emissive="#fef08a" emissiveIntensity={1.2} roughness={0.2} />
      </mesh>

      {/* Tube reflectors */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[1.05, 0.01, 0.28]} />
        <meshStandardMaterial color="#fff" roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Light cover/lens */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[1.05, 0.015, 0.28]} />
        <meshStandardMaterial color="#fffef8" emissive="#fef08a" emissiveIntensity={0.5} transparent opacity={0.9} roughness={0.1} />
      </mesh>

      {/* Point light (warm fluorescent) */}
      <pointLight position={[0, -0.15, 0]} intensity={0.8} color="#fefce8" distance={8} decay={2} castShadow shadow-mapSize={[512, 512]} />

      {/* Subtle ambient contribution */}
      <rectAreaLight position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]} width={1.0} height={0.25} intensity={0.4} color="#fefce8" />
    </group>
  );
}

export function CeilingLights() {
  const lights = Array.from({ length: Math.floor(WORLD.CORRIDOR_LENGTH / 10) }).map((_, i) => i * 10 - WORLD_HALF + 5);
  return (
    <group>
      {lights.map(x => (
        <CeilingLight key={x} x={x} />
      ))}
    </group>
  );
}
