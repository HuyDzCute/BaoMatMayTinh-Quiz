"use client";

/**
 * Player Context
 *
 * Gameplay Phase 1: Player Controller
 * React context for player state management
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { IPlayerEntity, PlayerInput, PlayerOutput } from "../types";
import { PlayerController } from "../controller";
import { InputManager, KeyboardInputSource, getInputManager } from "../input";
import { CameraController, getCameraController } from "../camera";

/**
 * Player context value
 */
export interface PlayerContextValue {
  // Controllers
  playerController: IPlayerEntity | null;
  inputManager: InputManager | null;
  cameraController: CameraController | null;

  // State
  isReady: boolean;
  isPaused: boolean;
  playerOutput: PlayerOutput | null;

  // Controls
  update: (deltaTime: number) => void;
  setPaused: (paused: boolean) => void;
  reset: () => void;
  setPosition: (x: number, y: number, z: number) => void;
}

/**
 * Player context
 */
const PlayerContext = createContext<PlayerContextValue | null>(null);

/**
 * Provider props
 */
interface PlayerProviderProps {
  children: ReactNode;
  initialPosition?: { x: number; y: number; z: number };
  autoStart?: boolean;
  /** External input ref (for integration with existing systems) */
  externalInputRef?: React.MutableRefObject<{
    left: boolean;
    right: boolean;
    forward: boolean;
    backward: boolean;
    jump: boolean;
    run: boolean;
  }>;
  /** Auto-sync with external input ref */
  syncWithExternalInput?: boolean;
}

/**
 * Player provider component
 */
export function PlayerProvider({
  children,
  initialPosition,
  autoStart = true,
  externalInputRef,
  syncWithExternalInput = false,
}: PlayerProviderProps) {
  // State
  const [isReady, setIsReady] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playerOutput, setPlayerOutput] = useState<PlayerOutput | null>(null);

  // Controllers
  const playerController = useMemo(() => {
    const controller = new PlayerController("player");
    if (initialPosition) {
      controller.setPosition(initialPosition);
    }
    return controller;
  }, []);

  const inputManager = useMemo(() => getInputManager(), []);
  const cameraController = useMemo(() => getCameraController(), []);

  // Keyboard input source
  const keyboardSource = useMemo(() => new KeyboardInputSource(), []);

  // External input sync
  const lastExternalInput = useRef({
    left: false,
    right: false,
    forward: false,
    backward: false,
    jump: false,
    run: false,
  });

  // Initialize
  useEffect(() => {
    if (!autoStart) return;

    // Attach keyboard input (only if not using external input)
    if (!syncWithExternalInput) {
      keyboardSource.attach();
      inputManager.addSource(keyboardSource);
    }

    setIsReady(true);

    return () => {
      if (!syncWithExternalInput) {
        inputManager.removeSource(keyboardSource);
        keyboardSource.dispose();
      }
    };
  }, [autoStart, syncWithExternalInput, inputManager, keyboardSource]);

  /**
   * Update player state
   */
  const update = useCallback(
    (deltaTime: number) => {
      if (!isReady || isPaused) return;

      // Get input from external ref or internal manager
      let input: PlayerInput;

      if (syncWithExternalInput && externalInputRef) {
        // Sync with external input ref
        const ext = externalInputRef.current;

        // Only send jump on press (edge-triggered)
        const jumpPressed = ext.jump && !lastExternalInput.current.jump;
        lastExternalInput.current = { ...ext };

        input = {
          moveX: ext.left ? -1 : ext.right ? 1 : 0,
          moveZ: ext.backward ? -1 : ext.forward ? 1 : 0,
          jump: jumpPressed,
          run: ext.run,
        };
      } else {
        input = inputManager.getInput();
      }

      // Update player controller
      playerController.update(deltaTime, input);

      // Update camera
      const output = playerController.getOutput();
      cameraController.update(deltaTime, output.position, output.rotation);

      // Update state
      setPlayerOutput(playerController.getOutput());
    },
    [isReady, isPaused, syncWithExternalInput, externalInputRef, inputManager, playerController, cameraController]
  );

  /**
   * Set paused state
   */
  const setPaused = useCallback((paused: boolean) => {
    setIsPaused(paused);
    if (paused) {
      inputManager.disable();
    } else {
      inputManager.enable();
    }
  }, [inputManager]);

  /**
   * Reset player
   */
  const reset = useCallback(() => {
    playerController.reset();
    cameraController.reset();
    setPlayerOutput(playerController.getOutput());
  }, [playerController, cameraController]);

  /**
   * Set player position
   */
  const setPosition = useCallback(
    (x: number, y: number, z: number) => {
      playerController.setPosition({ x, y, z });
      setPlayerOutput(playerController.getOutput());
    },
    [playerController]
  );

  const value: PlayerContextValue = {
    playerController,
    inputManager,
    cameraController,
    isReady,
    isPaused,
    playerOutput,
    update,
    setPaused,
    reset,
    setPosition,
  };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

/**
 * Use player context
 */
export function usePlayerContext(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayerContext must be used within PlayerProvider");
  }
  return context;
}

/**
 * Hook to use player controller directly
 */
export function usePlayerController(): IPlayerEntity | null {
  const { playerController } = usePlayerContext();
  return playerController;
}

/**
 * Hook to use player output
 */
export function usePlayerOutput(): PlayerOutput | null {
  const { playerOutput } = usePlayerContext();
  return playerOutput;
}

/**
 * Hook to use player controls
 */
export function usePlayerControls() {
  const { setPaused, reset, setPosition } = usePlayerContext();
  return { setPaused, reset, setPosition };
}
