/**
 * Effects - Dust Particles
 * Production Optimization: Memoized particle positions
 */
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WORLD } from "@/lib/world-constants";

export function DustParticles() {
  const count = 80;
  const ref = useRef<THREE.Points>(null);

  // Memoize positions to avoid impure function calls during render
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * WORLD.CORRIDOR_LENGTH;
      arr[i * 3 + 1] = Math.random() * WORLD.CORRIDOR_HEIGHT * 0.8 + 0.3;
      arr[i * 3 + 2] = (Math.random() - 0.5) * WORLD.CORRIDOR_WIDTH * 0.7;
    }
    return arr;
  }, []); // Empty deps - only create once

  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.03;
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += Math.sin(Date.now() * 0.001 + i) * 0.001;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#fef9c3" size={0.04} transparent opacity={0.6} />
    </points>
  );
}
