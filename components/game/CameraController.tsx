/**
 * WordRun3D — Camera Controller
 *
 * Feature 5: Smooth follow camera + zoom toward NPC when dialogue open.
 */
"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Vector3 } from "@/lib/wordrun-types";

const FOLLOW_OFFSET_X = 5;
const FOLLOW_OFFSET_Y = 3.5;
const FOLLOW_OFFSET_Z = 9;
const CAMERA_LERP = 0.08;

// Dialogue zoom
const DIALOGUE_OFFSET_X = 1;
const DIALOGUE_OFFSET_Y = 2.5;
const DIALOGUE_OFFSET_Z = 5;
const DIALOGUE_LERP = 0.06;

export function CameraController({
  playerPosRef,
  dialogueOpen,
  targetNPCX,
}: {
  playerPosRef: React.MutableRefObject<Vector3>;
  dialogueOpen: boolean;
  targetNPCX: number | null;
}) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const dialogueProgress = useRef(0); // 0 = follow, 1 = dialogue zoom

  useFrame((_, dt) => {
    const p = playerPosRef.current;
    const target = dialogueOpen && targetNPCX !== null
      ? targetNPCX
      : p.x;

    // Lerp toward dialogue progress
    const targetProgress = dialogueOpen ? 1 : 0;
    dialogueProgress.current = THREE.MathUtils.lerp(
      dialogueProgress.current,
      targetProgress,
      dialogueOpen ? DIALOGUE_LERP : DIALOGUE_LERP * 1.5,
    );

    // Interpolate camera offset based on dialogue progress
    const ox = THREE.MathUtils.lerp(FOLLOW_OFFSET_X, DIALOGUE_OFFSET_X, dialogueProgress.current);
    const oy = THREE.MathUtils.lerp(FOLLOW_OFFSET_Y, DIALOGUE_OFFSET_Y, dialogueProgress.current);
    const oz = THREE.MathUtils.lerp(FOLLOW_OFFSET_Z, DIALOGUE_OFFSET_Z, dialogueProgress.current);

    targetPos.current.set(target + ox, oy, oz);
    camera.position.lerp(targetPos.current, CAMERA_LERP);

    // Look at player during follow, NPC during dialogue
    const lookX = dialogueOpen && targetNPCX !== null
      ? targetNPCX
      : p.x + 2;
    camera.lookAt(lookX, 1.0, 0);
  });

  return null;
}
