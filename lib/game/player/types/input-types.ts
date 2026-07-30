/**
 * Input Types
 *
 * Gameplay Phase 1: Player Controller
 * Input system abstraction
 */

import type { PlayerInput } from "./player-types";

/**
 * Raw input state from devices
 */
export interface RawInputState {
  left: boolean;
  right: boolean;
  forward: boolean;
  backward: boolean;
  jump: boolean;
  run: boolean;
}

/**
 * Input device type
 */
export type InputDeviceType = "keyboard" | "gamepad" | "touch" | "unknown";

/**
 * Input source interface
 */
export interface IInputSource {
  readonly deviceType: InputDeviceType;
  getRawInput(): RawInputState;
  isActive(): boolean;
  dispose(): void;
}

/**
 * Input manager interface
 */
export interface IInputManager {
  getInput(): PlayerInput;
  isEnabled(): boolean;
  enable(): void;
  disable(): void;
  addSource(source: IInputSource): void;
  removeSource(source: IInputSource): void;
}

/**
 * Default raw input state
 */
export function createDefaultRawInput(): RawInputState {
  return {
    left: false,
    right: false,
    forward: false,
    backward: false,
    jump: false,
    run: false,
  };
}

/**
 * Convert raw input to player input
 */
export function rawToPlayerInput(raw: RawInputState): PlayerInput {
  return {
    moveX: (raw.left ? -1 : 0) + (raw.right ? 1 : 0),
    moveZ: (raw.backward ? -1 : 0) + (raw.forward ? 1 : 0),
    jump: raw.jump,
    run: raw.run,
  };
}
