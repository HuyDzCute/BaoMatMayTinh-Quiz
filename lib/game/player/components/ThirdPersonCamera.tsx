"use client";

/**
 * Third Person Camera - Professional Quality
 *
 * Gameplay Phase 1 Polish
 * Smooth follow camera with collision avoidance and professional feel
 */

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerContext } from "./PlayerContext";

/**
 * Camera configuration
 */
export interface CameraConfig {
  /** Distance from player */
  distance: number;
  /** Height offset from player */
  height: number;
  /** Horizontal offset */
  lateralOffset: number;
  /** Camera pitch angle (radians) */
  pitch: number;
  /** Field of view */
  fov: number;
  /** Follow smoothing speed */
  followSmoothness: number;
  /** Rotation smoothing speed */
  rotationSmoothness: number;
  /** Look-at height offset */
  lookAtHeight: number;
  /** Minimum collision distance */
  minCollisionDistance: number;
  /** Enable collision avoidance */
  enableCollision: boolean;
  /** Enable mouse orbit (for future) */
  enableMouseOrbit: boolean;
}

/**
 * Default camera configuration - optimized for visibility
 */
const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  distance: 8,
  height: 4,
  lateralOffset: 0,
  pitch: 0.35, // ~20 degrees looking down
  fov: 55,
  followSmoothness: 8,
  rotationSmoothness: 6,
  lookAtHeight: 1.2,
  minCollisionDistance: 1.5,
  enableCollision: true,
  enableMouseOrbit: false,
};

/**
 * Third person camera component
 */
export function ThirdPersonCamera({
  config = DEFAULT_CAMERA_CONFIG,
  smoothing,
  offset,
}: {
  /** Camera configuration override */
  config?: Partial<CameraConfig>;
  /** Legacy smoothing prop */
  smoothing?: number;
  /** Legacy offset prop */
  offset?: { x: number; y: number; z: number };
}) {
  const { camera } = useThree();
  const { playerOutput, isReady, isPaused, cameraController } = usePlayerContext();

  // Merge configs
  const camConfig = { ...DEFAULT_CAMERA_CONFIG, ...config };
  
  // Apply legacy props if provided
  if (smoothing !== undefined) {
    camConfig.followSmoothness = smoothing * 10;
  }
  if (offset) {
    camConfig.lateralOffset = offset.x;
    camConfig.height = offset.y;
    camConfig.distance = offset.z;
  }

  // Camera state refs
  const currentPosition = useRef(new THREE.Vector3(0, 4, 10));
  const currentLookAt = useRef(new THREE.Vector3(0, 1.2, 0));
  const targetPosition = useRef(new THREE.Vector3());
  const desiredPosition = useRef(new THREE.Vector3());
  
  // Mouse orbit state
  const orbitAngleH = useRef(0); // Horizontal orbit
  const orbitAngleV = useRef(camConfig.pitch); // Vertical orbit
  
  // Collision detection
  const collisionOffset = useRef(0);
  const lastCollisionTime = useRef(0);

  // Raycaster for collision
  const raycaster = useRef(new THREE.Raycaster());
  const collisionObjects = useRef<THREE.Object3D[]>([]);

  // Set initial FOV
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = camConfig.fov;
      camera.updateProjectionMatrix();
    }
  }, [camera, camConfig.fov]);

  // Collect collision objects
  useEffect(() => {
    // Find all potential collision objects (walls, floor, ceiling)
    const scene = camera.parent;
    if (!scene) return;

    const collectObjects = (obj: THREE.Object3D) => {
      if (obj.userData.isWall || obj.userData.isFloor || obj.userData.isCeiling) {
        collisionObjects.current.push(obj);
      }
      obj.children.forEach(collectObjects);
    };

    scene.traverse(collectObjects);
  }, [camera]);

  // Mouse/touch orbit controls
  useEffect(() => {
    if (!camConfig.enableMouseOrbit) return;

    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - lastMouseX;
      const deltaY = e.clientY - lastMouseY;
      
      orbitAngleH.current -= deltaX * 0.005;
      orbitAngleV.current = Math.max(
        0.1,
        Math.min(Math.PI / 2 - 0.1, orbitAngleV.current - deltaY * 0.005)
      );
      
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      camConfig.distance = Math.max(3, Math.min(15, camConfig.distance + e.deltaY * 0.01));
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [camConfig]);

  // Main update loop
  useFrame((_, delta) => {
    if (!isReady || !playerOutput || isPaused || !cameraController) return;

    const dt = Math.min(delta, 0.1);
    const playerPos = playerOutput.position;

    // Calculate desired camera position
    // Use orbit angle or default behind player
    let horizontalAngle: number;
    
    if (camConfig.enableMouseOrbit && orbitAngleH.current !== 0) {
      horizontalAngle = orbitAngleH.current;
    } else {
      // Default: camera stays behind player based on movement direction
      horizontalAngle = playerOutput.direction !== 0 
        ? (playerOutput.direction > 0 ? Math.PI : 0)
        : Math.PI;
    }

    const verticalAngle = camConfig.enableMouseOrbit ? orbitAngleV.current : camConfig.pitch;

    // Calculate spherical position
    const distance = camConfig.distance + collisionOffset.current;
    const heightOffset = camConfig.height * Math.cos(verticalAngle);
    const distanceHorizontal = distance * Math.sin(verticalAngle);

    desiredPosition.current.set(
      playerPos.x + Math.sin(horizontalAngle) * distanceHorizontal + camConfig.lateralOffset,
      playerPos.y + heightOffset,
      playerPos.z + Math.cos(horizontalAngle) * distanceHorizontal
    );

    // Collision detection
    if (camConfig.enableCollision) {
      const rayDirection = desiredPosition.current.clone().sub(playerPos).normalize();
      const rayLength = distance + camConfig.minCollisionDistance;
      
      raycaster.current.set(
        new THREE.Vector3(playerPos.x, playerPos.y + camConfig.lookAtHeight, playerPos.z),
        rayDirection
      );

      // Check for wall intersections
      const intersects = raycaster.current.intersectObjects(collisionObjects.current, true);
      
      if (intersects.length > 0 && intersects[0].distance < rayLength) {
        // Move camera closer to avoid collision
        const safeDistance = intersects[0].distance - camConfig.minCollisionDistance;
        collisionOffset.current = Math.max(0, safeDistance - distance);
        lastCollisionTime.current = Date.now();
      } else {
        // Smoothly return to normal distance
        collisionOffset.current = THREE.MathUtils.lerp(
          collisionOffset.current,
          0,
          dt * 3
        );
      }
    }

    // Apply final desired position after collision
    targetPosition.current.set(
      playerPos.x + Math.sin(horizontalAngle) * (distanceHorizontal + collisionOffset.current * 0.5) + camConfig.lateralOffset,
      playerPos.y + heightOffset - collisionOffset.current * 0.3,
      playerPos.z + Math.cos(horizontalAngle) * (distanceHorizontal + collisionOffset.current * 0.5)
    );

    // Smooth camera movement
    const lerpFactor = 1 - Math.pow(1 - camConfig.followSmoothness * dt, dt * 60);
    currentPosition.current.lerp(targetPosition.current, lerpFactor);
    camera.position.copy(currentPosition.current);

    // Calculate look-at target
    const lookAtTarget = new THREE.Vector3(
      playerPos.x,
      playerPos.y + camConfig.lookAtHeight,
      playerPos.z
    );
    
    // Smooth look-at
    currentLookAt.current.lerp(lookAtTarget, 1 - Math.pow(1 - camConfig.rotationSmoothness * dt, dt * 60));
    camera.lookAt(currentLookAt.current);

    // Update camera controller
    cameraController.update(dt, playerPos, playerOutput.direction);
  });

  return null;
}
