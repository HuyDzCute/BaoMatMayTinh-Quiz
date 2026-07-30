/**
 * Core Environment Components - Windows
 * Phase 1 Refactor
 */
"use client";

import { WORLD } from "@/lib/world-constants";

export function Window({ x }: { x: number }) {
  return (
    <group>
      {/* Window frame (outer) */}
      <mesh position={[x, 2.5, -WORLD.CORRIDOR_WIDTH / 2 + 0.01]}>
        <boxGeometry args={[1.6, 2.0, 0.1]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Window sill */}
      <mesh position={[x, 1.5 - 0.05, -WORLD.CORRIDOR_WIDTH / 2 + 0.06]}>
        <boxGeometry args={[1.7, 0.08, 0.15]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Glass pane */}
      <mesh position={[x, 2.5, -WORLD.CORRIDOR_WIDTH / 2 + 0.02]}>
        <boxGeometry args={[1.4, 1.85, 0.02]} />
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.35} roughness={0.05} metalness={0.1} envMapIntensity={0.8} />
      </mesh>

      {/* Glass reflection overlay */}
      <mesh position={[x, 2.5, -WORLD.CORRIDOR_WIDTH / 2 + 0.025]}>
        <boxGeometry args={[1.4, 1.85, 0.01]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.08} roughness={0} metalness={1} />
      </mesh>

      {/* Window dividers (muntins) - horizontal */}
      <mesh position={[x, 2.5, -WORLD.CORRIDOR_WIDTH / 2 + 0.03]}>
        <boxGeometry args={[1.4, 0.04, 0.04]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.85} metalness={0.1} />
      </mesh>
      <mesh position={[x, 1.75, -WORLD.CORRIDOR_WIDTH / 2 + 0.03]}>
        <boxGeometry args={[1.4, 0.04, 0.04]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.85} metalness={0.1} />
      </mesh>
      <mesh position={[x, 3.25, -WORLD.CORRIDOR_WIDTH / 2 + 0.03]}>
        <boxGeometry args={[1.4, 0.04, 0.04]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Window dividers (muntins) - vertical */}
      <mesh position={[x, 2.5, -WORLD.CORRIDOR_WIDTH / 2 + 0.03]}>
        <boxGeometry args={[0.04, 1.85, 0.04]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Sunlight from window */}
      <spotLight position={[x, 3.5, -WORLD.CORRIDOR_WIDTH / 2 + 1.5]} angle={Math.PI / 3} penumbra={0.6} intensity={0.7} color="#fffbe6" target-position={[x, 0, 0]} castShadow shadow-mapSize={[512, 512]} />

      {/* Ambient window glow */}
      <pointLight position={[x, 2.5, -WORLD.CORRIDOR_WIDTH / 2 + 1]} intensity={0.3} color="#87ceeb" distance={4} decay={2} />
    </group>
  );
}

export function Windows() {
  const xs = [20, 38, 56];
  return (
    <group>
      {xs.map(x => (
        <Window key={x} x={x} />
      ))}
    </group>
  );
}
