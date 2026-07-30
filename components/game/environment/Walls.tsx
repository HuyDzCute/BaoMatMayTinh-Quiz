/**
 * Core Environment Components - Walls
 * Production Optimization: Memoized random values
 */
"use client";

import { useMemo } from "react";
import { WORLD, WORLD_HALF, COLORS as C } from "@/lib/world-constants";

export function Wall({ side }: { side: "left" | "right" }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 : WORLD.CORRIDOR_WIDTH / 2;
  const stripeX = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.1 : WORLD.CORRIDOR_WIDTH / 2 - 0.1;

  // Memoize panel shades to avoid impure function calls during render
  const panelShades = useMemo(
    () =>
      Array.from({ length: Math.floor(WORLD.CORRIDOR_LENGTH / 3.5) }, () =>
        Math.random() * 0.08 - 0.04
      ),
    []
  );

  // Memoize scuff positions for consistent rendering
  const scuffs = useMemo(() => {
    const positions = [8, 22, 36, 50, 62];
    return positions.map((x) => ({
      x,
      width: 0.8 + Math.random() * 0.5,
    }));
  }, []);

  return (
    <group>
      {/* Main wall base */}
      <mesh receiveShadow position={[0, WORLD.CORRIDOR_HEIGHT / 2, z]}>
        <boxGeometry args={[WORLD.CORRIDOR_LENGTH, WORLD.CORRIDOR_HEIGHT, 0.15]} />
        <meshStandardMaterial color={C.wall} roughness={0.85} metalness={0.02} />
      </mesh>

      {/* Baseboard (bottom trim) */}
      <mesh position={[0, 0.15, stripeX]} receiveShadow>
        <boxGeometry args={[WORLD.CORRIDOR_LENGTH, 0.3, 0.04]} />
        <meshStandardMaterial color={C.wallBaseboard} roughness={0.7} metalness={0.05} />
      </mesh>

      {/* Chair rail (horizontal trim at ~1m height) */}
      <mesh position={[0, 1.1, stripeX]} receiveShadow>
        <boxGeometry args={[WORLD.CORRIDOR_LENGTH, 0.08, 0.03]} />
        <meshStandardMaterial color={C.wallChairRail} roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Top cornice (ceiling trim) */}
      <mesh position={[0, WORLD.CORRIDOR_HEIGHT - 0.12, stripeX]} receiveShadow>
        <boxGeometry args={[WORLD.CORRIDOR_LENGTH, 0.24, 0.05]} />
        <meshStandardMaterial color={C.wallCornice} roughness={0.75} metalness={0.02} />
      </mesh>

      {/* Wall panel divisions (vertical) */}
      {Array.from({ length: Math.floor(WORLD.CORRIDOR_LENGTH / 3.5) }).map((_, i) => {
        const xPos = i * 3.5 - WORLD_HALF + 1.75;
        const shade = panelShades[i];
        const r = parseInt(C.wall.slice(1, 3), 16) / 255;
        const g = parseInt(C.wall.slice(3, 5), 16) / 255;
        const b = parseInt(C.wall.slice(5, 7), 16) / 255;
        const adjust = (v: number) => Math.min(1, Math.max(0, v + shade));
        const panelColor = `rgb(${Math.round(adjust(r) * 255)},${Math.round(adjust(g) * 255)},${Math.round(adjust(b) * 255)})`;

        return (
          <group key={`panel-${i}`}>
            {/* Panel outline */}
            <mesh position={[xPos, WORLD.CORRIDOR_HEIGHT / 2 + 0.3, stripeX - 0.01]} receiveShadow>
              <boxGeometry args={[0.03, WORLD.CORRIDOR_HEIGHT - 0.8, 0.01]} />
              <meshStandardMaterial color={C.wallPanelLine} roughness={0.8} metalness={0.05} />
            </mesh>

            {/* Panel fill (slightly different shade) */}
            <mesh position={[xPos, 1.8, stripeX - 0.005]} receiveShadow>
              <boxGeometry args={[0.01, 1.2, 0.005]} />
              <meshStandardMaterial color={panelColor} roughness={0.88} metalness={0.01} transparent opacity={0.3} />
            </mesh>
          </group>
        );
      })}

      {/* Horizontal stripe near bottom */}
      <mesh position={[0, 0.3, stripeX]} receiveShadow>
        <boxGeometry args={[WORLD.CORRIDOR_LENGTH, 0.4, 0.025]} />
        <meshStandardMaterial color={C.wallStripe} roughness={0.9} />
      </mesh>

      {/* Top stripe */}
      <mesh position={[0, WORLD.CORRIDOR_HEIGHT - 0.2, stripeX]} receiveShadow>
        <boxGeometry args={[WORLD.CORRIDOR_LENGTH, 0.25, 0.025]} />
        <meshStandardMaterial color={C.wallStripe} roughness={0.9} />
      </mesh>

      {/* Scuff marks near floor */}
      {scuffs.map(({ x, width }) => (
        <mesh key={`scuff-${side}-${x}`} position={[x, 0.08, stripeX + (side === "left" ? 0.06 : -0.06)]} receiveShadow>
          <boxGeometry args={[width, 0.12, 0.01]} />
          <meshStandardMaterial color="#9a8b7a" roughness={0.95} metalness={0} transparent opacity={0.15} />
        </mesh>
      ))}
    </group>
  );
}

export function EndWall({ side }: { side: "left" | "right" }) {
  const x = side === "left" ? -WORLD_HALF - 0.06 : WORLD_HALF + 0.06;
  const rotationY = side === "left" ? Math.PI / 2 : -Math.PI / 2;
  return (
    <mesh receiveShadow position={[x, WORLD.CORRIDOR_HEIGHT / 2, 0]} rotation={[0, rotationY, 0]}>
      <boxGeometry args={[WORLD.CORRIDOR_WIDTH, WORLD.CORRIDOR_HEIGHT, 0.12]} />
      <meshStandardMaterial color={C.wall} roughness={0.85} />
    </mesh>
  );
}
