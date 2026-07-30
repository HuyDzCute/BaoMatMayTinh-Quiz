"use client";

/**
 * Player Entity - High Quality Placeholder Character
 *
 * Gameplay Phase 1 Polish
 * Human-like proportions with improved visibility, contrast, and animations
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerContext } from "./PlayerContext";

/**
 * Player entity props
 */
export interface PlayerEntityProps {
  /** Player ID */
  playerId?: string;
  /** Player color (shirt/clothing) */
  shirtColor?: string;
  /** Pants color */
  pantsColor?: string;
  /** Skin color */
  skinColor?: string;
  /** Hair color */
  hairColor?: string;
  /** Show shadow */
  castShadow?: boolean;
  /** Custom children renderer */
  children?: (state: {
    position: THREE.Vector3;
    rotation: number;
    movementState: string;
    isMoving: boolean;
    isRunning: boolean;
  }) => React.ReactNode;
}

/**
 * Player proportions - optimized for visibility
 */
const TOTAL_HEIGHT = 1.7;  // Total player height
const HEAD_SIZE = 0.28;    // Larger head for character appeal
const TORSO_HEIGHT = 0.55; // Torso
const TORSO_WIDTH = 0.38;  // Wider torso
const LEG_LENGTH = 0.55;   // Legs
const LEG_WIDTH = 0.13;    // Wider legs
const ARM_LENGTH = 0.50;   // Arms
const ARM_WIDTH = 0.10;    // Wider arms

/**
 * Default colors - high contrast for visibility
 */
const DEFAULT_SHIRT = "#3b82f6";    // Bright blue
const DEFAULT_PANTS = "#1e3a8a";     // Dark blue
const DEFAULT_SKIN = "#fcd9bd";      // Warm skin
const DEFAULT_HAIR = "#1e293b";      // Dark hair

/**
 * Player entity component - High quality placeholder
 */
export function PlayerEntity({
  playerId = "player",
  shirtColor = DEFAULT_SHIRT,
  pantsColor = DEFAULT_PANTS,
  skinColor = DEFAULT_SKIN,
  hairColor = DEFAULT_HAIR,
  castShadow = true,
  children,
}: PlayerEntityProps) {
  const groupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const leftArmGroupRef = useRef<THREE.Group>(null);
  const rightArmGroupRef = useRef<THREE.Group>(null);
  const leftLegGroupRef = useRef<THREE.Group>(null);
  const rightLegGroupRef = useRef<THREE.Group>(null);

  const { playerController, isReady } = usePlayerContext();

  // Animation state
  const animState = useRef({
    walkCycle: 0,
    armSwing: 0,
    legSwing: 0,
    bodyBob: 0,
    breathCycle: 0,
    facingDirection: 1,
  });

  // Get controller output
  useFrame((state, delta) => {
    if (!isReady || !groupRef.current || !playerController) return;

    const output = playerController.getOutput();
    const anim = animState.current;

    // Update position - group position is at feet level
    const feetY = output.position.y - LEG_LENGTH;
    groupRef.current.position.set(
      output.position.x,
      feetY,
      output.position.z
    );

    // Smooth rotation - face direction with interpolation
    if (output.direction !== 0) {
      const targetRotation = output.direction > 0 ? 0 : Math.PI;
      const currentRotation = groupRef.current.rotation.y;
      let diff = targetRotation - currentRotation;
      
      // Handle wrap-around
      if (diff > Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;
      
      groupRef.current.rotation.y += diff * Math.min(delta * 12, 1);
    }

    // Animation timing based on movement
    const cycleSpeed = output.isRunning ? 12 : 8;
    
    if (output.isMoving && output.isGrounded) {
      anim.walkCycle += delta * cycleSpeed;
      anim.breathCycle += delta * 2;
      
      // Arm swing - opposite to legs
      anim.armSwing = Math.sin(anim.walkCycle) * 0.5;
      anim.legSwing = Math.sin(anim.walkCycle) * 0.4;
      
      // Body bob - vertical movement while walking
      anim.bodyBob = Math.abs(Math.sin(anim.walkCycle * 2)) * 0.04;
      
      // Head nod while walking
      if (headRef.current) {
        headRef.current.rotation.x = Math.sin(anim.walkCycle * 2) * 0.05;
      }
    } else {
      // Idle animation - subtle breathing
      anim.walkCycle = 0;
      anim.breathCycle += delta * 1.5;
      anim.bodyBob = Math.sin(anim.breathCycle) * 0.01;
      
      // Smooth return to neutral
      anim.armSwing = THREE.MathUtils.lerp(anim.armSwing, 0, delta * 6);
      anim.legSwing = THREE.MathUtils.lerp(anim.legSwing, 0, delta * 6);
      
      // Head back to neutral
      if (headRef.current) {
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0, delta * 4);
      }
    }

    // Apply arm animation with shoulder pivot
    if (leftArmGroupRef.current && rightArmGroupRef.current) {
      leftArmGroupRef.current.rotation.x = anim.armSwing;
      leftArmGroupRef.current.rotation.z = -0.1; // Slight outward angle
      rightArmGroupRef.current.rotation.x = -anim.armSwing;
      rightArmGroupRef.current.rotation.z = 0.1;
    }

    // Apply leg animation
    if (leftLegGroupRef.current && rightLegGroupRef.current) {
      leftLegGroupRef.current.rotation.x = -anim.legSwing;
      rightLegGroupRef.current.rotation.x = anim.legSwing;
    }

    // Apply body bob to torso
    if (torsoRef.current) {
      torsoRef.current.position.y = LEG_LENGTH + TORSO_HEIGHT / 2 + anim.bodyBob;
    }
  });

  // Custom renderer - only render if ready to avoid ref access during render
  if (children && isReady) {
    return (
      <group ref={groupRef}>
        {children({
          position: new THREE.Vector3(0, 0, 0),
          rotation: 0,
          movementState: playerController?.getOutput().movementState || "idle",
          isMoving: playerController?.getOutput().isMoving || false,
          isRunning: playerController?.getOutput().isRunning || false,
        })}
      </group>
    );
  }
  
  // Return null if not ready (will be replaced after mount)
  if (!isReady) return null;

  // Calculate positions
  const torsoY = LEG_LENGTH + TORSO_HEIGHT / 2;
  const headY = LEG_LENGTH + TORSO_HEIGHT + HEAD_SIZE / 2 - 0.05;
  const hipY = LEG_LENGTH / 2;

  return (
    <group ref={groupRef}>
      {/* Shadow blob on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[0.35, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} />
      </mesh>

      {/* Legs */}
      <group ref={leftLegGroupRef} position={[LEG_WIDTH * 0.8, 0, 0]}>
        {/* Thigh */}
        <mesh position={[0, hipY, 0]} castShadow={castShadow}>
          <capsuleGeometry args={[LEG_WIDTH / 2.2, LEG_LENGTH * 0.5, 4, 8]} />
          <meshStandardMaterial color={pantsColor} roughness={0.85} metalness={0} />
        </mesh>
        {/* Foot */}
        <mesh position={[0, 0.06, LEG_WIDTH * 0.3]} castShadow={castShadow}>
          <boxGeometry args={[LEG_WIDTH * 1.1, LEG_WIDTH * 0.6, LEG_WIDTH * 1.8]} />
          <meshStandardMaterial color="#374151" roughness={0.9} metalness={0} />
        </mesh>
      </group>

      <group ref={rightLegGroupRef} position={[-LEG_WIDTH * 0.8, 0, 0]}>
        {/* Thigh */}
        <mesh position={[0, hipY, 0]} castShadow={castShadow}>
          <capsuleGeometry args={[LEG_WIDTH / 2.2, LEG_LENGTH * 0.5, 4, 8]} />
          <meshStandardMaterial color={pantsColor} roughness={0.85} metalness={0} />
        </mesh>
        {/* Foot */}
        <mesh position={[0, 0.06, LEG_WIDTH * 0.3]} castShadow={castShadow}>
          <boxGeometry args={[LEG_WIDTH * 1.1, LEG_WIDTH * 0.6, LEG_WIDTH * 1.8]} />
          <meshStandardMaterial color="#374151" roughness={0.9} metalness={0} />
        </mesh>
      </group>

      {/* Torso */}
      <mesh
        ref={torsoRef}
        position={[0, torsoY, 0]}
        castShadow={castShadow}
        receiveShadow
      >
        <boxGeometry args={[TORSO_WIDTH, TORSO_HEIGHT, TORSO_WIDTH * 0.75]} />
        <meshStandardMaterial 
          color={shirtColor} 
          roughness={0.75} 
          metalness={0.05}
        />
      </mesh>

      {/* Arms */}
      <group ref={leftArmGroupRef} position={[TORSO_WIDTH / 2 + 0.02, torsoY - 0.05, 0]}>
        {/* Upper arm */}
        <mesh position={[0, -ARM_LENGTH * 0.22, 0]} castShadow={castShadow}>
          <capsuleGeometry args={[ARM_WIDTH / 2, ARM_LENGTH * 0.4, 4, 8]} />
          <meshStandardMaterial color={shirtColor} roughness={0.75} metalness={0.05} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -ARM_LENGTH * 0.55, 0]} castShadow={castShadow}>
          <sphereGeometry args={[ARM_WIDTH * 0.75, 8, 8]} />
          <meshStandardMaterial color={skinColor} roughness={0.8} metalness={0} />
        </mesh>
      </group>

      <group ref={rightArmGroupRef} position={[-TORSO_WIDTH / 2 - 0.02, torsoY - 0.05, 0]}>
        {/* Upper arm */}
        <mesh position={[0, -ARM_LENGTH * 0.22, 0]} castShadow={castShadow}>
          <capsuleGeometry args={[ARM_WIDTH / 2, ARM_LENGTH * 0.4, 4, 8]} />
          <meshStandardMaterial color={shirtColor} roughness={0.75} metalness={0.05} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -ARM_LENGTH * 0.55, 0]} castShadow={castShadow}>
          <sphereGeometry args={[ARM_WIDTH * 0.75, 8, 8]} />
          <meshStandardMaterial color={skinColor} roughness={0.8} metalness={0} />
        </mesh>
      </group>

      {/* Head */}
      <group ref={headRef} position={[0, headY, 0]}>
        {/* Head sphere */}
        <mesh castShadow={castShadow}>
          <sphereGeometry args={[HEAD_SIZE / 2, 20, 20]} />
          <meshStandardMaterial 
            color={skinColor} 
            roughness={0.75} 
            metalness={0}
          />
        </mesh>

        {/* Hair - top half */}
        <mesh position={[0, 0.03, -0.02]} castShadow={castShadow}>
          <sphereGeometry args={[HEAD_SIZE / 2.1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
          <meshStandardMaterial color={hairColor} roughness={0.9} metalness={0} />
        </mesh>

        {/* Eyes - positioned for clear visibility */}
        <mesh position={[0.06, 0.02, HEAD_SIZE / 2.3]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh position={[-0.06, 0.02, HEAD_SIZE / 2.3]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.1} />
        </mesh>

        {/* Eye highlights */}
        <mesh position={[0.065, 0.03, HEAD_SIZE / 2.4]}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.055, 0.03, HEAD_SIZE / 2.4]}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* Backpack indicator for player orientation */}
      <mesh position={[0, torsoY + 0.1, -TORSO_WIDTH * 0.45]} castShadow={castShadow}>
        <boxGeometry args={[0.2, 0.25, 0.08]} />
        <meshStandardMaterial color="#1e40af" roughness={0.8} metalness={0} />
      </mesh>
    </group>
  );
}
