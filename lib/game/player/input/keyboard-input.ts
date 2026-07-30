/**
 * Keyboard Input Source
 *
 * Gameplay Phase 1: Player Controller
 * Keyboard input implementation
 */

import type { IInputSource, RawInputState } from "../types";

/**
 * Keyboard input source
 */
export class KeyboardInputSource implements IInputSource {
  readonly deviceType = "keyboard" as const;

  private state: RawInputState = {
    left: false,
    right: false,
    forward: false,
    backward: false,
    jump: false,
    run: false,
  };

  private listeners: Array<(state: RawInputState) => void> = [];
  private isAttached = false;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  /**
   * Attach event listeners
   */
  attach(): void {
    if (this.isAttached) return;

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.isAttached = true;
  }

  /**
   * Detach event listeners
   */
  detach(): void {
    if (!this.isAttached) return;

    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.isAttached = false;
  }

  /**
   * Get raw input state
   */
  getRawInput(): RawInputState {
    return { ...this.state };
  }

  /**
   * Check if any input is active
   */
  isActive(): boolean {
    return (
      this.state.left ||
      this.state.right ||
      this.state.forward ||
      this.state.backward ||
      this.state.jump
    );
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.detach();
    this.listeners = [];
  }

  /**
   * Subscribe to input changes
   */
  subscribe(callback: (state: RawInputState) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Handle key down event
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const wasActive = this.isActive();
    this.updateState(event.code, true);
    this.notifyListeners(wasActive);
  }

  /**
   * Handle key up event
   */
  private handleKeyUp(event: KeyboardEvent): void {
    const wasActive = this.isActive();
    this.updateState(event.code, false);
    this.notifyListeners(wasActive);
  }

  /**
   * Update state based on key code
   */
  private updateState(code: string, pressed: boolean): void {
    switch (code) {
      // Left movement
      case "ArrowLeft":
      case "KeyA":
        this.state.left = pressed;
        break;

      // Right movement
      case "ArrowRight":
      case "KeyD":
        this.state.right = pressed;
        break;

      // Forward movement
      case "ArrowUp":
      case "KeyW":
        this.state.forward = pressed;
        break;

      // Backward movement
      case "ArrowDown":
      case "KeyS":
        this.state.backward = pressed;
        break;

      // Jump
      case "Space":
        this.state.jump = pressed;
        break;

      // Run (Shift)
      case "ShiftLeft":
      case "ShiftRight":
        this.state.run = pressed;
        break;
    }
  }

  /**
   * Notify listeners of state change
   */
  private notifyListeners(wasActive: boolean): void {
    const isActive = this.isActive();
    if (wasActive !== isActive) {
      const state = this.getRawInput();
      this.listeners.forEach((cb) => cb(state));
    }
  }
}
