"use client";

/**
 * NPC Context
 *
 * Gameplay Phase 2: NPC Foundation
 * React context for NPC state management
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
import type {
  NPCConfig,
  NPCSerializedState,
  NPCInteractionEvent,
  Vector3D,
  INPCManager,
} from "../types";
import { getNPCManager } from "../controller";
import { NPC_REGISTRY } from "../data";

/**
 * NPC context value
 */
interface NPCContextValue {
  // Manager
  npcManager: INPCManager;

  // State
  nearbyNPCs: string[];
  selectedNPC: string | null;

  // Controls
  update: (deltaTime: number, playerPosition?: Vector3D) => void;
  spawnAll: () => void;
  despawnAll: () => void;
  resetAll: () => void;

  // NPC actions
  interact: (npcId: string) => void;
  endInteraction: (npcId: string) => void;

  // Serialization
  serialize: () => NPCSerializedState[];
  deserialize: (states: NPCSerializedState[]) => void;

  // Registry
  registerConfig: (config: NPCConfig) => void;
  getNPCs: () => string[];
}

/**
 * NPC context
 */
export const NPCContext = createContext<NPCContextValue | null>(null);

/**
 * Provider props
 */
interface NPCProviderProps {
  children: ReactNode;
  /** Auto-spawn NPCs on mount */
  autoSpawn?: boolean;
  /** Initial configs to register */
  configs?: NPCConfig[];
}

/**
 * NPC provider component
 */
export function NPCProvider({
  children,
  autoSpawn = true,
  configs = [],
}: NPCProviderProps) {
  // State
  const [nearbyNPCs, setNearbyNPCs] = useState<string[]>([]);
  const [selectedNPC, setSelectedNPC] = useState<string | null>(null);

  // Get NPC manager
  const npcManager = useMemo(() => getNPCManager(), []);

  // Ref to track selectedNPC for event handler
  const selectedNPCRef = useRef<string | null>(null);
  useEffect(() => {
    selectedNPCRef.current = selectedNPC;
  }, [selectedNPC]);

  // Handle NPC events (defined before useEffect to avoid access-before-declaration)
  const handleNPCEvent = useCallback(
    (event: NPCInteractionEvent) => {
      switch (event.type) {
        case "proximity_enter":
          setNearbyNPCs((prev) => {
            if (!prev.includes(event.npcId)) {
              return [...prev, event.npcId];
            }
            return prev;
          });
          break;

        case "proximity_exit":
          setNearbyNPCs((prev) => prev.filter((id) => id !== event.npcId));
          if (selectedNPCRef.current === event.npcId) {
            setSelectedNPC(null);
          }
          break;

        case "interact_start":
          setSelectedNPC(event.npcId);
          break;

        case "interact_end":
          if (selectedNPCRef.current === event.npcId) {
            setSelectedNPC(null);
          }
          break;
      }
    },
    []
  );

  // Initialize NPCs
  useEffect(() => {
    // Register default NPCs from registry
    Object.values(NPC_REGISTRY).forEach((config) => {
      if (!npcManager.has(config.id)) {
        npcManager.register(config);
      }
    });

    // Register custom configs
    configs.forEach((config) => {
      if (!npcManager.has(config.id)) {
        npcManager.register(config);
      }
    });

    // Spawn all NPCs if autoSpawn is enabled
    if (autoSpawn) {
      npcManager.spawnAll();
    }

    // Subscribe to NPC events
    const unsubscribe = npcManager.subscribe(handleNPCEvent);

    return () => {
      unsubscribe();
      if (autoSpawn) {
        npcManager.despawnAll();
      }
    };
  }, [autoSpawn, configs, npcManager, handleNPCEvent]);

  /**
   * Update all NPCs
   */
  const update = useCallback(
    (deltaTime: number, playerPosition?: Vector3D) => {
      npcManager.update(deltaTime, playerPosition);
    },
    [npcManager]
  );

  /**
   * Spawn all NPCs
   */
  const spawnAll = useCallback(() => {
    npcManager.spawnAll();
  }, [npcManager]);

  /**
   * Despawn all NPCs
   */
  const despawnAll = useCallback(() => {
    npcManager.despawnAll();
  }, [npcManager]);

  /**
   * Reset all NPCs
   */
  const resetAll = useCallback(() => {
    npcManager.resetAll();
    setNearbyNPCs([]);
    setSelectedNPC(null);
  }, [npcManager]);

  /**
   * Trigger interaction with NPC
   */
  const interact = useCallback(
    (npcId: string) => {
      const npc = npcManager.get(npcId);
      if (npc && npc.canInteract()) {
        npc.interact();
      }
    },
    [npcManager]
  );

  /**
   * End interaction with NPC
   */
  const endInteraction = useCallback(
    (npcId: string) => {
      const npc = npcManager.get(npcId);
      if (npc) {
        npc.endInteraction();
      }
    },
    [npcManager]
  );

  /**
   * Serialize NPC states for saving
   */
  const serialize = useCallback(() => {
    return npcManager.serialize();
  }, [npcManager]);

  /**
   * Deserialize and restore NPC states
   */
  const deserialize = useCallback(
    (states: NPCSerializedState[]) => {
      npcManager.deserialize(states);
    },
    [npcManager]
  );

  /**
   * Register custom NPC config
   */
  const registerConfig = useCallback(
    (config: NPCConfig) => {
      if (!npcManager.has(config.id)) {
        npcManager.register(config);
      }
    },
    [npcManager]
  );

  /**
   * Get all NPC IDs
   */
  const getNPCs = useCallback(() => {
    return npcManager.getAll().map((npc) => npc.id);
  }, [npcManager]);

  const value: NPCContextValue = {
    npcManager,
    nearbyNPCs,
    selectedNPC,
    update,
    spawnAll,
    despawnAll,
    resetAll,
    interact,
    endInteraction,
    serialize,
    deserialize,
    registerConfig,
    getNPCs,
  };

  return <NPCContext.Provider value={value}>{children}</NPCContext.Provider>;
}

/**
 * Use NPC context
 */
export function useNPCContext(): NPCContextValue {
  const context = useContext(NPCContext);
  if (!context) {
    throw new Error("useNPCContext must be used within NPCProvider");
  }
  return context;
}

/**
 * Hook to get nearby NPCs
 */
export function useNearbyNPCs(): string[] {
  const { nearbyNPCs } = useNPCContext();
  return nearbyNPCs;
}

/**
 * Hook to get selected NPC
 */
export function useSelectedNPC(): string | null {
  const { selectedNPC } = useNPCContext();
  return selectedNPC;
}

/**
 * Hook to get specific NPC controller
 */
export function useNPC(npcId: string) {
  const { npcManager } = useNPCContext();
  return npcManager.get(npcId);
}

/**
 * Hook to trigger NPC interaction
 */
export function useNPCInteraction() {
  const { interact, endInteraction } = useNPCContext();
  return { interact, endInteraction };
}
