/**
 * Player Types
 *
 * Gameplay Phase 1: Player Controller
 * Core type definitions for player entity
 */

/**
 * Player movement state
 */
export type PlayerMovementState = "idle" | "walk" | "run" | "jump" | "fall";

/**
 * 3D Vector type
 */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Player physics state
 */
export interface PlayerPhysicsState {
  position: Vector3D;
  velocity: Vector3D;
  onGround: boolean;
  isGrounded: boolean;
  isMoving: boolean;
}

/**
 * Player character state
 */
export interface PlayerCharacterState {
  physics: PlayerPhysicsState;
  movementState: PlayerMovementState;
  isRunning: boolean;
  direction: number; // -1 = left, 0 = none, 1 = right
  speed: number;
  targetSpeed: number;
}

/**
 * Player configuration constants
 */
export interface PlayerConfig {
  walkSpeed: number;
  runSpeed: number;
  jumpVelocity: number;
  gravity: number;
  groundY: number;
  radius: number;
  height: number;
  turnSpeed: number;
  acceleration: number;
  deceleration: number;
}

/**
 * Player entity interface
 */
export interface IPlayerEntity {
  readonly id: string;
  readonly config: PlayerConfig;
  getState(): PlayerCharacterState;
  getOutput(): PlayerOutput;
  update(deltaTime: number, input: PlayerInput): void;
  reset(): void;
}

/**
 * Player input interface
 */
export interface PlayerInput {
  moveX: number;   // -1 (left) to 1 (right)
  moveZ: number;   // -1 (back) to 1 (forward)
  jump: boolean;
  run: boolean;
}

/**
 * Player output state (for rendering)
 */
export interface PlayerOutput {
  position: Vector3D;
  rotation: number;
  direction: number; // -1 = left, 0 = none, 1 = right
  movementState: PlayerMovementState;
  isMoving: boolean;
  isRunning: boolean;
  isGrounded: boolean;
}

/**
 * Default player configuration
 */
export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  walkSpeed: 5,
  runSpeed: 10,
  jumpVelocity: 8,
  gravity: 20,
  groundY: 0.5,
  radius: 0.35,
  height: 1.6,
  turnSpeed: 10,
  acceleration: 20,
  deceleration: 15,
};

/**
 * Create default physics state
 */
export function createDefaultPhysicsState(): PlayerPhysicsState {
  return {
    position: { x: 0, y: 0.5, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    onGround: true,
    isGrounded: true,
    isMoving: false,
  };
}

/**
 * Create default character state
 */
export function createDefaultCharacterState(): PlayerCharacterState {
  return {
    physics: createDefaultPhysicsState(),
    movementState: "idle",
    isRunning: false,
    direction: 0,
    speed: 0,
    targetSpeed: 0,
  };
}
