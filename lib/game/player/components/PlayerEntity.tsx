"use client";

/**
 * Player Entity - React Three Fiber Rendering
 *
 * Gameplay Phase 1: Player Controller
 * Three.js rendering for the player character
 * Human-like proportions with body, head, arms, and legs
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
 * Player proportions
 */
const TOTAL_HEIGHT = 1.7;  // Total player height in meters
const HEAD_RATIO = 0.12;  // Head is 12% of total height
const TORSO_RATIO = 0.30; // Torso is 30% of total height
const LEG_RATIO = 0.45;    // Each leg is 22.5% of total height
const ARM_RATIO = 0.35;    // Each arm is 17.5% of total height

const HEAD_SIZE = TOTAL_HEIGHT * HEAD_RATIO;
const TORSO_HEIGHT = TOTAL_HEIGHT * TORSO_RATIO;
const TORSO_WIDTH = 0.35;
const LEG_LENGTH = TOTAL_HEIGHT * LEG_RATIO;
const LEG_WIDTH = 0.12;
const ARM_LENGTH = TOTAL_HEIGHT * ARM_RATIO;
const ARM_WIDTH = 0.08;

/**
 * Default colors
 */
const DEFAULT_SHIRT = "#3b82f6";  // Blue shirt
const DEFAULT_PANTS = "#1e40af";   // Dark blue pants
const DEFAULT_SKIN = "#fcd5b8";   // Light skin
const DEFAULT_HAIR = "#1e3a5f";   // Dark hair

/**
 * Player entity component
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
  });

  // Get controller output
  useFrame((_, delta) => {
    if (!isReady || !groupRef.current || !playerController) return;

    const output = playerController.getOutput();

    // Update position - group position is at feet level
    groupRef.current.position.set(
      output.position.x,
      output.position.y - LEG_LENGTH - HEAD_SIZE / 2, // Adjust so feet are at player position
      output.position.z
    );

    // Update rotation (face direction)
    if (output.direction !== 0) {
      groupRef.current.rotation.y = output.direction > 0 ? 0 : Math.PI;
    }

    // Animation
    const anim = animState.current;
    if (output.isMoving && output.isGrounded) {
      const speed = output.isRunning ? 10 : 6;
      anim.walkCycle += delta * speed;
      anim.armSwing = Math.sin(anim.walkCycle) * 0.4;
      anim.legSwing = Math.sin(anim.walkCycle) * 0.3;
      anim.bodyBob = Math.abs(Math.sin(anim.walkCycle * 2)) * 0.02;
    } else {
      anim.walkCycle = 0;
      anim.armSwing = THREE.MathUtils.lerp(anim.armSwing, 0, delta * 8);
      anim.legSwing = THREE.MathUtils.lerp(anim.legSwing, 0, delta * 8);
      anim.bodyBob = THREE.MathUtils.lerp(anim.bodyBob, 0, delta * 8);
    }

    // Apply arm animation
    if (leftArmGroupRef.current && rightArmGroupRef.current) {
      leftArmGroupRef.current.rotation.x = anim.armSwing;
      rightArmGroupRef.current.rotation.x = -anim.armSwing;
    }

    // Apply leg animation
    if (leftLegGroupRef.current && rightLegGroupRef.current) {
      leftLegGroupRef.current.rotation.x = -anim.legSwing;
      rightLegGroupRef.current.rotation.x = anim.legSwing;
    }

    // Apply body bob
    if (torsoRef.current) {
      torsoRef.current.position.y = LEG_LENGTH + TORSO_HEIGHT / 2 + anim.bodyBob;
    }
  });

  // Custom renderer
  if (children) {
    return (
      <group ref={groupRef}>
        {children({
          position: groupRef.current?.position || new THREE.Vector3(),
          rotation: groupRef.current?.rotation.y || 0,
          movementState: playerController?.getOutput().movementState || "idle",
          isMoving: playerController?.getOutput().isMoving || false,
          isRunning: playerController?.getOutput().isRunning || false,
        })}
      </group>
    );
  }

  // Calculate positions
  const torsoY = LEG_LENGTH + TORSO_HEIGHT / 2; // Where torso center is
  const headY = LEG_LENGTH + TORSO_HEIGHT + HEAD_SIZE / 2; // Where head center is
  const armY = torsoY; // Arms attach at torso center
  const hipY = LEG_LENGTH / 2; // Hip level

  return (
    <group ref={groupRef}>
      {/* Torso */}
      <mesh
        ref={torsoRef}
        position={[0, torsoY, 0]}
        castShadow={castShadow}
        receiveShadow
      >
        <boxGeometry args={[TORSO_WIDTH, TORSO_HEIGHT, TORSO_WIDTH * 0.7]} />
        <meshStandardMaterial color={shirtColor} roughness={0.8} metalness={0} />
      </mesh>

      {/* Head */}
      <mesh position={[0, headY, 0]} castShadow={castShadow}>
        <sphereGeometry args={[HEAD_SIZE / 2, 16, 16]} />
        <meshStandardMaterial color={skinColor} roughness={0.8} metalness={0} />
      </mesh>

      {/* Hair */}
      <mesh position={[0, headY + HEAD_SIZE / 6, -HEAD_SIZE / 8]} castShadow={castShadow}>
        <sphereGeometry args={[HEAD_SIZE / 2.2, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={hairColor} roughness={0.9} metalness={0} />
      </mesh>

      {/* Left Eye */}
      <mesh position={[HEAD_SIZE / 8, headY, HEAD_SIZE / 2.5]}>
        <sphereGeometry args={[HEAD_SIZE / 16, 8, 8]} />
        <meshStandardMaterial color="#1e3a5f" />
      </mesh>

      {/* Right Eye */}
      <mesh position={[-HEAD_SIZE / 8, headY, HEAD_SIZE / 2.5]}>
        <sphereGeometry args={[HEAD_SIZE / 16, 8, 8]} />
        <meshStandardMaterial color="#1e3a5f" />
      </mesh>

      {/* Left Arm */}
      <group ref={leftArmGroupRef} position={[TORSO_WIDTH / 2 + ARM_WIDTH / 2, armY, 0]}>
        <mesh position={[0, -ARM_LENGTH / 2, 0]} castShadow={castShadow}>
          <capsuleGeometry args={[ARM_WIDTH / 2, ARM_LENGTH * 0.6, 4, 8]} />
          <meshStandardMaterial color={shirtColor} roughness={0.8} metalness={0} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -ARM_LENGTH * 0.7, 0]} castShadow={castShadow}>
          <sphereGeometry args={[ARM_WIDTH / 1.5, 8, 8]} />
          <meshStandardMaterial color={skinColor} roughness={0.8} metalness={0} />
        </mesh>
      </group>

      {/* Right Arm */}
      <group ref={rightArmGroupRef} position={[-TORSO_WIDTH / 2 - ARM_WIDTH / 2, armY, 0]}>
        <mesh position={[0, -ARM_LENGTH / 2, 0]} castShadow={castShadow}>
          <capsuleGeometry args={[ARM_WIDTH / 2, ARM_LENGTH * 0.6, 4, 8]} />
          <meshStandardMaterial color={shirtColor} roughness={0.8} metalness={0} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -ARM_LENGTH * 0.7, 0]} castShadow={castShadow}>
          <sphereGeometry args={[ARM_WIDTH / 1.5, 8, 8]} />
          <meshStandardMaterial color={skinColor} roughness={0.8} metalness={0} />
        </mesh>
      </group>

      {/* Left Leg */}
      <group ref={leftLegGroupRef} position={[LEG_WIDTH, 0, 0]}>
        <mesh position={[0, hipY, 0]} castShadow={castShadow}>
          <capsuleGeometry args={[LEG_WIDTH / 2, LEG_LENGTH * 0.6, 4, 8]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} metalness={0} />
        </mesh>
        {/* Foot */}
        <mesh position={[0, LEG_LENGTH * 0.15, LEG_WIDTH / 2]} castShadow={castShadow}>
          <boxGeometry args={[LEG_WIDTH, LEG_WIDTH / 2, LEG_WIDTH * 1.5]} />
          <meshStandardMaterial color="#374151" roughness={0.9} metalness={0} />
        </mesh>
      </group>

      {/* Right Leg */}
      <group ref={rightLegGroupRef} position={[-LEG_WIDTH, 0, 0]}>
        <mesh position={[0, hipY, 0]} castShadow={castShadow}>
          <capsuleGeometry args={[LEG_WIDTH / 2, LEG_LENGTH * 0.6, 4, 8]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} metalness={0} />
        </mesh>
        {/* Foot */}
        <mesh position={[0, LEG_LENGTH * 0.15, LEG_WIDTH / 2]} castShadow={castShadow}>
          <boxGeometry args={[LEG_WIDTH, LEG_WIDTH / 2, LEG_WIDTH * 1.5]} />
          <meshStandardMaterial color="#374151" roughness={0.9} metalness={0} />
        </mesh>
      </group>
    </group>
  );
}
