"use client";

/**
 * NPC Entity - High Quality Placeholder Character
 *
 * Gameplay Phase 1 Polish
 * NPC characters with distinct visual identity from player
 * Teachers with academic appearance
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
const NPC_HEIGHT = 1.7;
const HEAD_SIZE = 0.30;
const TORSO_HEIGHT = 0.50;
const TORSO_WIDTH = 0.40;
const LEG_LENGTH = 0.55;
const LEG_WIDTH = 0.12;
const ARM_LENGTH = 0.45;
const ARM_WIDTH = 0.09;

/**
 * NPC entity component - High quality placeholder
 */
export function NPCEntity({ npc, animate = true }: NPCEntityProps) {
  const groupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const leftArmGroupRef = useRef<THREE.Group>(null);
  const rightArmGroupRef = useRef<THREE.Group>(null);
  const leftLegGroupRef = useRef<THREE.Group>(null);
  const rightLegGroupRef = useRef<THREE.Group>(null);
  const glassesRef = useRef<THREE.Group>(null);

  const config = npc.config;

  // Mutable animation values
  const animMutable = useRef({
    idleOffset: Math.PI,
    walkCycle: 0,
    breathCycle: 0,
  });

  // Get color based on NPC config or use default
  const shirtColor = config.color || "#f472b6";
  const pantsColor = "#1e293b"; // Dark pants
  const skinColor = "#fcd9bd";
  const hairColor = "#4a3728";

  // Update rendering
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const npcState = npc.getState();
    const anim = animMutable.current;

    // Update position - group position is at feet level
    const feetY = npcState.position.y;
    groupRef.current.position.set(
      npcState.position.x,
      feetY,
      npcState.position.z
    );

    // Update rotation
    groupRef.current.rotation.y = npcState.rotation;

    // Animation
    if (animate) {
      anim.idleOffset += delta * 1.5;
      anim.breathCycle += delta * 1.2;

      // Idle animation (subtle bobbing and breathing)
      if (npcState.movementState === "idle") {
        if (groupRef.current) {
          groupRef.current.position.y = feetY + Math.sin(anim.idleOffset) * 0.02;
        }
        if (torsoRef.current) {
          const breathScale = 1 + Math.sin(anim.breathCycle) * 0.01;
          torsoRef.current.scale.y = breathScale;
        }
      }

      // Walk animation
      if (npcState.movementState === "walk") {
        anim.walkCycle += delta * 6;
        
        if (groupRef.current) {
          const bob = Math.sin(anim.walkCycle * 2) * 0.05;
          groupRef.current.position.y = feetY + bob;
        }

        // Animate limbs
        if (leftArmGroupRef.current && rightArmGroupRef.current) {
          const armSwing = Math.sin(anim.walkCycle) * 0.3;
          leftArmGroupRef.current.rotation.x = armSwing;
          rightArmGroupRef.current.rotation.x = -armSwing;
        }
        
        if (leftLegGroupRef.current && rightLegGroupRef.current) {
          const legSwing = Math.sin(anim.walkCycle) * 0.25;
          leftLegGroupRef.current.rotation.x = -legSwing;
          rightLegGroupRef.current.rotation.x = legSwing;
        }
      }

      // Return to idle pose
      if (npcState.movementState === "idle" && anim.walkCycle !== 0) {
        anim.walkCycle = THREE.MathUtils.lerp(anim.walkCycle, 0, delta * 5);
        
        if (leftArmGroupRef.current && rightArmGroupRef.current) {
          leftArmGroupRef.current.rotation.x = THREE.MathUtils.lerp(leftArmGroupRef.current.rotation.x, 0, delta * 5);
          rightArmGroupRef.current.rotation.x = THREE.MathUtils.lerp(rightArmGroupRef.current.rotation.x, 0, delta * 5);
        }
        
        if (leftLegGroupRef.current && rightLegGroupRef.current) {
          leftLegGroupRef.current.rotation.x = THREE.MathUtils.lerp(leftLegGroupRef.current.rotation.x, 0, delta * 5);
          rightLegGroupRef.current.rotation.x = THREE.MathUtils.lerp(rightLegGroupRef.current.rotation.x, 0, delta * 5);
        }
      }
    }

    // Update indicator
    if (glassesRef.current) {
      // Glasses position follows head
      glassesRef.current.position.y = HEAD_SIZE / 2 + 0.02;
    }
  });

  // Calculate positions
  const torsoY = LEG_LENGTH + TORSO_HEIGHT / 2;
  const headY = LEG_LENGTH + TORSO_HEIGHT + HEAD_SIZE / 2 - 0.05;
  const hipY = LEG_LENGTH / 2;

  return (
    <group ref={groupRef}>
      {/* Shadow blob on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[0.35, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} />
      </mesh>

      {/* Legs - darker for teachers */}
      <group ref={leftLegGroupRef} position={[LEG_WIDTH * 0.7, 0, 0]}>
        <mesh position={[0, hipY, 0]} castShadow>
          <capsuleGeometry args={[LEG_WIDTH / 2.2, LEG_LENGTH * 0.5, 4, 8]} />
          <meshStandardMaterial color={pantsColor} roughness={0.85} metalness={0} />
        </mesh>
        {/* Foot */}
        <mesh position={[0, 0.05, LEG_WIDTH * 0.25]} castShadow>
          <boxGeometry args={[LEG_WIDTH * 1.0, LEG_WIDTH * 0.5, LEG_WIDTH * 1.6]} />
          <meshStandardMaterial color="#1f2937" roughness={0.9} metalness={0} />
        </mesh>
      </group>

      <group ref={rightLegGroupRef} position={[-LEG_WIDTH * 0.7, 0, 0]}>
        <mesh position={[0, hipY, 0]} castShadow>
          <capsuleGeometry args={[LEG_WIDTH / 2.2, LEG_LENGTH * 0.5, 4, 8]} />
          <meshStandardMaterial color={pantsColor} roughness={0.85} metalness={0} />
        </mesh>
        {/* Foot */}
        <mesh position={[0, 0.05, LEG_WIDTH * 0.25]} castShadow>
          <boxGeometry args={[LEG_WIDTH * 1.0, LEG_WIDTH * 0.5, LEG_WIDTH * 1.6]} />
          <meshStandardMaterial color="#1f2937" roughness={0.9} metalness={0} />
        </mesh>
      </group>

      {/* Torso - colored shirt/coat */}
      <mesh
        ref={torsoRef}
        position={[0, torsoY, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[TORSO_WIDTH, TORSO_HEIGHT, TORSO_WIDTH * 0.7]} />
        <meshStandardMaterial 
          color={shirtColor} 
          roughness={0.7} 
          metalness={0.05}
        />
      </mesh>

      {/* Arms */}
      <group ref={leftArmGroupRef} position={[TORSO_WIDTH / 2 + 0.01, torsoY, 0]}>
        <mesh position={[0, -ARM_LENGTH * 0.2, 0]} castShadow>
          <capsuleGeometry args={[ARM_WIDTH / 2, ARM_LENGTH * 0.45, 4, 8]} />
          <meshStandardMaterial color={shirtColor} roughness={0.7} metalness={0.05} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -ARM_LENGTH * 0.5, 0]} castShadow>
          <sphereGeometry args={[ARM_WIDTH * 0.7, 8, 8]} />
          <meshStandardMaterial color={skinColor} roughness={0.8} metalness={0} />
        </mesh>
      </group>

      <group ref={rightArmGroupRef} position={[-TORSO_WIDTH / 2 - 0.01, torsoY, 0]}>
        <mesh position={[0, -ARM_LENGTH * 0.2, 0]} castShadow>
          <capsuleGeometry args={[ARM_WIDTH / 2, ARM_LENGTH * 0.45, 4, 8]} />
          <meshStandardMaterial color={shirtColor} roughness={0.7} metalness={0.05} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -ARM_LENGTH * 0.5, 0]} castShadow>
          <sphereGeometry args={[ARM_WIDTH * 0.7, 8, 8]} />
          <meshStandardMaterial color={skinColor} roughness={0.8} metalness={0} />
        </mesh>
      </group>

      {/* Head */}
      <group ref={headRef} position={[0, headY, 0]}>
        {/* Head sphere */}
        <mesh castShadow>
          <sphereGeometry args={[HEAD_SIZE / 2, 20, 20]} />
          <meshStandardMaterial 
            color={skinColor} 
            roughness={0.75} 
            metalness={0}
          />
        </mesh>

        {/* Hair - different style from player */}
        <mesh position={[0, 0.05, -0.02]} castShadow>
          <sphereGeometry args={[HEAD_SIZE / 2.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2.5]} />
          <meshStandardMaterial color={hairColor} roughness={0.85} metalness={0} />
        </mesh>

        {/* Eyes */}
        <mesh position={[0.07, 0, HEAD_SIZE / 2.3]}>
          <sphereGeometry args={[0.032, 8, 8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh position={[-0.07, 0, HEAD_SIZE / 2.3]}>
          <sphereGeometry args={[0.032, 8, 8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.1} />
        </mesh>

        {/* Eye highlights */}
        <mesh position={[0.075, 0.01, HEAD_SIZE / 2.35]}>
          <sphereGeometry args={[0.01, 6, 6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.065, 0.01, HEAD_SIZE / 2.35]}>
          <sphereGeometry args={[0.01, 6, 6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Glasses - teacher indicator */}
        <group ref={glassesRef} position={[0, 0, HEAD_SIZE / 2.25]}>
          {/* Left lens frame */}
          <mesh position={[0.07, 0, 0]}>
            <torusGeometry args={[0.045, 0.008, 8, 16]} />
            <meshStandardMaterial color="#374151" roughness={0.3} metalness={0.5} />
          </mesh>
          {/* Right lens frame */}
          <mesh position={[-0.07, 0, 0]}>
            <torusGeometry args={[0.045, 0.008, 8, 16]} />
            <meshStandardMaterial color="#374151" roughness={0.3} metalness={0.5} />
          </mesh>
          {/* Bridge */}
          <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.006, 0.006, 0.05, 8]} />
            <meshStandardMaterial color="#374151" roughness={0.3} metalness={0.5} />
          </mesh>
        </group>

        {/* Friendly smile */}
        <mesh position={[0, -0.08, HEAD_SIZE / 2.2]}>
          <sphereGeometry args={[0.04, 8, 8, 0, Math.PI]} />
          <meshStandardMaterial color="#fca5a5" roughness={0.8} metalness={0} />
        </mesh>
      </group>

      {/* Interaction indicator (floating sphere above head) */}
      <InteractionIndicator npc={npc} />
    </group>
  );
}

/**
 * Interaction indicator component
 */
function InteractionIndicator({ npc }: { npc: INPCEntity }) {
  const indicatorRef = useRef<THREE.Mesh>(null);
  const floatOffset = useRef(0);

  useFrame((state, delta) => {
    if (!indicatorRef.current) return;

    const npcState = npc.getState();
    
    // Increment offset for floating animation
    floatOffset.current += delta * 2;
    
    // Cap at max to prevent overflow
    if (floatOffset.current > Math.PI * 4) {
      floatOffset.current = Math.PI * 4;
    }

    // Floating animation
    indicatorRef.current.position.y = NPC_HEIGHT + 0.3 + Math.sin(floatOffset.current) * 0.05;

    // Change indicator color based on interaction state
    const isInteracting = npcState.interactionState === "interacting";
    const isCooldown = npcState.interactionState === "cooldown";
    const isNearby = npcState.behaviorState !== "idle";

    if (indicatorRef.current.material instanceof THREE.MeshStandardMaterial) {
      if (isInteracting) {
        indicatorRef.current.material.color.set("#fbbf24");
        indicatorRef.current.material.emissive.set("#fbbf24");
        indicatorRef.current.material.emissiveIntensity = 0.6;
      } else if (isCooldown) {
        indicatorRef.current.material.color.set("#6b7280");
        indicatorRef.current.material.emissive.set("#6b7280");
        indicatorRef.current.material.emissiveIntensity = 0;
      } else if (isNearby) {
        indicatorRef.current.material.color.set("#22c55e");
        indicatorRef.current.material.emissive.set("#22c55e");
        indicatorRef.current.material.emissiveIntensity = 0.5;
      } else {
        indicatorRef.current.material.color.set("#3b82f6");
        indicatorRef.current.material.emissive.set("#3b82f6");
        indicatorRef.current.material.emissiveIntensity = 0.3;
      }
    }
  });

  return (
    <mesh
      ref={indicatorRef}
      position={[0, NPC_HEIGHT + 0.3, 0]}
    >
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial
        color="#22c55e"
        emissive="#22c55e"
        emissiveIntensity={0.4}
        roughness={0.3}
        metalness={0.2}
      />
    </mesh>
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
    <group position={[position.x, position.y, position.z]}>
      {/* Body */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.35, 0.35, 1.0, 16]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial color="#fcd9bd" roughness={0.8} metalness={0} />
      </mesh>
    </group>
  );
}
