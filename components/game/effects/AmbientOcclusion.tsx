/**
 * Effects - Ambient Occlusion
 * Phase 1 Refactor
 */
"use client";

import { WORLD } from "@/lib/world-constants";

export function ContactShadow({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <mesh position={[x, 0.002, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[scale, scale, 1]}>
      <planeGeometry args={[1.5, 1.5]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.15} depthWrite={false} />
    </mesh>
  );
}

export function WallAODarkening({ side }: { side: "left" | "right" }) {
  const z = side === "left" ? -WORLD.CORRIDOR_WIDTH / 2 + 0.1 : WORLD.CORRIDOR_WIDTH / 2 - 0.1;

  return (
    <group>
      <mesh position={[0, 0.05, z]}>
        <boxGeometry args={[WORLD.CORRIDOR_LENGTH, 0.15, 0.2]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.08} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function CeilingAO() {
  return (
    <mesh position={[0, WORLD.CORRIDOR_HEIGHT - 0.05, 0]}>
      <boxGeometry args={[WORLD.CORRIDOR_LENGTH, 0.1, WORLD.CORRIDOR_WIDTH]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.06} depthWrite={false} />
    </mesh>
  );
}

export function AmbientOcclusion() {
  const benchShadows: { x: number; z: number }[] = [
    { x: 12, z: -WORLD.CORRIDOR_WIDTH / 2 + 0.6 },
    { x: 30, z: WORLD.CORRIDOR_WIDTH / 2 - 0.6 },
    { x: 48, z: -WORLD.CORRIDOR_WIDTH / 2 + 0.6 },
  ];

  const vendingShadows: { x: number; z: number }[] = [
    { x: 3, z: WORLD.CORRIDOR_WIDTH / 2 - 0.25 },
    { x: 35, z: -WORLD.CORRIDOR_WIDTH / 2 + 0.25 },
    { x: 53, z: WORLD.CORRIDOR_WIDTH / 2 - 0.25 },
  ];

  const coolerShadows: { x: number; z: number }[] = [
    { x: 6, z: -WORLD.CORRIDOR_WIDTH / 2 + 0.15 },
    { x: 24, z: WORLD.CORRIDOR_WIDTH / 2 - 0.15 },
    { x: 42, z: -WORLD.CORRIDOR_WIDTH / 2 + 0.15 },
  ];

  const plantShadows: { x: number; z: number; scale: number }[] = [
    { x: 2, z: -WORLD.CORRIDOR_WIDTH / 2 + 0.2, scale: 0.4 },
    { x: 18, z: WORLD.CORRIDOR_WIDTH / 2 - 0.2, scale: 0.35 },
    { x: 36, z: -WORLD.CORRIDOR_WIDTH / 2 + 0.2, scale: 0.45 },
    { x: 54, z: WORLD.CORRIDOR_WIDTH / 2 - 0.2, scale: 0.3 },
    { x: -30, z: WORLD.CORRIDOR_WIDTH / 2 - 0.2, scale: 0.5 },
    { x: 32, z: WORLD.CORRIDOR_WIDTH / 2 - 0.2, scale: 0.38 },
  ];

  return (
    <group>
      {benchShadows.map((s, i) => <ContactShadow key={`bench-shadow-${i}`} x={s.x} z={s.z} scale={1.2} />)}
      {vendingShadows.map((s, i) => <ContactShadow key={`vending-shadow-${i}`} x={s.x} z={s.z} scale={1.4} />)}
      {coolerShadows.map((s, i) => <ContactShadow key={`cooler-shadow-${i}`} x={s.x} z={s.z} scale={0.6} />)}
      {plantShadows.map((s, i) => <ContactShadow key={`plant-shadow-${i}`} x={s.x} z={s.z} scale={s.scale} />)}
      <WallAODarkening side="left" />
      <WallAODarkening side="right" />
      <CeilingAO />
    </group>
  );
}
