/**
 * MockQuizTrigger — DEV-ONLY placeholder for quiz trigger zones.
 *
 * ⚠️ DEV-ONLY. Must never be used in production.
 *
 * Purpose:
 *   - Visual marker that indicates a quiz trigger zone in the test scene.
 *   - Parent scene detects proximity and emits a MOCK quiz event
 *     (no Firebase, no real question).
 *
 * Does NOT touch:
 *   - Firebase / cloud sync
 *   - production save slots
 *   - leaderboard
 *   - production `QuizModal` / `FlashcardModule`
 */
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface MockQuizTriggerProps {
  id: string;
  x: number;
  triggered: boolean;
}

export function MockQuizTrigger({ x, triggered }: MockQuizTriggerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const phase = useRef(0);

  useFrame((state, dt) => {
    phase.current += dt;
    if (!meshRef.current) return;
    meshRef.current.rotation.y = phase.current * 0.8;
    meshRef.current.position.y = 1.0 + Math.sin(phase.current * 1.5) * 0.08;
  });

  return (
    <mesh
      ref={meshRef}
      position={[x, 1.0, 0]}
      castShadow={!triggered}
    >
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial
        color={triggered ? "#6b7280" : "#22d3ee"}
        emissive={triggered ? "#374151" : "#22d3ee"}
        emissiveIntensity={triggered ? 0.1 : 0.5}
      />
    </mesh>
  );
}
