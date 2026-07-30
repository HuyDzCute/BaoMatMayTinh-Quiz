"use client";

/**
 * Game Player Component
 *
 * Gameplay Phase 1: Player Controller
 * Main player component that combines all systems
 */

import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { PlayerProvider, usePlayerContext, type PlayerContextValue } from "./PlayerContext";
import { PlayerEntity } from "./PlayerEntity";
import { ThirdPersonCamera } from "./ThirdPersonCamera";

/**
 * Game player props
 */
export interface GamePlayerProps {
  /** Initial player position */
  initialPosition?: { x: number; y: number; z: number };
  /** Player shirt color */
  shirtColor?: string;
  /** Player pants color */
  pantsColor?: string;
  /** Player skin color */
  skinColor?: string;
  /** Player hair color */
  hairColor?: string;
  /** Enable third person camera */
  enableCamera?: boolean;
  /** Camera offset */
  cameraOffset?: { x: number; y: number; z: number };
  /** Camera smoothing */
  cameraSmoothing?: number;
  /** Auto-start player systems */
  autoStart?: boolean;
  /** External input ref (for integration with existing systems) */
  externalInputRef?: MutableRefObject<{
    left: boolean;
    right: boolean;
    forward: boolean;
    backward: boolean;
    jump: boolean;
    run: boolean;
  }>;
  /** Children */
  children?: React.ReactNode;
}

/**
 * Hook to get player update function (for use in parent's useFrame)
 */
export function usePlayerUpdate(): (deltaTime: number) => void {
  const { update } = usePlayerContext();
  return update;
}

/**
 * Game player internal component
 */
function GamePlayerInternal({
  initialPosition,
  shirtColor,
  pantsColor,
  skinColor,
  hairColor,
  enableCamera = true,
  cameraOffset,
  cameraSmoothing,
  children,
}: GamePlayerProps) {
  const { isReady, update, playerOutput } = usePlayerContext();
  const lastTime = useRef(0);

  // Main update loop
  useFrame((state, delta) => {
    if (!isReady) return;

    // Calculate delta time
    const currentTime = state.clock.getElapsedTime();
    const deltaTime = lastTime.current > 0 ? currentTime - lastTime.current : delta;
    lastTime.current = currentTime;

    // Update player systems
    update(deltaTime);
  });

  return (
    <>
      {/* Third person camera */}
      {enableCamera && (
        <ThirdPersonCamera
          offset={cameraOffset}
          smoothing={cameraSmoothing}
        />
      )}

      {/* Player entity */}
      {isReady && playerOutput && (
        <PlayerEntity
          shirtColor={shirtColor}
          pantsColor={pantsColor}
          skinColor={skinColor}
          hairColor={hairColor}
        />
      )}

      {/* Children (for extensions) */}
      {children}
    </>
  );
}

/**
 * Game player component with provider (standalone)
 */
export function GamePlayer(props: GamePlayerProps) {
  return (
    <PlayerProvider
      initialPosition={props.initialPosition}
      autoStart={props.autoStart}
      externalInputRef={props.externalInputRef}
      syncWithExternalInput={!!props.externalInputRef}
    >
      <GamePlayerInternal {...props} />
    </PlayerProvider>
  );
}

/**
 * Game player component for integration (uses parent's update loop)
 */
export interface GamePlayerIntegratedProps {
  /** Initial player position */
  initialPosition?: { x: number; y: number; z: number };
  /** Player shirt color */
  shirtColor?: string;
  /** Player pants color */
  pantsColor?: string;
  /** Player skin color */
  skinColor?: string;
  /** Player hair color */
  hairColor?: string;
  /** Enable third person camera */
  enableCamera?: boolean;
  /** Camera offset */
  cameraOffset?: { x: number; y: number; z: number };
  /** Camera smoothing */
  cameraSmoothing?: number;
  /** External input ref */
  externalInputRef: MutableRefObject<{
    left: boolean;
    right: boolean;
    forward: boolean;
    backward: boolean;
    jump: boolean;
    run: boolean;
  }>;
  /** Callback when player position updates */
  onPositionUpdate?: (pos: { x: number; y: number; z: number }) => void;
  /** Children */
  children?: React.ReactNode;
}

export function GamePlayerIntegrated({
  initialPosition,
  shirtColor,
  pantsColor,
  skinColor,
  hairColor,
  enableCamera = true,
  cameraOffset,
  cameraSmoothing,
  externalInputRef,
  onPositionUpdate,
  children,
}: GamePlayerIntegratedProps) {
  return (
    <PlayerProvider
      initialPosition={initialPosition}
      autoStart={true}
      externalInputRef={externalInputRef}
      syncWithExternalInput={true}
    >
      <GamePlayerIntegratedInternal
        enableCamera={enableCamera}
        cameraOffset={cameraOffset}
        cameraSmoothing={cameraSmoothing}
        shirtColor={shirtColor}
        pantsColor={pantsColor}
        skinColor={skinColor}
        hairColor={hairColor}
        onPositionUpdate={onPositionUpdate}
      >
        {children}
      </GamePlayerIntegratedInternal>
    </PlayerProvider>
  );
}

function GamePlayerIntegratedInternal({
  enableCamera,
  cameraOffset,
  cameraSmoothing,
  shirtColor,
  pantsColor,
  skinColor,
  hairColor,
  onPositionUpdate,
  children,
}: {
  enableCamera?: boolean;
  cameraOffset?: { x: number; y: number; z: number };
  cameraSmoothing?: number;
  shirtColor?: string;
  pantsColor?: string;
  skinColor?: string;
  hairColor?: string;
  onPositionUpdate?: (pos: { x: number; y: number; z: number }) => void;
  children?: React.ReactNode;
}) {
  const { isReady, update, playerOutput } = usePlayerContext();
  const lastTime = useRef(0);

  // Main update loop
  useFrame((state, delta) => {
    if (!isReady) return;

    // Calculate delta time
    const currentTime = state.clock.getElapsedTime();
    const deltaTime = lastTime.current > 0 ? currentTime - lastTime.current : delta;
    lastTime.current = currentTime;

    // Update player systems
    update(deltaTime);

    // Callback with position
    if (onPositionUpdate && playerOutput) {
      onPositionUpdate(playerOutput.position);
    }
  });

  return (
    <>
      {/* Third person camera */}
      {enableCamera && (
        <ThirdPersonCamera
          offset={cameraOffset}
          smoothing={cameraSmoothing}
        />
      )}

      {/* Player entity */}
      {isReady && playerOutput && (
        <PlayerEntity
          shirtColor={shirtColor}
          pantsColor={pantsColor}
          skinColor={skinColor}
          hairColor={hairColor}
        />
      )}

      {/* Children (for extensions) */}
      {children}
    </>
  );
}

// Re-export for convenience
export { PlayerProvider, usePlayerContext, usePlayerController, usePlayerOutput, usePlayerControls } from "./PlayerContext";
export { PlayerEntity } from "./PlayerEntity";
export { ThirdPersonCamera } from "./ThirdPersonCamera";
