/**
 * WordRun3D — NPC Module
 *
 * Feature 5: Interactive NPC System.
 * - "Press E to Talk" prompt when player in range
 * - E key triggers dialogue
 * - Dialogue bubble rendered as HTML overlay
 */
"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { NPC_POSITIONS, WORLD } from "./WorldScene";
import type { Vector3 } from "@/lib/wordrun-types";

interface NPCControllerProps {
  interacted: boolean[];
  playerPosRef: React.MutableRefObject<Vector3>;
  onNearbyNPC: (npcIdx: number | null) => void;
  onStartQuiz: (npcIdx: number) => void;
  showDialogue: boolean;
  activeDialogueNPC: number | null;
  paused: boolean;
}

const NPC_COLORS = ["#f472b6", "#a78bfa", "#34d399"] as const;
const INTERACT_DISTANCE = 2.5;

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
  const bodyRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const walkCycle = useRef(Math.random() * Math.PI * 2);
  const maxWander = 1.2;
  const baseX = useRef(x);

  useFrame((_, dt) => {
    if (!groupRef.current || !bodyRef.current) return;

    walkCycle.current += dt * 1.2;
    const wander = Math.sin(walkCycle.current) * maxWander * 0.5;
    const newX = baseX.current + wander;

    groupRef.current.position.x = newX;

    const isMoving = Math.abs(Math.cos(walkCycle.current)) > 0.3;
    bodyRef.current.position.y = isMoving ? Math.sin(walkCycle.current * 2) * 0.05 : 0;
  });

  const color = NPC_COLORS[index % NPC_COLORS.length];
  const worldX = baseX.current;

  return (
    <group ref={groupRef} position={[x, 0, 0]}>
      {/* Body */}
      <mesh ref={bodyRef} castShadow position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.9, 16]} />
        <meshStandardMaterial
          color={interacted ? "#475569" : color}
          emissive={interacted ? "#1e293b" : color}
          emissiveIntensity={interacted ? 0.1 : 0.3}
          roughness={0.6}
        />
      </mesh>

      {/* Head */}
      <mesh castShadow position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial
          color={interacted ? "#94a3b8" : "#fcd9bd"}
          roughness={0.5}
        />
      </mesh>

      {/* Eyes */}
      <mesh position={[0.12, 1.34, 0.22]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[-0.12, 1.34, 0.22]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Interaction indicator */}
      {!interacted && (
        <mesh position={[0, 1.9, 0]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial
            color={isNearby ? "#22d3ee" : "#fbbf24"}
            emissive={isNearby ? "#22d3ee" : "#fbbf24"}
            emissiveIntensity={isNearby ? 1.2 : 0.8}
          />
        </mesh>
      )}

      {/* Checkmark when done */}
      {interacted && (
        <mesh position={[0.4, 1.1, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}

      {/* "Press E to Talk" prompt */}
      {showPrompt && !interacted && (
        <Html
          position={[0, 2.5, 0]}
          center
          distanceFactor={8}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div
            style={{
              background: "rgba(15,23,42,0.92)",
              border: "1px solid rgba(59,130,246,0.5)",
              borderRadius: 8,
              padding: "6px 12px",
              color: "#e2e8f0",
              fontSize: 13,
              fontFamily: "var(--font-inter, sans-serif)",
              fontWeight: 600,
              whiteSpace: "nowrap",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
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
          position={[0, 2.8, 0]}
          center
          distanceFactor={8}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div
            style={{
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(59,130,246,0.4)",
              borderRadius: 12,
              padding: "14px 18px",
              color: "#f1f5f9",
              fontSize: 13,
              fontFamily: "var(--font-inter, sans-serif)",
              minWidth: 220,
              maxWidth: 280,
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ marginBottom: 10, color: "#94a3b8", fontSize: 11 }}>
              {NPC_COLORS[index]} Student
            </div>
            <div style={{ marginBottom: 12, lineHeight: 1.5 }}>
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
  onStartQuiz,
  showDialogue,
  activeDialogueNPC,
  paused,
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

    NPC_POSITIONS.forEach((x, i) => {
      if (interacted[i]) return;
      const dist = Math.abs(p.x - x);
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
      {NPC_POSITIONS.map((x, i) => (
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
