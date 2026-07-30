/**
 * WordRun3D — NPC Module
 *
 * Gameplay Phase 1 Camera Fix - Improved NPC Visibility
 * Humanoid NPC characters with distinct appearance from player
 */
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { NPC_POSITIONS } from "@/lib/world-constants";
import type { Vector3 } from "@/lib/wordrun-types";

// NPC proportions - slightly different from player
const NPC_HEIGHT = 1.7;
const HEAD_SIZE = 0.30;
const TORSO_HEIGHT = 0.55;
const TORSO_WIDTH = 0.40;
const LEG_LENGTH = 0.55;
const LEG_WIDTH = 0.12;
const ARM_LENGTH = 0.45;
const ARM_WIDTH = 0.09;

// Colors - distinct from player (warm colors vs blue)
const NPC_COLORS = ["#f472b6", "#a78bfa", "#34d399"] as const; // Pink, Purple, Green
const NPC_PANTS_COLOR = "#1e293b"; // Dark pants (same as player for consistency)
const NPC_SKIN_COLOR = "#fcd9bd";
const NPC_SHOE_COLOR = "#374151";
const NPC_RIM_COLOR = "#fbbf24"; // Golden rim
const NPC_OUTLINE_COLOR = "#7c2d12"; // Dark outline

const INTERACT_DISTANCE = 2.5;

interface NPCControllerProps {
  interacted: boolean[];
  playerPosRef: React.MutableRefObject<Vector3>;
  onNearbyNPC: (npcIdx: number | null) => void;
  onStartQuiz: (npcIdx: number) => void;
  showDialogue: boolean;
  activeDialogueNPC: number | null;
  paused: boolean;
  /**
   * Optional override for NPC X positions. If omitted, defaults to
   * production NPC_POSITIONS from `lib/world-constants`. The /test-25d
   * sandbox can pass a different list to place mock NPCs.
   */
  npcPositions?: ReadonlyArray<number>;
}

interface NPCMeshProps {
  index: number;
  x: number;
  interacted: boolean;
  isNearby: boolean;
  showPrompt: boolean;
  showDialogue: boolean;
}

function NPCMesh({
  index,
  x,
  interacted,
  isNearby,
  showPrompt,
  showDialogue,
}: NPCMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Group>(null);
  const indicatorRef = useRef<THREE.Mesh>(null);
  const walkCycle = useRef(0);
  const breathCycle = useRef(index * Math.PI); // Offset for each NPC

  const shirtColor = NPC_COLORS[index % NPC_COLORS.length];

  useFrame((_, dt) => {
    if (!groupRef.current) return;

    // Idle animation - gentle wandering
    walkCycle.current += dt * 0.8;
    breathCycle.current += dt * 1.2;

    // Subtle breathing
    if (torsoRef.current) {
      const breathScale = 1 + Math.sin(breathCycle.current) * 0.008;
      torsoRef.current.scale.y = breathScale;
    }

    // Gentle bobbing
    const bob = Math.sin(walkCycle.current) * 0.02;
    groupRef.current.position.y = bob;

    // Floating indicator animation
    if (indicatorRef.current) {
      indicatorRef.current.position.y = NPC_HEIGHT + 0.35 + Math.sin(walkCycle.current * 2) * 0.05;
    }
  });

  // Calculate positions
  const torsoY = LEG_LENGTH + TORSO_HEIGHT / 2;
  const headY = LEG_LENGTH + TORSO_HEIGHT + HEAD_SIZE / 2 - 0.05;
  const hipY = LEG_LENGTH / 2;

  return (
    <group ref={groupRef} position={[x, 0, 0]}>
      {/* Shadow blob */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[0.4, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>

      {/* Legs - darker for contrast */}
      <group position={[LEG_WIDTH * 0.7, 0, 0]}>
        {/* Outline */}
        <mesh position={[0, hipY, 0]} scale={1.08}>
          <capsuleGeometry args={[LEG_WIDTH / 2.2, LEG_LENGTH * 0.5, 4, 8]} />
          <meshBasicMaterial color={NPC_OUTLINE_COLOR} side={THREE.BackSide} />
        </mesh>
        {/* Main leg */}
        <mesh position={[0, hipY, 0]} castShadow>
          <capsuleGeometry args={[LEG_WIDTH / 2.2, LEG_LENGTH * 0.5, 4, 8]} />
          <meshStandardMaterial color={NPC_PANTS_COLOR} roughness={0.85} metalness={0} />
        </mesh>
        {/* Shoe */}
        <mesh position={[0, 0.05, LEG_WIDTH * 0.25]} castShadow>
          <boxGeometry args={[LEG_WIDTH * 1.0, LEG_WIDTH * 0.5, LEG_WIDTH * 1.6]} />
          <meshStandardMaterial color={NPC_SHOE_COLOR} roughness={0.9} metalness={0} />
        </mesh>
      </group>

      <group position={[-LEG_WIDTH * 0.7, 0, 0]}>
        {/* Outline */}
        <mesh position={[0, hipY, 0]} scale={1.08}>
          <capsuleGeometry args={[LEG_WIDTH / 2.2, LEG_LENGTH * 0.5, 4, 8]} />
          <meshBasicMaterial color={NPC_OUTLINE_COLOR} side={THREE.BackSide} />
        </mesh>
        {/* Main leg */}
        <mesh position={[0, hipY, 0]} castShadow>
          <capsuleGeometry args={[LEG_WIDTH / 2.2, LEG_LENGTH * 0.5, 4, 8]} />
          <meshStandardMaterial color={NPC_PANTS_COLOR} roughness={0.85} metalness={0} />
        </mesh>
        {/* Shoe */}
        <mesh position={[0, 0.05, LEG_WIDTH * 0.25]} castShadow>
          <boxGeometry args={[LEG_WIDTH * 1.0, LEG_WIDTH * 0.5, LEG_WIDTH * 1.6]} />
          <meshStandardMaterial color={NPC_SHOE_COLOR} roughness={0.9} metalness={0} />
        </mesh>
      </group>

      {/* Torso - colored with rim lighting */}
      <mesh
        ref={torsoRef}
        position={[0, torsoY, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[TORSO_WIDTH, TORSO_HEIGHT, TORSO_WIDTH * 0.7]} />
        <meshStandardMaterial
          color={interacted ? "#475569" : shirtColor}
          roughness={0.7}
          metalness={0.05}
          emissive={interacted ? "#1e293b" : NPC_RIM_COLOR}
          emissiveIntensity={interacted ? 0.1 : 0.2}
        />
      </mesh>

      {/* Torso outline */}
      <mesh position={[0, torsoY, 0]} scale={1.06}>
        <boxGeometry args={[TORSO_WIDTH, TORSO_HEIGHT, TORSO_WIDTH * 0.7]} />
        <meshBasicMaterial color={NPC_OUTLINE_COLOR} side={THREE.BackSide} />
      </mesh>

      {/* Arms */}
      <group position={[TORSO_WIDTH / 2 + 0.01, torsoY, 0]}>
        {/* Outline */}
        <mesh position={[0, -ARM_LENGTH * 0.2, 0]} scale={1.1}>
          <capsuleGeometry args={[ARM_WIDTH / 2, ARM_LENGTH * 0.45, 4, 8]} />
          <meshBasicMaterial color={NPC_OUTLINE_COLOR} side={THREE.BackSide} />
        </mesh>
        {/* Main arm */}
        <mesh position={[0, -ARM_LENGTH * 0.2, 0]} castShadow>
          <capsuleGeometry args={[ARM_WIDTH / 2, ARM_LENGTH * 0.45, 4, 8]} />
          <meshStandardMaterial
            color={interacted ? "#475569" : shirtColor}
            roughness={0.7}
            metalness={0.05}
          />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -ARM_LENGTH * 0.5, 0]} castShadow>
          <sphereGeometry args={[ARM_WIDTH * 0.7, 8, 8]} />
          <meshStandardMaterial color={NPC_SKIN_COLOR} roughness={0.8} metalness={0} />
        </mesh>
      </group>

      <group position={[-TORSO_WIDTH / 2 - 0.01, torsoY, 0]}>
        {/* Outline */}
        <mesh position={[0, -ARM_LENGTH * 0.2, 0]} scale={1.1}>
          <capsuleGeometry args={[ARM_WIDTH / 2, ARM_LENGTH * 0.45, 4, 8]} />
          <meshBasicMaterial color={NPC_OUTLINE_COLOR} side={THREE.BackSide} />
        </mesh>
        {/* Main arm */}
        <mesh position={[0, -ARM_LENGTH * 0.2, 0]} castShadow>
          <capsuleGeometry args={[ARM_WIDTH / 2, ARM_LENGTH * 0.45, 4, 8]} />
          <meshStandardMaterial
            color={interacted ? "#475569" : shirtColor}
            roughness={0.7}
            metalness={0.05}
          />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -ARM_LENGTH * 0.5, 0]} castShadow>
          <sphereGeometry args={[ARM_WIDTH * 0.7, 8, 8]} />
          <meshStandardMaterial color={NPC_SKIN_COLOR} roughness={0.8} metalness={0} />
        </mesh>
      </group>

      {/* Head */}
      <group ref={headRef} position={[0, headY, 0]}>
        {/* Outline */}
        <mesh scale={1.1}>
          <sphereGeometry args={[HEAD_SIZE / 2, 20, 20]} />
          <meshBasicMaterial color={NPC_OUTLINE_COLOR} side={THREE.BackSide} />
        </mesh>
        {/* Main head */}
        <mesh castShadow>
          <sphereGeometry args={[HEAD_SIZE / 2, 20, 20]} />
          <meshStandardMaterial
            color={interacted ? "#94a3b8" : NPC_SKIN_COLOR}
            roughness={0.75}
            metalness={0}
            emissive={NPC_RIM_COLOR}
            emissiveIntensity={0.08}
          />
        </mesh>

        {/* Eyes - larger for expressiveness */}
        <mesh position={[0.07, 0, HEAD_SIZE / 2.3]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial
            color="#1e293b"
            roughness={0.3}
            metalness={0.1}
            emissive={NPC_RIM_COLOR}
            emissiveIntensity={0.2}
          />
        </mesh>
        <mesh position={[-0.07, 0, HEAD_SIZE / 2.3]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial
            color="#1e293b"
            roughness={0.3}
            metalness={0.1}
            emissive={NPC_RIM_COLOR}
            emissiveIntensity={0.2}
          />
        </mesh>

        {/* Eye highlights */}
        <mesh position={[0.075, 0.01, HEAD_SIZE / 2.35]}>
          <sphereGeometry args={[0.015, 6, 6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.065, 0.01, HEAD_SIZE / 2.35]}>
          <sphereGeometry args={[0.015, 6, 6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Glasses - teacher indicator */}
        <group position={[0, 0, HEAD_SIZE / 2.25]}>
          {/* Left lens */}
          <mesh position={[0.07, 0, 0]}>
            <torusGeometry args={[0.05, 0.008, 8, 16]} />
            <meshStandardMaterial color="#374151" roughness={0.3} metalness={0.5} />
          </mesh>
          {/* Right lens */}
          <mesh position={[-0.07, 0, 0]}>
            <torusGeometry args={[0.05, 0.008, 8, 16]} />
            <meshStandardMaterial color="#374151" roughness={0.3} metalness={0.5} />
          </mesh>
          {/* Bridge */}
          <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.006, 0.006, 0.06, 8]} />
            <meshStandardMaterial color="#374151" roughness={0.3} metalness={0.5} />
          </mesh>
        </group>

        {/* Smile - friendly expression */}
        <mesh position={[0, -0.06, HEAD_SIZE / 2.2]}>
          <sphereGeometry args={[0.04, 8, 8, 0, Math.PI]} />
          <meshStandardMaterial color="#fca5a5" roughness={0.8} metalness={0} />
        </mesh>
      </group>

      {/* Interaction indicator - larger and more visible */}
      {!interacted && (
        <mesh ref={indicatorRef} position={[0, NPC_HEIGHT + 0.35, 0]}>
          <sphereGeometry args={[0.14, 16, 16]} />
          <meshStandardMaterial
            color={isNearby ? "#22d3ee" : "#fbbf24"}
            emissive={isNearby ? "#22d3ee" : "#fbbf24"}
            emissiveIntensity={isNearby ? 0.8 : 0.5}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>
      )}

      {/* Checkmark when completed */}
      {interacted && (
        <mesh position={[0.45, headY + 0.1, 0]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={0.4}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>
      )}

      {/* "Press E to Talk" prompt */}
      {showPrompt && !interacted && (
        <Html
          position={[0, NPC_HEIGHT + 0.8, 0]}
          center
          distanceFactor={8}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div
            style={{
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(59,130,246,0.6)",
              borderRadius: 10,
              padding: "8px 14px",
              color: "#e2e8f0",
              fontSize: 13,
              fontFamily: "var(--font-inter, sans-serif)",
              fontWeight: 600,
              whiteSpace: "nowrap",
              boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
              animation: "float 1.5s ease-in-out infinite",
            }}
          >
            Press <strong style={{ color: "#60a5fa" }}>E</strong> to Talk
          </div>
        </Html>
      )}

      {/* Dialogue bubble */}
      {showDialogue && (
        <Html
          position={[0, NPC_HEIGHT + 1.0, 0]}
          center
          distanceFactor={8}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div
            style={{
              background: "rgba(15,23,42,0.96)",
              border: "1px solid rgba(59,130,246,0.5)",
              borderRadius: 14,
              padding: "16px 20px",
              color: "#f1f5f9",
              fontSize: 14,
              fontFamily: "var(--font-inter, sans-serif)",
              minWidth: 240,
              maxWidth: 300,
              boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div style={{ marginBottom: 10, color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Teacher {index + 1}
            </div>
            <div style={{ marginBottom: 14, lineHeight: 1.6 }}>
              &ldquo;Hello! Ready to practice English?&rdquo;
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export function NPCController({
  interacted,
  playerPosRef,
  onNearbyNPC,
  showDialogue,
  activeDialogueNPC,
  paused,
  npcPositions = NPC_POSITIONS,
}: NPCControllerProps) {
  const lastCheck = useRef(0);
  const nearbyRef = useRef<number | null>(null);

  // Proximity detection
  useFrame((_, dt) => {
    if (paused || showDialogue) return;
    lastCheck.current += dt;
    if (lastCheck.current < 0.1) return;
    lastCheck.current = 0;

    const p = playerPosRef.current;
    let nearest: number | null = null;
    let nearestDist = Infinity;

    npcPositions.forEach((npcX, i) => {
      if (interacted[i]) return;
      const dist = Math.abs(p.x - npcX);
      if (dist < INTERACT_DISTANCE && dist < nearestDist) {
        nearest = i;
        nearestDist = dist;
      }
    });

    if (nearest !== nearbyRef.current) {
      nearbyRef.current = nearest;
      onNearbyNPC(nearest);
    }
  });

  return (
    <>
      {npcPositions.map((x, i) => (
        <NPCMesh
          key={i}
          index={i}
          x={x}
          interacted={interacted[i]}
          isNearby={nearbyRef.current === i}
          showPrompt={nearbyRef.current === i && !showDialogue}
          showDialogue={showDialogue && activeDialogueNPC === i}
        />
      ))}
    </>
  );
}
