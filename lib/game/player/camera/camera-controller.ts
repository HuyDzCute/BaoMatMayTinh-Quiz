/**
 * Third Person Camera Controller
 *
 * Gameplay Phase 1: Player Controller
 * Camera follow logic (separated from rendering)
 */

import type { Vector3D } from "../types";

/**
 * Camera configuration
 */
export interface CameraConfig {
  offset: Vector3D;
  lookAtOffset: Vector3D;
  followSpeed: number;
  rotationSpeed: number;
  minDistance: number;
  maxDistance: number;
  minPitch: number;
  maxPitch: number;
  smoothing: number;
}

/**
 * Default camera configuration
 */
export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  offset: { x: 0, y: 3, z: 8 },
  lookAtOffset: { x: 0, y: 1, z: 0 },
  followSpeed: 5,
  rotationSpeed: 3,
  minDistance: 5,
  maxDistance: 15,
  minPitch: 0.1,
  maxPitch: Math.PI / 2 - 0.1,
  smoothing: 0.1,
};

/**
 * Camera controller for third-person follow
 */
export class CameraController {
  readonly config: CameraConfig;

  private targetPosition: Vector3D;
  private currentPosition: Vector3D;
  private targetRotation = 0;
  private currentPitch = Math.PI / 6; // 30 degrees default
  private distance = 8;

  /**
   * Create camera controller
   */
  constructor(config: Partial<CameraConfig> = {}) {
    this.config = { ...DEFAULT_CAMERA_CONFIG, ...config };
    this.targetPosition = { x: 0, y: 0, z: 0 };
    this.currentPosition = { x: 0, y: 3, z: 8 };
  }

  /**
   * Get current camera position
   */
  getPosition(): Vector3D {
    return { ...this.currentPosition };
  }

  /**
   * Get look-at target
   */
  getLookAt(): Vector3D {
    return {
      x: this.targetPosition.x + this.config.lookAtOffset.x,
      y: this.targetPosition.y + this.config.lookAtOffset.y,
      z: this.targetPosition.z + this.config.lookAtOffset.z,
    };
  }

  /**
   * Get camera rotation (for Three.js camera.up)
   */
  getUpVector(): Vector3D {
    return { x: 0, y: 1, z: 0 };
  }

  /**
   * Update camera to follow target
   * @param deltaTime - Time since last update (seconds)
   * @param targetPosition - Player position to follow
   * @param targetDirection - Player facing direction
   */
  update(deltaTime: number, targetPosition: Vector3D, targetDirection: number): void {
    const dt = Math.min(deltaTime, 0.1);
    const smoothing = 1 - Math.exp(-this.config.smoothing * dt * 60);

    // Update target position
    this.targetPosition = { ...targetPosition };

    // Smoothly move camera position
    const targetCameraPos = this.getCameraTargetPosition(targetDirection);

    this.currentPosition.x += (targetCameraPos.x - this.currentPosition.x) * smoothing;
    this.currentPosition.y += (targetCameraPos.y - this.currentPosition.y) * smoothing;
    this.currentPosition.z += (targetCameraPos.z - this.currentPosition.z) * smoothing;
  }

  /**
   * Calculate target camera position based on player direction
   */
  private getCameraTargetPosition(playerDirection: number): Vector3D {
    // Camera stays behind player (opposite to direction)
    const dirX = playerDirection !== 0 ? -playerDirection : 0;

    return {
      x: this.targetPosition.x + this.config.offset.x + dirX * 2,
      y: this.targetPosition.y + this.config.offset.y,
      z: this.targetPosition.z + this.config.offset.z,
    };
  }

  /**
   * Adjust camera distance (zoom)
   */
  setDistance(distance: number): void {
    this.distance = Math.max(
      this.config.minDistance,
      Math.min(this.config.maxDistance, distance)
    );
  }

  /**
   * Adjust camera pitch angle
   */
  setPitch(pitch: number): void {
    this.currentPitch = Math.max(
      this.config.minPitch,
      Math.min(this.config.maxPitch, pitch)
    );
  }

  /**
   * Reset camera to default position
   */
  reset(): void {
    this.currentPosition = {
      x: this.config.offset.x,
      y: this.config.offset.y,
      z: this.config.offset.z,
    };
    this.targetRotation = 0;
    this.currentPitch = Math.PI / 6;
    this.distance = 8;
  }
}

// Singleton instance
let cameraControllerInstance: CameraController | null = null;

/**
 * Get camera controller singleton
 */
export function getCameraController(): CameraController {
  if (!cameraControllerInstance) {
    cameraControllerInstance = new CameraController();
  }
  return cameraControllerInstance;
}

/**
 * Reset camera controller singleton
 */
export function resetCameraController(): void {
  if (cameraControllerInstance) {
    cameraControllerInstance.reset();
  }
}
