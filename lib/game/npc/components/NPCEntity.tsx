"use client";

/**
 * NPC Entity - React Three Fiber Rendering
 *
 * Gameplay Phase 2: NPC Foundation
 * Three.js rendering for NPC characters
 * Placeholder model - no final character models yet
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { INPCEntity } from "../types";

/**
 * NPC entity props
 */
export interface NPCEntityProps {
  /** NPC entity controller */
  npc: INPCEntity;
  /** Enable animations */
  animate?: boolean;
}

/**
 * NPC visual constants
 */
const NPC_HEIGHT = 1.6;
const NPC_RADIUS = 0.35;

/**
 * NPC entity component
 */
export function NPCEntity({ npc, animate = true }: NPCEntityProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const indicatorRef = useRef<THREE.Mesh>(null);

  const config = npc.config;

  // Mutable animation values
  const animMutable = useRef({
    idleOffset: Math.PI,
    walkCycle: 0,
  });

  // Update rendering
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const npcState = npc.getState();

    // Update position
    groupRef.current.position.set(
      npcState.position.x,
      npcState.position.y + NPC_HEIGHT / 2,
      npcState.position.z
    );

    // Update rotation
    groupRef.current.rotation.y = npcState.rotation;

    // Animation
    if (animate) {
      const anim = animMutable.current;

      // Idle animation (subtle bobbing)
      if (npcState.movementState === "idle") {
        anim.idleOffset += delta * 1.5;
        if (bodyRef.current) {
          bodyRef.current.position.y = NPC_HEIGHT / 2 + Math.sin(anim.idleOffset) * 0.02;
        }
      }

      // Walk animation
      if (npcState.movementState === "walk") {
        anim.walkCycle += delta * 6;
        if (bodyRef.current) {
          bodyRef.current.position.y = NPC_HEIGHT / 2 + Math.sin(anim.walkCycle * 2) * 0.05;
        }
      }
    }

    // Update indicator
    if (indicatorRef.current) {
      // Change indicator color based on interaction state
      const isInteracting = npcState.interactionState === "interacting";
      const isCooldown = npcState.interactionState === "cooldown";

      if (isInteracting) {
        (indicatorRef.current.material as THREE.MeshStandardMaterial).color.set("#fbbf24");
        (indicatorRef.current.material as THREE.MeshStandardMaterial).emissive.set("#fbbf24");
        (indicatorRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
      } else if (isCooldown) {
        (indicatorRef.current.material as THREE.MeshStandardMaterial).color.set("#6b7280");
        (indicatorRef.current.material as THREE.MeshStandardMaterial).emissive.set("#6b7280");
        (indicatorRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      } else {
        (indicatorRef.current.material as THREE.MeshStandardMaterial).color.set("#22c55e");
        (indicatorRef.current.material as THREE.MeshStandardMaterial).emissive.set("#22c55e");
        (indicatorRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh
        ref={bodyRef}
        position={[0, NPC_HEIGHT / 2, 0]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[NPC_RADIUS, NPC_RADIUS, NPC_HEIGHT * 0.7, 16]} />
        <meshStandardMaterial
          color={config.color}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Head */}
      <mesh position={[0, NPC_HEIGHT * 0.85, 0]} castShadow>
        <sphereGeometry args={[NPC_RADIUS * 1.1, 16, 16]} />
        <meshStandardMaterial
          color="#fcd5b8"
          roughness={0.8}
          metalness={0}
        />
      </mesh>

      {/* Eyes */}
      <mesh position={[0.1, NPC_HEIGHT * 0.88, NPC_RADIUS * 0.9]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#1e3a5f" />
      </mesh>
      <mesh position={[-0.1, NPC_HEIGHT * 0.88, NPC_RADIUS * 0.9]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#1e3a5f" />
      </mesh>

      {/* Interaction indicator (floating sphere above head) */}
      <mesh
        ref={indicatorRef}
        position={[0, NPC_HEIGHT + 0.2, 0]}
      >
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial
          color="#22c55e"
          emissive="#22c55e"
          emissiveIntensity={0.3}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
}

/**
 * Simple NPC placeholder for lists
 */
export function NPCPlaceholder({
  position,
  color = "#f472b6",
}: {
  position: { x: number; y: number; z: number };
  color?: string;
}) {
  return (
    <group position={[position.x, position.y + NPC_HEIGHT / 2, position.z]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[NPC_RADIUS, NPC_RADIUS, NPC_HEIGHT * 0.7, 16]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh position={[0, NPC_HEIGHT * 0.35, 0]} castShadow>
        <sphereGeometry args={[NPC_RADIUS * 1.1, 16, 16]} />
        <meshStandardMaterial color="#fcd5b8" roughness={0.8} metalness={0} />
      </mesh>
    </group>
  );
}
