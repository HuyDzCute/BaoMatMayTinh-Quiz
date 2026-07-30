/**
 * Core Environment Components - Ceiling
 * Phase 1 Refactor
 */
"use client";

import { WORLD } from "@/lib/world-constants";

export function Ceiling() {
  const panelCols = Math.floor(WORLD.CORRIDOR_LENGTH / 1.2);
  const panelRows = Math.floor(WORLD.CORRIDOR_WIDTH / 1.2);
  const panelW = WORLD.CORRIDOR_LENGTH / panelCols;
  const panelH = WORLD.CORRIDOR_WIDTH / panelRows;

  return (
    <group>
      {/* Main ceiling slab */}
      <mesh position={[0, WORLD.CORRIDOR_HEIGHT + 0.05, 0]}>
        <boxGeometry args={[WORLD.CORRIDOR_LENGTH, 0.1, WORLD.CORRIDOR_WIDTH]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.9} />
      </mesh>

      {/* Drop ceiling frame */}
      <mesh position={[0, WORLD.CORRIDOR_HEIGHT, 0]}>
        <boxGeometry args={[WORLD.CORRIDOR_LENGTH + 0.1, 0.04, WORLD.CORRIDOR_WIDTH + 0.1]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Ceiling panels grid */}
      {Array.from({ length: panelCols }).map((_, col) =>
        Array.from({ length: panelRows }).map((_, row) => {
          const x = col * panelW - WORLD.CORRIDOR_LENGTH / 2 + panelW / 2;
          const z = row * panelH - WORLD.CORRIDOR_WIDTH / 2 + panelH / 2;
          const isLightPanel = row === Math.floor(panelRows / 2);

          return (
            <mesh key={`cp-${col}-${row}`} position={[x, WORLD.CORRIDOR_HEIGHT - 0.02, z]}>
              <boxGeometry args={[panelW - 0.08, 0.02, panelH - 0.08]} />
              <meshStandardMaterial color={isLightPanel ? "#fffef0" : "#f0e8d8"} roughness={isLightPanel ? 0.3 : 0.8} metalness={0.02} />
            </mesh>
          );
        })
      )}

      {/* Ceiling T-bar grid lines (horizontal) */}
      {Array.from({ length: panelCols + 1 }).map((_, i) => (
        <mesh key={`ct-${i}`} position={[i * panelW - WORLD.CORRIDOR_LENGTH / 2, WORLD.CORRIDOR_HEIGHT - 0.01, 0]}>
          <boxGeometry args={[0.04, 0.02, WORLD.CORRIDOR_WIDTH]} />
          <meshStandardMaterial color="#d4c8b8" roughness={0.7} metalness={0.1} />
        </mesh>
      ))}

      {/* Ceiling T-bar grid lines (vertical) */}
      {Array.from({ length: panelRows + 1 }).map((_, i) => (
        <mesh key={`cv-${i}`} position={[0, WORLD.CORRIDOR_HEIGHT - 0.01, i * panelH - WORLD.CORRIDOR_WIDTH / 2]}>
          <boxGeometry args={[WORLD.CORRIDOR_LENGTH, 0.02, 0.04]} />
          <meshStandardMaterial color="#d4c8b8" roughness={0.7} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}
