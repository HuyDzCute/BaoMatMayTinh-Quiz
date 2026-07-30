/**
 * MockNPC — DEV-ONLY placeholder for NPC interaction.
 *
 * ⚠️ DEV-ONLY. Must never be used in production.
 *
 * Purpose:
 *   - Stand-in for the production NPC character.
 *   - Fires its "interact" trigger when the player gets within 2.0 units
 *     on the X axis (proximity is checked by the parent scene).
 *   - Visual: simple humanoid with bobbing idle animation + a small
 *     interaction indicator when not yet interacted.
 *
 * Does NOT touch:
 *   - Firebase / cloud sync
 *   - production save slots
 *   - leaderboard
 *   - production `NPCController` / `NPCEntity`
 */
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface MockNPCProps {
  id: string;
  x: number;
  interacted: boolean;
}

export function MockNPC({ x, interacted }: MockNPCProps) {
  const groupRef = useRef<THREE.Group>(null);
  const indicatorRef = useRef<THREE.Mesh>(null);
  const phase = useRef(0);

  useFrame((_, dt) => {
    phase.current += dt;

    if (groupRef.current) {
      const bob = Math.sin(phase.current * 1.2) * 0.04;
      groupRef.current.position.y = bob;
    }

    if (indicatorRef.current && !interacted) {
      indicatorRef.current.position.y = 1.9 + Math.sin(phase.current * 2) * 0.06;
    }
  });

  return (
    <group ref={groupRef} position={[x, 0, 0]}>
      {/* Body */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.4, 1.5, 12]} />
        <meshStandardMaterial color={interacted ? "#475569" : "#16a34a"} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshStandardMaterial color="#fcd9bd" />
      </mesh>

      {/* Interaction indicator */}
      {!interacted && (
        <mesh ref={indicatorRef} position={[0, 1.9, 0]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#fbbf24"
            emissiveIntensity={0.6}
          />
        </mesh>
      )}

      {/* Checkmark */}
      {interacted && (
        <mesh position={[0.45, 1.65, 0]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
    </group>
  );
}
