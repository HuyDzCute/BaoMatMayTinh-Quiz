/**
 * MockCollectible — DEV-ONLY placeholder for collectible-word objects.
 *
 * ⚠️ DEV-ONLY. Must never be used in production.
 *
 * Purpose:
 *   - Trigger once when the player is within 1.0 unit on the X axis.
 *   - Visual: golden sphere with a gentle bob and spin animation.
 *   - Hidden once `collected` is true.
 *
 * Does NOT touch:
 *   - Firebase / cloud sync
 *   - production save slots
 *   - leaderboard
 *
 * The parent scene decides when a collectible fires its trigger via the
 * `collected` prop; this component is purely visual.
 */
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface MockCollectibleProps {
  id: string;
  x: number;
  collected: boolean;
}

export function MockCollectible({ x, collected }: MockCollectibleProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current || collected) return;
    meshRef.current.rotation.y = state.clock.elapsedTime * 1.5;
    meshRef.current.position.y = 1.2 + Math.sin(state.clock.elapsedTime * 2) * 0.15;
  });

  if (collected) return null;

  return (
    <mesh ref={meshRef} position={[x, 1.2, 0]} castShadow>
      <sphereGeometry args={[0.3, 12, 12]} />
      <meshStandardMaterial
        color="#fbbf24"
        emissive="#fbbf24"
        emissiveIntensity={0.4}
      />
    </mesh>
  );
}
