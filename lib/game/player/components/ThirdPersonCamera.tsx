"use client";

/**
 * Third Person Camera
 *
 * Gameplay Phase 1: Player Controller
 * Three.js camera following the player
 */

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerContext } from "./PlayerContext";

/**
 * Third person camera props
 */
export interface ThirdPersonCameraProps {
  /** Camera smoothing factor */
  smoothing?: number;
  /** Camera offset from player */
  offset?: { x: number; y: number; z: number };
  /** Look-at offset */
  lookAtOffset?: { x: number; y: number; z: number };
  /** Enable zoom controls */
  enableZoom?: boolean;
}

/**
 * Default camera offset
 */
const DEFAULT_OFFSET = { x: 0, y: 3, z: 8 };
const DEFAULT_LOOK_AT_OFFSET = { x: 0, y: 1.2, z: 0 };

/**
 * Third person camera component
 */
export function ThirdPersonCamera({
  smoothing = 0.1,
  offset = DEFAULT_OFFSET,
  lookAtOffset = DEFAULT_LOOK_AT_OFFSET,
  enableZoom = true,
}: ThirdPersonCameraProps) {
  const { camera } = useThree();
  const { cameraController, playerOutput, isReady, isPaused } = usePlayerContext();

  // Target position for smooth interpolation
  const targetPosition = useRef(new THREE.Vector3(0, 3, 8));
  const targetLookAt = useRef(new THREE.Vector3(0, 1.2, 0));
  const currentLookAt = useRef(new THREE.Vector3(0, 1.2, 0));

  // Mouse/touch zoom state
  const zoomLevel = useRef(1);
  const minZoom = 0.5;
  const maxZoom = 2;

  // Handle wheel zoom
  useRef(() => {
    if (!enableZoom) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomLevel.current = Math.max(
        minZoom,
        Math.min(maxZoom, zoomLevel.current - e.deltaY * 0.001)
      );
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  });

  // Update camera
  useFrame((_, delta) => {
    if (!isReady || !playerOutput || isPaused || !cameraController) return;

    const dt = Math.min(delta, 0.1);
    const lerpFactor = 1 - Math.pow(1 - smoothing, dt * 60);

    // Get camera controller position
    const controllerPos = cameraController.getPosition();
    const controllerLookAt = cameraController.getLookAt();

    // Calculate target position
    const playerPos = playerOutput.position;
    const targetPos = {
      x: playerPos.x + offset.x * zoomLevel.current,
      y: playerPos.y + offset.y * zoomLevel.current,
      z: playerPos.z + offset.z * zoomLevel.current,
    };

    targetPosition.current.set(targetPos.x, targetPos.y, targetPos.z);
    targetLookAt.current.set(
      playerPos.x + lookAtOffset.x,
      playerPos.y + lookAtOffset.y,
      playerPos.z + lookAtOffset.z
    );

    // Smooth interpolation
    camera.position.lerp(targetPosition.current, lerpFactor);
    currentLookAt.current.lerp(targetLookAt.current, lerpFactor);

    // Look at target
    camera.lookAt(currentLookAt.current);
  });

  return null;
}
