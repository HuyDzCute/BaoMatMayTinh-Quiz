/**
 * Player Controller
 *
 * Gameplay Phase 1: Player Controller
 * Core player movement logic (separated from rendering)
 */

import type {
  IPlayerEntity,
  PlayerCharacterState,
  PlayerInput,
  PlayerOutput,
  PlayerConfig,
  Vector3D,
} from "../types";
import {
  DEFAULT_PLAYER_CONFIG,
  createDefaultCharacterState,
} from "../types";

/**
 * Player controller implementation
 */
export class PlayerController implements IPlayerEntity {
  readonly id: string;
  readonly config: PlayerConfig;

  private state: PlayerCharacterState;
  private wasJumpPressed = false;

  /**
   * Create player controller
   */
  constructor(
    id: string = "player",
    config: Partial<PlayerConfig> = {}
  ) {
    this.id = id;
    this.config = { ...DEFAULT_PLAYER_CONFIG, ...config };
    this.state = createDefaultCharacterState();

    // Set initial position
    this.state.physics.position = {
      x: 0,
      y: this.config.groundY,
      z: 0,
    };
  }

  /**
   * Get current state
   */
  getState(): PlayerCharacterState {
    return { ...this.state };
  }

  /**
   * Update player state
   * @param deltaTime - Time since last update (seconds)
   * @param input - Player input
   */
  update(deltaTime: number, input: PlayerInput): void {
    const dt = Math.min(deltaTime, 0.1); // Clamp delta time
    const physics = this.state.physics;

    // Calculate target speed
    const targetSpeed = input.run
      ? this.config.runSpeed
      : this.config.walkSpeed;

    // Calculate movement direction
    const moveDir = input.moveX !== 0 ? Math.sign(input.moveX) : input.moveZ !== 0 ? Math.sign(input.moveZ) : 0;
    this.state.direction = moveDir;

    // Apply acceleration/deceleration to X
    if (input.moveX !== 0) {
      physics.velocity.x = this.lerp(
        physics.velocity.x,
        input.moveX * targetSpeed,
        this.config.acceleration * dt
      );
    } else {
      physics.velocity.x = this.lerp(
        physics.velocity.x,
        0,
        this.config.deceleration * dt
      );
    }

    // Apply acceleration/deceleration to Z
    if (input.moveZ !== 0) {
      physics.velocity.z = this.lerp(
        physics.velocity.z,
        input.moveZ * targetSpeed,
        this.config.acceleration * dt
      );
    } else {
      physics.velocity.z = this.lerp(
        physics.velocity.z,
        0,
        this.config.deceleration * dt
      );
    }

    // Handle jumping (edge-triggered)
    if (input.jump && !this.wasJumpPressed && physics.isGrounded) {
      physics.velocity.y = this.config.jumpVelocity;
      physics.isGrounded = false;
      physics.onGround = false;
    }
    this.wasJumpPressed = input.jump;

    // Apply gravity
    if (!physics.isGrounded) {
      physics.velocity.y -= this.config.gravity * dt;
    }

    // Update position
    physics.position.x += physics.velocity.x * dt;
    physics.position.y += physics.velocity.y * dt;
    physics.position.z += physics.velocity.z * dt;

    // Ground collision
    if (physics.position.y <= this.config.groundY) {
      physics.position.y = this.config.groundY;
      physics.velocity.y = 0;
      physics.isGrounded = true;
      physics.onGround = true;
    }

    // Update movement state
    this.updateMovementState(input);

    // Update derived values
    physics.isMoving = Math.abs(physics.velocity.x) > 0.1 || Math.abs(physics.velocity.z) > 0.1;
    this.state.speed = Math.sqrt(physics.velocity.x ** 2 + physics.velocity.z ** 2);
    this.state.isRunning = input.run && physics.isMoving;
  }

  /**
   * Update movement state machine
   */
  private updateMovementState(input: PlayerInput): void {
    const physics = this.state.physics;

    if (!physics.isGrounded) {
      // In air
      this.state.movementState = physics.velocity.y > 0 ? "jump" : "fall";
    } else {
      // On ground
      const isMoving = input.moveX !== 0 || input.moveZ !== 0;

      if (!isMoving) {
        this.state.movementState = "idle";
      } else if (input.run) {
        this.state.movementState = "run";
      } else {
        this.state.movementState = "walk";
      }
    }
  }

  /**
   * Get output for rendering
   */
  getOutput(): PlayerOutput {
    return {
      position: { ...this.state.physics.position },
      rotation: this.state.direction !== 0 ? Math.atan2(this.state.direction, 1) : 0,
      direction: this.state.direction,
      movementState: this.state.movementState,
      isMoving: this.state.physics.isMoving,
      isRunning: this.state.isRunning,
      isGrounded: this.state.physics.isGrounded,
    };
  }

  /**
   * Set position directly
   */
  setPosition(position: Vector3D): void {
    this.state.physics.position = { ...position };
    this.state.physics.velocity = { x: 0, y: 0, z: 0 };
  }

  /**
   * Reset player to initial state
   */
  reset(): void {
    this.state = createDefaultCharacterState();
    this.state.physics.position = {
      x: 0,
      y: this.config.groundY,
      z: 0,
    };
    this.wasJumpPressed = false;
  }

  /**
   * Linear interpolation helper
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * Math.min(t, 1);
  }
}
