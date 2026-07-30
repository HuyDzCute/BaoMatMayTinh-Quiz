/**
 * Input Manager
 *
 * Gameplay Phase 1: Player Controller
 * Central input management system
 */

import type { IInputManager, IInputSource } from "../types";
import type { PlayerInput } from "../types/player-types";
import { rawToPlayerInput } from "../types/input-types";

/**
 * Input manager implementation
 */
export class InputManager implements IInputManager {
  private sources: Set<IInputSource> = new Set();
  private enabled = true;
  private cachedInput: PlayerInput = {
    moveX: 0,
    moveZ: 0,
    jump: false,
    run: false,
  };

  constructor() {
    // Initialize with empty state
  }

  /**
   * Get aggregated player input from all sources
   */
  getInput(): PlayerInput {
    if (!this.enabled) {
      return {
        moveX: 0,
        moveZ: 0,
        jump: false,
        run: false,
      };
    }

    // Aggregate inputs from all sources
    let moveX = 0;
    let moveZ = 0;
    let jump = false;
    let run = false;

    for (const source of this.sources) {
      if (!source.isActive()) continue;

      const raw = source.getRawInput();

      // Combine inputs (use first non-zero value)
      if (moveX === 0) moveX = raw.left ? -1 : raw.right ? 1 : 0;
      if (moveZ === 0) moveZ = raw.backward ? -1 : raw.forward ? 1 : 0;
      if (!jump) jump = raw.jump;
      if (!run) run = raw.run;
    }

    this.cachedInput = { moveX, moveZ, jump, run };
    return this.cachedInput;
  }

  /**
   * Check if input is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable input processing
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable input processing
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Add an input source
   */
  addSource(source: IInputSource): void {
    this.sources.add(source);
  }

  /**
   * Remove an input source
   */
  removeSource(source: IInputSource): void {
    this.sources.delete(source);
  }

  /**
   * Dispose all sources
   */
  dispose(): void {
    for (const source of this.sources) {
      source.dispose();
    }
    this.sources.clear();
  }
}

// Singleton instance
let inputManagerInstance: InputManager | null = null;

/**
 * Get input manager singleton
 */
export function getInputManager(): InputManager {
  if (!inputManagerInstance) {
    inputManagerInstance = new InputManager();
  }
  return inputManagerInstance;
}

/**
 * Reset input manager singleton
 */
export function resetInputManager(): void {
  if (inputManagerInstance) {
    inputManagerInstance.dispose();
    inputManagerInstance = null;
  }
}
