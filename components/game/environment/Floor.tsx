/**
 * Core Environment Components - Floor
 * Production Optimization: Memoized tile colors
 */
"use client";

import { useMemo } from "react";
import { WORLD, WORLD_HALF, COLORS as C } from "@/lib/world-constants";

export function Floor() {
  // Memoize tile colors to avoid impure function calls during render
  const tileColors = useMemo(() => {
    return Array.from({ length: Math.floor(WORLD.CORRIDOR_LENGTH) + 1 }, () => {
      const shade = Math.random() * 0.06 - 0.03;
      const r = parseInt(C.floor.slice(1, 3), 16) / 255;
      const g = parseInt(C.floor.slice(3, 5), 16) / 255;
      const b = parseInt(C.floor.slice(5, 7), 16) / 255;
      const adjust = (v: number) => Math.min(1, Math.max(0, v + shade));
      return `rgb(${Math.round(adjust(r) * 255)},${Math.round(adjust(g) * 255)},${Math.round(adjust(b) * 255)})`;
    });
  }, []);

  // Memoize cross tile colors
  const crossTileColors = useMemo(() => {
    return Array.from({ length: Math.floor(WORLD.CORRIDOR_WIDTH) + 1 }, () => {
      const shade = Math.random() * 0.04 - 0.02;
      const r = parseInt(C.floorTile.slice(1, 3), 16) / 255;
      const g = parseInt(C.floorTile.slice(3, 5), 16) / 255;
      const b = parseInt(C.floorTile.slice(5, 7), 16) / 255;
      const adjust = (v: number) => Math.min(1, Math.max(0, v + shade));
      return `rgb(${Math.round(adjust(r) * 255)},${Math.round(adjust(g) * 255)},${Math.round(adjust(b) * 255)})`;
    });
  }, []);

  return (
    <group>
      {/* Base floor slab */}
      <mesh receiveShadow position={[0, WORLD.GROUND_Y - 0.08, 0]}>
        <boxGeometry args={[WORLD.CORRIDOR_LENGTH, 0.2, WORLD.CORRIDOR_WIDTH]} />
        <meshStandardMaterial color="#8b7355" roughness={0.9} />
      </mesh>

      {/* Main floor surface */}
      <mesh receiveShadow position={[0, WORLD.GROUND_Y, 0]}>
        <boxGeometry args={[WORLD.CORRIDOR_LENGTH, 0.12, WORLD.CORRIDOR_WIDTH]} />
        <meshStandardMaterial color={C.floor} roughness={0.65} metalness={0.05} />
      </mesh>

      {/* Horizontal tile lines (grout) */}
      {Array.from({ length: Math.floor(WORLD.CORRIDOR_LENGTH / 2) }).map((_, i) => (
        <mesh key={`ft-${i}`} position={[i * 2 - WORLD_HALF + 1, WORLD.GROUND_Y + 0.061, 0]} receiveShadow>
          <boxGeometry args={[0.06, 0.01, WORLD.CORRIDOR_WIDTH - 0.3]} />
          <meshStandardMaterial color={C.floorTile} roughness={0.95} metalness={0} />
        </mesh>
      ))}

      {/* Vertical tile lines (grout) */}
      {Array.from({ length: Math.floor(WORLD.CORRIDOR_WIDTH / 1.5) }).map((_, i) => (
        <mesh key={`ct-${i}`} position={[0, WORLD.GROUND_Y + 0.061, (i + 1) * 1.5 - WORLD.CORRIDOR_WIDTH / 2]} receiveShadow>
          <boxGeometry args={[WORLD.CORRIDOR_LENGTH - 0.3, 0.01, 0.06]} />
          <meshStandardMaterial color={C.floorTile} roughness={0.95} metalness={0} />
        </mesh>
      ))}

      {/* Subtle tile color variation overlay */}
      {Array.from({ length: Math.floor(WORLD.CORRIDOR_LENGTH / 2) }).map((_, i) => (
        Array.from({ length: Math.floor(WORLD.CORRIDOR_WIDTH / 1.5) }).map((_, j) => (
          <mesh key={`tv-${i}-${j}`} position={[i * 2 - WORLD_HALF + 1, WORLD.GROUND_Y + 0.062, (j + 0.5) * 1.5 - WORLD.CORRIDOR_WIDTH / 2 + 0.3]} receiveShadow>
            <boxGeometry args={[1.88, 0.005, 1.38]} />
            <meshStandardMaterial color={tileColors[i]} roughness={0.6} metalness={0.02} transparent opacity={0.15} />
          </mesh>
        ))
      )).flat()}

      {/* Worn spots (high-traffic areas near doors) */}
      {[10, 28, 46].map(x => (
        <mesh key={`wear-${x}`} position={[x, WORLD.GROUND_Y + 0.063, 0]} receiveShadow>
          <boxGeometry args={[3, 0.005, 2.5]} />
          <meshStandardMaterial color="#9a8b7a" roughness={0.8} metalness={0.01} transparent opacity={0.25} />
        </mesh>
      ))}
    </group>
  );
}
