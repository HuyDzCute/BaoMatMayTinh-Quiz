/**
 * WorldScene - Main Export
 * Phase 1 Refactor
 * 
 * Modular architecture for Unity migration compatibility
 */
"use client";

import { Floor } from "./environment/Floor";
import { Wall, EndWall } from "./environment/Walls";
import { Ceiling } from "./environment/Ceiling";
import { LockerRow, ColoredLocker } from "./environment/Lockers";
import { ClassroomDoor, DoorsRow } from "./environment/Doors";
import { Window, Windows } from "./environment/Windows";
import { CeilingLight, CeilingLights } from "./lighting/CeilingLights";
import { Lights } from "./lighting/Lights";
import { WallClock, BulletinBoard, Poster, WallDecorations } from "./decorations/WallDecorations";
import { ExitSign, ExitSigns, FireExtinguisher, FireExtinguishers } from "./decorations/SafetySigns";
import { RoomSign, DirectionalSign, VocabPoster, AnnouncementBoard, SafetySign, HangingSign, SignsAndNotices } from "./decorations/SignsAndNotices";
import { Flowers, FlowerPatches } from "./decorations/Flowers";
import { StudentDesk, StudentChair, TeacherDesk, Whiteboard, Projector, Bookshelf, TrashBin, ClassroomFurniture } from "./furniture/ClassroomFurniture";
import { Bench, WaterCooler, VendingMachine, PottedPlant, CeilingVent, ACUnit, FloorMat, FloorArrow, CleaningSign, EnvironmentProps } from "./props/EnvironmentProps";
import { SkyDome, Cloud, Sun, DistantBuilding, DistantTree, DistantHill, Skybox } from "./skybox/Skybox";
import { OutdoorScenery } from "./skybox/OutdoorScenery";
import { DustParticles } from "./effects/Particles";
import { ContactShadow, WallAODarkening, CeilingAO, AmbientOcclusion } from "./effects/AmbientOcclusion";

/**
 * Main World Scene
 * Assembles all environment components
 */
export function WorldScene() {
  return (
    <group>
      {/* Skybox */}
      <Skybox />
      
      {/* Lighting */}
      <Lights />
      
      {/* Outdoor Scenery (visible through windows) */}
      <OutdoorScenery />
      
      {/* Core Structure */}
      <Floor />
      <Wall side="left" />
      <Wall side="right" />
      <Ceiling />
      
      {/* Lighting Fixtures */}
      <CeilingLights />
      
      {/* Lockers */}
      <LockerRow side="left" />
      <LockerRow side="right" />
      
      {/* Doors */}
      <DoorsRow />
      
      {/* End Walls */}
      <EndWall side="left" />
      <EndWall side="right" />
      
      {/* Windows */}
      <Windows />
      
      {/* Decorations */}
      <WallDecorations />
      <ExitSigns />
      <FireExtinguishers />
      <SignsAndNotices />
      <FlowerPatches />
      
      {/* Furniture */}
      <ClassroomFurniture />
      
      {/* Props */}
      <EnvironmentProps />
      
      {/* Effects */}
      <AmbientOcclusion />
      <DustParticles />
    </group>
  );
}

// Re-export constants and types for external use
export { WORLD, NPC_POSITIONS, WORLD_HALF, WORLD_MAX_Z, COLORS } from "@/lib/world-constants";
