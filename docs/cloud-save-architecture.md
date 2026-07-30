# Cloud Save System - Technical Design Document

**Version:** 1.0
**Date:** 2026-07-30
**Status:** Draft
**Author:** Principal Architect

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Principles](#2-architecture-principles)
3. [Folder Structure](#3-folder-structure)
4. [Type System](#4-type-system)
5. [Service Architecture](#5-service-architecture)
6. [Save Pipeline](#6-save-pipeline)
7. [Load Pipeline](#7-load-pipeline)
8. [Synchronization Flow](#8-synchronization-flow)
9. [Offline Behavior](#9-offline-behavior)
10. [Security Model](#10-security-model)
11. [Error Handling](#11-error-handling)
12. [Extension Points](#12-extension-points)
13. [API Summary](#13-api-summary)

---

## 1. Overview

### 1.1 Purpose

Provide a robust, offline-first cloud save system that:
- Persists player progress across devices
- Handles offline scenarios gracefully
- Resolves conflicts intelligently
- Provides reliable data recovery

### 1.2 Scope

| Feature | Priority | Complexity |
|---------|----------|------------|
| Firebase Auth integration | P0 | Medium |
| Firestore persistence | P0 | High |
| Offline-first architecture | P0 | High |
| Local cache sync | P0 | Medium |
| Conflict resolution | P0 | High |
| Multiple save slots | P1 | Medium |
| Auto-save | P1 | Low |
| Manual save/load | P1 | Low |
| Backup & restore | P2 | Medium |
| Retry mechanism | P0 | Low |
| Save status indicators | P1 | Low |

### 1.3 Technology Stack

| Layer | Technology |
|-------|------------|
| Auth | Firebase Auth |
| Database | Firestore |
| Local Cache | IndexedDB |
| State Management | React Context + Custom Hooks |
| Validation | Zod |
| Error Handling | Custom error classes |

---

## 2. Architecture Principles

### 2.1 Core Principles

1. **Offline-First**: Local changes persist immediately, sync happens in background
2. **Eventual Consistency**: Cloud and local will eventually converge
3. **Conflict-Free**: Last-write-wins with timestamp resolution
4. **Idempotent Operations**: Save/load operations are safe to retry
5. **Fail-Safe**: Errors never lose user data

### 2.2 Design Patterns

| Pattern | Application |
|---------|-------------|
| Repository Pattern | Abstract data access |
| Observer Pattern | Sync state notifications |
| Strategy Pattern | Conflict resolution |
| Unit of Work | Batch save operations |
| Retry Pattern | Transient failure handling |

---

## 3. Folder Structure

```
lib/
├── save/
│   ├── index.ts                    # Public API exports
│   │
│   ├── types/                      # Domain types
│   │   ├── index.ts               # Type exports
│   │   ├── save-slot.ts           # Save slot definitions
│   │   ├── save-data.ts           # Save data schemas
│   │   ├── sync-state.ts          # Synchronization state
│   │   └── errors.ts              # Error types
│   │
│   ├── services/                   # Business logic
│   │   ├── index.ts
│   │   ├── save-service.ts        # Main save orchestration
│   │   ├── load-service.ts        # Main load orchestration
│   │   ├── sync-service.ts        # Cloud sync logic
│   │   ├── conflict-resolver.ts   # Conflict resolution
│   │   ├── validation-service.ts  # Data validation
│   │   └── backup-service.ts      # Backup/restore logic
│   │
│   ├── infrastructure/             # External integrations
│   │   ├── index.ts
│   │   ├── firestore-adapter.ts   # Firestore operations
│   │   ├── indexeddb-adapter.ts   # Local storage
│   │   ├── auth-adapter.ts        # Firebase Auth wrapper
│   │   └── retry-handler.ts       # Retry logic
│   │
│   ├── hooks/                      # React integration
│   │   ├── index.ts
│   │   ├── useSaveManager.ts      # Main save hook
│   │   ├── useCloudSync.ts        # Sync status hook
│   │   └── useSaveSlots.ts        # Slot management hook
│   │
│   ├── components/                 # UI components
│   │   ├── index.ts
│   │   ├── SaveStatusIndicator.tsx
│   │   ├── SyncProgress.tsx
│   │   └── ConflictDialog.tsx
│   │
│   └── utils/                      # Utilities
│       ├── index.ts
│       ├── merge-strategy.ts       # Deep merge utilities
│       └── version-migration.ts    # Schema migration
```

---

## 4. Type System

### 4.1 Core Types

```typescript
// lib/save/types/save-slot.ts

/**
 * Unique identifier for a save slot (1-3)
 */
export type SlotId = 1 | 2 | 3;

/**
 * Slot metadata (stored separately for quick listing)
 */
export interface SaveSlotMeta {
  slotId: SlotId;
  playerName: string;
  level: number;
  totalXP: number;
  achievementsCount: number;
  lastPlayedAt: number;  // Unix timestamp
  playTimeMs: number;
  cloudSyncedAt: number | null;
  localModifiedAt: number;
  version: string;
}

/**
 * Full save slot with data
 */
export interface SaveSlot extends SaveSlotMeta {
  data: SaveData;
}

/**
 * Active slot selection
 */
export interface ActiveSlot {
  slotId: SlotId | null;
  isLoaded: boolean;
  isDirty: boolean;  // Has unsaved changes
}
```

### 4.2 Save Data Types

```typescript
// lib/save/types/save-data.ts

/**
 * Current save data version
 */
export const CURRENT_SAVE_VERSION = "1.0.0";

/**
 * Complete save data structure
 */
export interface SaveData {
  version: string;

  // Player data
  player: PlayerSaveData;

  // Progression data
  progression: ProgressionSaveData;

  // Flashcard data
  flashcards: FlashcardSaveData;

  // Dialogue/NPC data
  dialogues: DialogueSaveData;

  // Game state
  game: GameSaveData;

  // Metadata
  metadata: SaveMetadata;
}

/**
 * Player profile data
 */
export interface PlayerSaveData {
  id: string;
  name: string;
  avatar?: string;
  createdAt: number;
  settings: PlayerSettings;
}

/**
 * Player game settings
 */
export interface PlayerSettings {
  locale: "en" | "vi" | "ja" | "zh";
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  difficulty: "easy" | "medium" | "hard";
  accessibility: AccessibilitySettings;
}

/**
 * Accessibility options
 */
export interface AccessibilitySettings {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  colorBlindMode: "none" | "protanopia" | "deuteranopia" | "tritanopia";
}

/**
 * Progression system data
 */
export interface ProgressionSaveData {
  level: PlayerLevelSave;
  xp: number;
  lifetimeXP: number;
  achievements: Record<string, number>;  // achievementId -> unlockedAt
  cardMastery: Record<string, CardMasterySave>;
  npcMastery: Record<string, NPCMasterySave>;
  stats: GameplayStatsSave;
  daily: DailyStatsSave;
}

/**
 * Simplified level data for saves
 */
export interface PlayerLevelSave {
  currentLevel: number;
  title: string;
}

/**
 * Card mastery for saves (simplified)
 */
export interface CardMasterySave {
  timesReviewed: number;
  timesCorrect: number;
  accuracy: number;
  currentLevel: "new" | "learning" | "reviewing" | "mastered";
  lastReviewed: number;
}

/**
 * NPC mastery for saves
 */
export interface NPCMasterySave {
  interactions: number;
  quizzesCompleted: number;
  perfectQuizzes: number;
  masteryLevel: number;
}

/**
 * Gameplay stats for saves
 */
export interface GameplayStatsSave {
  totalQuizzesTaken: number;
  totalCorrectAnswers: number;
  totalWrongAnswers: number;
  currentStreak: number;
  longestStreak: number;
  highestCombo: number;
  totalTimeSpentMs: number;
}

/**
 * Daily stats for saves
 */
export interface DailyStatsSave {
  date: string;
  quizzesTaken: number;
  correctAnswers: number;
  xpEarned: number;
}

/**
 * Flashcard system data
 */
export interface FlashcardSaveData {
  lastSetId: string | null;
  lastSubSetId: string | null;
  recentSets: string[];
  studyHistory: StudyHistoryEntry[];
}

/**
 * Study history entry
 */
export interface StudyHistoryEntry {
  setId: string;
  subSetId: string;
  completedAt: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpentMs: number;
}

/**
 * Dialogue system data
 */
export interface DialogueSaveData {
  completedDialogues: string[];
  npcStates: Record<string, NPCStateSave>;
}

/**
 * NPC conversation state
 */
export interface NPCStateSave {
  dialogueTreeId: string;
  currentNodeId: string;
  flags: Record<string, boolean>;
  completedAt: number | null;
}

/**
 * Game world state
 */
export interface GameSaveData {
  playerPosition: Position3D;
  playerRotation: number;
  unlockedAreas: string[];
  discoveredSecrets: string[];
  worldTime: number;
}

/**
 * 3D position
 */
export interface Position3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Save metadata
 */
export interface SaveMetadata {
  createdAt: number;
  modifiedAt: number;
  saveDuration: number;  // Time to complete save in ms
  deviceId: string;
  platform: "web" | "mobile" | "desktop";
}
```

### 4.3 Sync State Types

```typescript
// lib/save/types/sync-state.ts

/**
 * Overall sync status
 */
export type SyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "error"
  | "offline"
  | "conflict";

/**
 * Individual sync operation status
 */
export interface SyncOperation {
  id: string;
  type: "upload" | "download" | "delete";
  status: "pending" | "in_progress" | "completed" | "failed";
  progress: number;  // 0-100
  startedAt: number;
  completedAt: number | null;
  error: string | null;
}

/**
 * Synchronization state
 */
export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  pendingOperations: SyncOperation[];
  currentOperation: SyncOperation | null;
  conflict: ConflictInfo | null;
  error: SyncError | null;
}

/**
 * Conflict information
 */
export interface ConflictInfo {
  slotId: SlotId;
  localVersion: SaveData;
  cloudVersion: SaveData;
  localModifiedAt: number;
  cloudModifiedAt: number;
  resolution: ConflictResolution | null;
}

/**
 * Conflict resolution strategy
 */
export type ConflictResolution =
  | "keep_local"
  | "keep_cloud"
  | "merge"
  | "keep_both";

/**
 * Sync error types
 */
export interface SyncError {
  code: SyncErrorCode;
  message: string;
  recoverable: boolean;
  retryAt: number | null;
}

/**
 * Sync error codes
 */
export type SyncErrorCode =
  | "NETWORK_ERROR"
  | "AUTH_EXPIRED"
  | "QUOTA_EXCEEDED"
  | "VERSION_CONFLICT"
  | "DATA_CORRUPTED"
  | "UNKNOWN";
```

### 4.4 Error Types

```typescript
// lib/save/types/errors.ts

/**
 * Base save error
 */
export class SaveError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = "SaveError";
  }
}

/**
 * Validation errors
 */
export class ValidationError extends SaveError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message, "VALIDATION_ERROR", true);
    this.name = "ValidationError";
  }
}

/**
 * Storage errors
 */
export class StorageError extends SaveError {
  constructor(
    message: string,
    public readonly operation: "read" | "write" | "delete"
  ) {
    super(message, "STORAGE_ERROR", true);
    this.name = "StorageError";
  }
}

/**
 * Sync errors
 */
export class SyncError extends SaveError {
  constructor(
    message: string,
    public readonly code: SyncErrorCode,
    recoverable: boolean = true
  ) {
    super(message, "SYNC_ERROR", recoverable);
    this.name = "SyncError";
  }
}

/**
 * Conflict errors
 */
export class ConflictError extends SaveError {
  constructor(
    public readonly conflict: ConflictInfo
  ) {
    super("Save conflict detected", "CONFLICT_ERROR", true);
    this.name = "ConflictError";
  }
}

/**
 * Authentication errors
 */
export class AuthError extends SaveError {
  constructor(message: string) {
    super(message, "AUTH_ERROR", false);
    this.name = "AuthError";
  }
}

/**
 * Result type for operations
 */
export type SaveResult<T> =
  | { success: true; data: T }
  | { success: false; error: SaveError };
```

---

## 5. Service Architecture

### 5.1 Service Responsibilities

```
┌─────────────────────────────────────────────────────────────────┐
│                        SAVE MANAGER                              │
│  (Facade - orchestrates all save operations)                    │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  Save Service │ │  Load Service │ │  Sync Service │
│               │ │               │ │               │
│ - Auto-save   │ │ - Load slot   │ │ - Cloud sync  │
│ - Manual save │ │ - Load latest │ │ - Conflict    │
│ - Batch save  │ │ - Validate    │ │ - Retry       │
│ - Backup      │ │ - Migrate    │ │ - Status      │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  Validation   │ │  Validation   │ │  Conflict     │
│  Service      │ │  Service      │ │  Resolver     │
│               │ │               │ │               │
│ - Schema      │ │ - Schema      │ │ - Timestamp   │
│ - Integrity   │ │ - Integrity   │ │ - Merge       │
│ - Sanitization│ │ - Migration   │ │ - Strategy    │
└───────┬───────┘ └───────┬───────┘ └───────────────┘
        │                 │
        ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  Firestore Adapter  │  IndexedDB Adapter  │  Auth Adapter        │
│  - Document ops     │  - Local storage    │  - Firebase Auth      │
│  - Real-time sync  │  - Cache management │  - Token refresh     │
│  - Batch writes    │  - Expiration      │  - Session mgmt     │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Service Interfaces

```typescript
// lib/save/services/save-service.ts

export interface ISaveService {
  /**
   * Save to local storage (immediate)
   */
  saveLocal(slotId: SlotId, data: SaveData): Promise<void>;

  /**
   * Save to cloud (async)
   */
  saveCloud(slotId: SlotId, data: SaveData): Promise<void>;

  /**
   * Full save (local + cloud)
   */
  save(slotId: SlotId, data: SaveData, options?: SaveOptions): Promise<SaveResult<void>>;

  /**
   * Auto-save current state
   */
  autoSave(): Promise<void>;

  /**
   * Create backup of slot
   */
  backup(slotId: SlotId): Promise<string>;  // Returns backup ID

  /**
   * Get all slot metadata
   */
  getAllSlots(): Promise<SaveSlotMeta[]>;
}

export interface SaveOptions {
  forceCloud?: boolean;
  skipValidation?: boolean;
  backupBefore?: boolean;
}

// lib/save/services/load-service.ts

export interface ILoadService {
  /**
   * Load from local storage
   */
  loadLocal(slotId: SlotId): Promise<SaveData | null>;

  /**
   * Load from cloud
   */
  loadCloud(slotId: SlotId): Promise<SaveData | null>;

  /**
   * Load with sync (local preferred if valid)
   */
  load(slotId: SlotId, options?: LoadOptions): Promise<SaveResult<SaveData>>;

  /**
   * Load latest valid save from any slot
   */
  loadLatest(): Promise<SaveResult<SaveSlot>>;

  /**
   * Restore from backup
   */
  restore(backupId: string): Promise<SaveResult<void>>;
}

export interface LoadOptions {
  preferCloud?: boolean;
  forceRefresh?: boolean;
  allowStale?: boolean;  // Allow local cache even if stale
}

// lib/save/services/sync-service.ts

export interface ISyncService {
  /**
   * Get current sync state
   */
  getState(): SyncState;

  /**
   * Start sync operation
   */
  sync(): Promise<void>;

  /**
   * Sync specific slot
   */
  syncSlot(slotId: SlotId): Promise<void>;

  /**
   * Resolve conflict
   */
  resolveConflict(resolution: ConflictResolution): Promise<void>;

  /**
   * Subscribe to sync state changes
   */
  onStateChange(listener: (state: SyncState) => void): () => void;

  /**
   * Check if online
   */
  isOnline(): boolean;

  /**
   * Force push local changes to cloud
   */
  pushLocal(): Promise<void>;

  /**
   * Force pull cloud changes
   */
  pullCloud(): Promise<void>;
}

// lib/save/services/conflict-resolver.ts

export interface IConflictResolver {
  /**
   * Detect conflict between local and cloud
   */
  detectConflict(
    local: SaveData,
    cloud: SaveData
  ): ConflictInfo | null;

  /**
   * Auto-resolve if possible
   */
  autoResolve(conflict: ConflictInfo): ConflictResolution | null;

  /**
   * Merge two save data versions
   */
  merge(local: SaveData, cloud: SaveData): SaveData;

  /**
   * Apply resolution
   */
  applyResolution(
    conflict: ConflictInfo,
    resolution: ConflictResolution
  ): Promise<SaveData>;
}

// lib/save/services/validation-service.ts

export interface IValidationService {
  /**
   * Validate save data structure
   */
  validate(data: unknown): SaveResult<SaveData>;

  /**
   * Check data integrity
   */
  checkIntegrity(data: SaveData): boolean;

  /**
   * Sanitize data (remove invalid fields)
   */
  sanitize(data: unknown): SaveData;

  /**
   * Check if migration is needed
   */
  needsMigration(data: SaveData): boolean;

  /**
   * Migrate data to current version
   */
  migrate(data: SaveData): SaveResult<SaveData>;
}
```

### 5.3 Infrastructure Interfaces

```typescript
// lib/save/infrastructure/firestore-adapter.ts

export interface IFirestoreAdapter {
  /**
   * Initialize connection
   */
  initialize(): Promise<void>;

  /**
   * Write document
   */
  setDocument(path: string, data: unknown): Promise<void>;

  /**
   * Read document
   */
  getDocument<T>(path: string): Promise<T | null>;

  /**
   * Delete document
   */
  deleteDocument(path: string): Promise<void>;

  /**
   * Batch write
   */
  batchWrite(operations: BatchOperation[]): Promise<void>;

  /**
   * Real-time listener
   */
  onSnapshot<T>(
    path: string,
    callback: (data: T | null) => void
  ): () => void;

  /**
   * Check if online
   */
  isOnline(): boolean;
}

export interface BatchOperation {
  type: "set" | "update" | "delete";
  path: string;
  data?: unknown;
}

// lib/save/infrastructure/indexeddb-adapter.ts

export interface IIndexedDBAdapter {
  /**
   * Initialize database
   */
  initialize(): Promise<void>;

  /**
   * Store save data
   */
  put(slotId: SlotId, data: SaveData): Promise<void>;

  /**
   * Get save data
   */
  get(slotId: SlotId): Promise<SaveData | null>;

  /**
   * Get metadata
   */
  getMeta(slotId: SlotId): Promise<SaveSlotMeta | null>;

  /**
   * Get all metadata
   */
  getAllMeta(): Promise<SaveSlotMeta[]>;

  /**
   * Delete save
   */
  delete(slotId: SlotId): Promise<void>;

  /**
   * Store backup
   */
  putBackup(backupId: string, data: SaveData): Promise<void>;

  /**
   * Get backup
   */
  getBackup(backupId: string): Promise<SaveData | null>;

  /**
   * List backups
   */
  listBackups(): Promise<string[]>;

  /**
   * Delete old backups
   */
  pruneBackups(keepCount: number): Promise<void>;

  /**
   * Clear all data
   */
  clear(): Promise<void>;
}
```

---

## 6. Save Pipeline

### 6.1 Save Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SAVE PIPELINE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐
  │   UI Trigger  │
  │  (auto/user) │
  └──────┬───────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  1. VALIDATION PHASE                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ Schema       │───▶│ Integrity    │───▶│ Sanitization │                   │
│  │ Validation   │    │ Check        │    │ & Transform  │                   │
│  └──────────────┘    └──────────────┘    └──────┬───────┘                   │
│                                                  │                           │
│         ┌───────────────────────────────────────┘                           │
│         │                                                                 │
│         ▼                                                                 │
│  ┌──────────────────────┐                                                  │
│  │   Valid SaveData     │                                                  │
│  └──────────┬───────────┘                                                  │
│             │                                                              │
└─────────────┼──────────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  2. BACKUP PHASE (optional)                                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐                                                          │
│  │ Create Local │                                                          │
│  │ Backup       │                                                          │
│  └──────┬───────┘                                                          │
│         │                                                                  │
└─────────┼──────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  3. LOCAL STORAGE PHASE                                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐                                       │
│  │ Write to     │───▶│ Update       │                                       │
│  │ IndexedDB    │    │ Metadata     │                                       │
│  └──────┬───────┘    └──────┬───────┘                                       │
│         │                   │                                               │
│         └───────────────────┘                                               │
│                             │                                               │
│         ┌───────────────────┘                                               │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────────────┐                                                  │
│  │  Local Save Complete │                                                  │
│  │  (isDirty = false)   │                                                  │
│  └──────────┬───────────┘                                                  │
│             │                                                              │
└─────────────┼──────────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  4. CLOUD SYNC PHASE                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐                                                          │
│  │ Check Auth   │─────────── Not Authenticated ──────▶ Queue for later      │
│  └──────┬───────┘                                                          │
│         │ Authenticated                                                     │
│         ▼                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ Check Cloud  │───▶│ Conflict     │───▶│ Write to      │                  │
│  │ Version      │    │ Detection    │    │ Firestore     │                  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                   │                          │
│         ▼                   ▼                   ▼                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ No Conflict  │    │ Conflict?    │    │ Update       │                  │
│  │ → Proceed    │    │ → Resolve   │    │ Timestamp    │                  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                   │                          │
│         └───────────────────┴───────────────────┘                          │
│                             │                                              │
│                             ▼                                              │
│                  ┌──────────────────────┐                                 │
│                  │  Cloud Save Complete │                                 │
│                  └──────────────────────┘                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  5. NOTIFICATION PHASE                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                 │
│  │ Update UI    │───▶│ Emit Events  │───▶│ Show Toast   │                 │
│  │ State        │    │ (onSave)     │    │ (if needed)  │                 │
│  └──────────────┘    └──────────────┘    └──────────────┘                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Save Code Flow

```typescript
// lib/save/services/save-service.ts

async function save(
  slotId: SlotId,
  data: SaveData,
  options: SaveOptions = {}
): Promise<SaveResult<void>> {
  const startTime = Date.now();

  try {
    // 1. Validate
    const validationResult = validationService.validate(data);
    if (!validationResult.success) {
      return validationResult;
    }
    const validData = validationResult.data;

    // 2. Backup if requested
    if (options.backupBefore) {
      await createBackup(slotId);
    }

    // 3. Update metadata
    const meta = createMetadata(validData, startTime);

    // 4. Write to IndexedDB
    await indexedDB.put(slotId, validData);
    await indexedDB.putMeta(slotId, meta);

    // 5. Queue cloud sync
    if (!options.forceCloud) {
      syncService.queueOperation({
        type: "upload",
        slotId,
        data: validData,
      });
    }

    // 6. Cloud sync if requested
    if (options.forceCloud || isOnline()) {
      await syncService.syncSlot(slotId);
    }

    // 7. Emit success
    eventBus.emit("save:complete", { slotId, duration: Date.now() - startTime });

    return { success: true, data: undefined };

  } catch (error) {
    // Rollback handled by backup
    return {
      success: false,
      error: handleSaveError(error)
    };
  }
}
```

---

## 7. Load Pipeline

### 7.1 Load Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LOAD PIPELINE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐
  │   UI Request  │
  │  (slot/auto) │
  └──────┬───────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  1. SOURCE DETERMINATION                                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐                                       │
│  │ Check        │───▶│ Check        │                                       │
│  │ User Pref    │    │ Online Status│                                       │
│  └──────┬───────┘    └──────┬───────┘                                       │
│         │                   │                                               │
│         ▼                   ▼                                               │
│  ┌─────────────────────────────────────────┐                               │
│  │         Load Strategy                    │                               │
│  ├─────────────────────────────────────────┤                               │
│  │  preferCloud=true  → Try cloud first    │                               │
│  │  preferCloud=false → Try local first    │                               │
│  │  isOffline         → Use local only    │                               │
│  │  forceRefresh      → Fetch cloud only  │                               │
│  └─────────────────────┬───────────────────┘                               │
│                        │                                                    │
└────────────────────────┼────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   LOAD LOCAL    │ │   LOAD CLOUD     │ │   LOAD LATEST   │
│                 │ │                 │ │                 │
│ 1. Read IndexedDB│ │ 1. Check Auth   │ │ 1. Get all     │
│ 2. Validate     │ │ 2. Read         │ │    metadata    │
│ 3. Migrate     │ │    Firestore    │ │ 2. Sort by     │
│ 4. Return      │ │ 3. Validate     │ │    lastPlayed  │
│                 │ │ 4. Merge if     │ │ 3. Load        │
│                 │ │    needed       │ │    valid slot  │
│                 │ │ 5. Cache local  │ │                 │
│                 │ │ 6. Return       │ │                 │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┴───────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  2. VALIDATION & MIGRATION                                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ Schema       │───▶│ Version      │───▶│ Integrity    │                   │
│  │ Validation   │    │ Migration    │    │ Check        │                   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                   │
│         │                   │                   │                           │
│         └───────────────────┴───────────────────┘                           │
│                             │                                              │
│         ┌───────────────────┘                                              │
│         │                                                                     │
│         ▼                                                                     │
│  ┌──────────────────────┐                                                  │
│  │   Valid SaveData      │                                                  │
│  └──────────┬───────────┘                                                  │
│             │                                                              │
└─────────────┼──────────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  3. STATE UPDATE                                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ Update       │───▶│ Emit Events  │───▶│ Update UI    │                   │
│  │ Game State   │    │ (onLoad)     │    │              │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Load Code Flow

```typescript
// lib/save/services/load-service.ts

async function load(
  slotId: SlotId,
  options: LoadOptions = {}
): Promise<SaveResult<SaveData>> {
  try {
    let data: SaveData | null = null;
    let source: "local" | "cloud" | null = null;

    // Source determination
    if (options.forceRefresh) {
      // Force cloud refresh
      data = await loadCloud(slotId);
      source = data ? "cloud" : null;
    } else if (options.preferCloud && isOnline()) {
      // Try cloud first
      const cloudData = await loadCloud(slotId);
      if (cloudData) {
        // Cache locally
        await indexedDB.put(slotId, cloudData);
        data = cloudData;
        source = "cloud";
      }
    }

    // Fallback to local
    if (!data) {
      data = await loadLocal(slotId);
      source = data ? "local" : null;
    }

    // If still no data and not forcing refresh, try cloud
    if (!data && !options.forceRefresh && isOnline()) {
      data = await loadCloud(slotId);
      source = data ? "cloud" : null;
    }

    if (!data) {
      return {
        success: false,
        error: new SaveError(`No save found in slot ${slotId}`, "NOT_FOUND", true)
      };
    }

    // Migration if needed
    if (validationService.needsMigration(data)) {
      const migrateResult = validationService.migrate(data);
      if (!migrateResult.success) {
        return migrateResult;
      }
      data = migrateResult.data;
    }

    // Emit load event
    eventBus.emit("load:complete", { slotId, source, data });

    return { success: true, data };

  } catch (error) {
    return {
      success: false,
      error: handleLoadError(error)
    };
  }
}
```

---

## 8. Synchronization Flow

### 8.1 Sync State Machine

```
                    ┌─────────────┐
                    │    IDLE     │
                    │ (synced)    │
                    └──────┬──────┘
                           │ start sync
                           ▼
                    ┌─────────────┐
           ┌───────▶│   SYNCING   │◀──────┐
           │        └──────┬──────┘        │
           │               │               │
    ┌──────┴─────┐   ┌─────┴─────┐   ┌────┴────┐
    │   ERROR    │   │  SUCCESS  │   │CONFLICT │
    │ (recoverable)   │           │   │         │
    └──────┬─────┘   └───────────┘   └────┬────┘
           │                              │
           │ retry                        │ resolve
           └──────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    IDLE    │
                    └─────────────┘
```

### 8.2 Sync Implementation

```typescript
// lib/save/services/sync-service.ts

class SyncService implements ISyncService {
  private state: SyncState = createInitialState();
  private listeners: Set<(state: SyncState) => void> = new Set();

  async sync(): Promise<void> {
    if (!this.isOnline()) {
      this.setState({ status: "offline" });
      return;
    }

    this.setState({ status: "syncing" });

    try {
      // Get all local slots
      const localSlots = await indexedDB.getAllMeta();

      for (const slot of localSlots) {
        const cloudMeta = await firestore.getDocument<SaveSlotMeta>(
          `saves/${auth.uid}/slots/${slot.slotId}`
        );

        if (!cloudMeta) {
          // No cloud version - upload local
          await this.uploadSlot(slot.slotId);
        } else if (slot.localModifiedAt > cloudMeta.cloudSyncedAt) {
          // Local is newer - upload local
          await this.uploadSlot(slot.slotId);
        } else if (slot.localModifiedAt < cloudMeta.cloudSyncedAt) {
          // Cloud is newer - download cloud
          await this.downloadSlot(slot.slotId);
        } else {
          // Timestamps match - already synced
        }
      }

      this.setState({
        status: "synced",
        lastSyncedAt: Date.now(),
        error: null
      });

    } catch (error) {
      if (isConflictError(error)) {
        this.setState({
          status: "conflict",
          conflict: error.conflict
        });
      } else {
        this.setState({
          status: "error",
          error: handleSyncError(error)
        });
      }
    }
  }

  private async uploadSlot(slotId: SlotId): Promise<void> {
    const data = await indexedDB.get(slotId);
    if (!data) return;

    const meta = await indexedDB.getMeta(slotId);

    await firestore.setDocument(
      `saves/${auth.uid}/slots/${slotId}`,
      { data, meta }
    );

    // Update local metadata
    meta.cloudSyncedAt = Date.now();
    await indexedDB.putMeta(slotId, meta);
  }

  private async downloadSlot(slotId: SlotId): Promise<void> {
    const cloudData = await firestore.getDocument<SaveData>(
      `saves/${auth.uid}/slots/${slotId}/data`
    );

    if (cloudData) {
      const cloudMeta = await firestore.getDocument<SaveSlotMeta>(
        `saves/${auth.uid}/slots/${slotId}/meta`
      );

      // Store locally
      await indexedDB.put(slotId, cloudData);
      if (cloudMeta) {
        await indexedDB.putMeta(slotId, {
          ...cloudMeta,
          localModifiedAt: cloudMeta.lastPlayedAt
        });
      }
    }
  }
}
```

---

## 9. Offline Behavior

### 9.1 Offline Strategy

| Scenario | Behavior |
|----------|----------|
| Save while offline | Write to IndexedDB immediately, queue for sync |
| Load while offline | Read from IndexedDB only |
| App starts offline | Load from IndexedDB, mark as stale |
| App comes online | Auto-sync queued operations |
| Conflict while offline | Queue for manual resolution later |

### 9.2 Queue Management

```typescript
// lib/save/services/sync-service.ts

interface QueuedOperation {
  id: string;
  type: "save" | "delete";
  slotId: SlotId;
  data?: SaveData;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
}

class SyncService {
  private operationQueue: QueuedOperation[] = [];

  async queueOperation(op: Omit<QueuedOperation, "id" | "createdAt" | "retryCount">): Promise<void> {
    const operation: QueuedOperation = {
      ...op,
      id: generateId(),
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3
    };

    this.operationQueue.push(operation);
    await this.persistQueue();

    // If online, process immediately
    if (this.isOnline()) {
      this.processQueue();
    }
  }

  async processQueue(): Promise<void> {
    if (!this.isOnline()) return;

    const failedOps: QueuedOperation[] = [];

    for (const op of this.operationQueue) {
      try {
        await this.executeOperation(op);
      } catch (error) {
        op.retryCount++;
        if (op.retryCount < op.maxRetries) {
          failedOps.push(op);
        } else {
          // Max retries reached - notify user
          eventBus.emit("sync:operation_failed", op);
        }
      }
    }

    this.operationQueue = failedOps;
    await this.persistQueue();
  }

  private async persistQueue(): Promise<void> {
    // Store queue in IndexedDB for persistence
    await indexedDB.put("sync_queue", this.operationQueue);
  }
}
```

---

## 10. Security Model

### 10.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐
  │  App Start   │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐    ┌──────────────┐
  │ Check Auth   │───▶│ Valid Token  │──▶ Load saves
  │ State        │    └──────────────┘
  └──────┬───────┘
         │ No token / Expired
         ▼
  ┌──────────────┐
  │ Show Auth    │
  │ Prompt       │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐    ┌──────────────┐
  │ Sign In/Up   │───▶│ Get ID Token │
  └──────────────┘    └──────┬───────┘
                             │
                             ▼
                      ┌──────────────┐
                      │ Store Token  │
                      │ (in memory)  │
                      └──────────────┘
```

### 10.2 Security Rules

```javascript
// firestore.rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User can only access their own saves
    match /saves/{userId}/{document=**} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId
                   && isValidSaveData(request.resource.data);
    }

    // Helper functions
    function isValidSaveData(data) {
      return data.version is string
             && data.player is map
             && data.player.id is string
             && data.metadata is map;
    }
  }
}
```

### 10.3 Data Validation

```typescript
// Zod schemas for validation

import { z } from "zod";

export const playerSettingsSchema = z.object({
  locale: z.enum(["en", "vi", "ja", "zh"]),
  soundEnabled: z.boolean(),
  musicVolume: z.number().min(0).max(1),
  sfxVolume: z.number().min(0).max(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  accessibility: z.object({
    reduceMotion: z.boolean(),
    highContrast: z.boolean(),
    largeText: z.boolean(),
    colorBlindMode: z.enum(["none", "protanopia", "deuteranopia", "tritanopia"])
  })
});

export const saveDataSchema = z.object({
  version: z.string(),
  player: z.object({
    id: z.string(),
    name: z.string().min(1).max(50),
    avatar: z.string().optional(),
    createdAt: z.number(),
    settings: playerSettingsSchema
  }),
  progression: z.object({
    level: z.object({
      currentLevel: z.number().min(1),
      title: z.string()
    }),
    xp: z.number().min(0),
    lifetimeXP: z.number().min(0),
    achievements: z.record(z.string(), z.number()),
    cardMastery: z.record(z.string(), z.object({
      timesReviewed: z.number(),
      timesCorrect: z.number(),
      accuracy: z.number().min(0).max(100),
      currentLevel: z.enum(["new", "learning", "reviewing", "mastered"]),
      lastReviewed: z.number()
    })),
    npcMastery: z.record(z.string(), z.object({
      interactions: z.number(),
      quizzesCompleted: z.number(),
      perfectQuizzes: z.number(),
      masteryLevel: z.number().min(1).max(5)
    })),
    stats: z.object({
      totalQuizzesTaken: z.number().min(0),
      totalCorrectAnswers: z.number().min(0),
      totalWrongAnswers: z.number().min(0),
      currentStreak: z.number().min(0),
      longestStreak: z.number().min(0),
      highestCombo: z.number().min(0),
      totalTimeSpentMs: z.number().min(0)
    }),
    daily: z.object({
      date: z.string(),
      quizzesTaken: z.number().min(0),
      correctAnswers: z.number().min(0),
      xpEarned: z.number().min(0)
    })
  }),
  flashcards: z.object({
    lastSetId: z.string().nullable(),
    lastSubSetId: z.string().nullable(),
    recentSets: z.array(z.string()),
    studyHistory: z.array(z.object({
      setId: z.string(),
      subSetId: z.string(),
      completedAt: z.number(),
      correctAnswers: z.number(),
      totalQuestions: z.number(),
      timeSpentMs: z.number()
    }))
  }),
  dialogues: z.object({
    completedDialogues: z.array(z.string()),
    npcStates: z.record(z.string(), z.object({
      dialogueTreeId: z.string(),
      currentNodeId: z.string(),
      flags: z.record(z.string(), z.boolean()),
      completedAt: z.number().nullable()
    }))
  }),
  game: z.object({
    playerPosition: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number()
    }),
    playerRotation: z.number(),
    unlockedAreas: z.array(z.string()),
    discoveredSecrets: z.array(z.string()),
    worldTime: z.number().min(0)
  }),
  metadata: z.object({
    createdAt: z.number(),
    modifiedAt: z.number(),
    saveDuration: z.number().min(0),
    deviceId: z.string(),
    platform: z.enum(["web", "mobile", "desktop"])
  })
});
```

---

## 11. Error Handling

### 11.1 Error Recovery Strategies

| Error Type | Recovery Strategy |
|------------|-------------------|
| Network Error | Retry with exponential backoff |
| Auth Expired | Refresh token, retry operation |
| Quota Exceeded | Notify user, suggest cleanup |
| Data Corrupted | Restore from backup |
| Version Conflict | Trigger conflict resolution UI |

### 11.2 Retry Configuration

```typescript
// lib/save/infrastructure/retry-handler.ts

interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitterFactor: 0.1
};

async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry non-recoverable errors
      if (!isRecoverableError(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const baseDelay = Math.min(
        finalConfig.initialDelayMs * Math.pow(finalConfig.backoffMultiplier, attempt),
        finalConfig.maxDelayMs
      );
      const jitter = baseDelay * finalConfig.jitterFactor * Math.random();
      const delay = baseDelay + jitter;

      // Wait before retry
      await sleep(delay);
    }
  }

  throw lastError;
}

function isRecoverableError(error: Error): boolean {
  const recoverableCodes = [
    "NETWORK_ERROR",
    "AUTH_EXPIRED",
    "TIMEOUT"
  ];

  return recoverableCodes.includes((error as SaveError).code);
}
```

---

## 12. Extension Points

### 12.1 Future Multiplayer Support

```typescript
// Extension: Cloud Save for Multiplayer

/**
 * Shared game state for multiplayer
 * Stored separately from personal saves
 */
interface MultiplayerSaveData {
  sessionId: string;
  gameMode: "co-op" | "vs" | "race";
  participants: ParticipantData[];
  sharedWorldState: SharedWorldState;
  chatMessages: ChatMessage[];
  matchResult: MatchResult | null;
}

interface SharedWorldState {
  activePlayers: string[];
  worldEvents: WorldEvent[];
  sharedResources: Record<string, number>;
}

/**
 * Leaderboard entry
 */
interface LeaderboardEntry {
  odName: string;
  playerId: string;
  score: number;
  level: number;
  achievedAt: number;
}

/**
 * Friends list for social features
 */
interface FriendsList {
  odFriendIds: string[];
  blockedUserIds: string[];
  pendingRequests: string[];
}
```

### 12.2 Achievement Sharing

```typescript
/**
 * Shareable achievement
 */
interface ShareableAchievement {
  achievementId: string;
  playerName: string;
  unlockedAt: number;
  screenshot?: string;  // Base64
  shareToken: string;   // For verification
}
```

---

## 13. API Summary

### 13.1 Public API

```typescript
// lib/save/index.ts

/**
 * Main hook for save management
 */
export function useSaveManager(): UseSaveManagerReturn;

/**
 * Sync status hook
 */
export function useCloudSync(): UseCloudSyncReturn;

/**
 * Save slots hook
 */
export function useSaveSlots(): UseSaveSlotsReturn;

/**
 * Components
 */
export { SaveStatusIndicator } from "./components/SaveStatusIndicator";
export { SyncProgress } from "./components/SyncProgress";
export { ConflictDialog } from "./components/ConflictDialog";

/**
 * Types
 */
export type { SlotId, SaveSlot, SaveSlotMeta, SaveData } from "./types";
export type { SyncStatus, SyncState, ConflictInfo } from "./types";
export type { SaveError, ValidationError, StorageError, SyncError } from "./types";
export type { SaveResult } from "./types";
```

### 13.2 Hook Return Types

```typescript
// lib/save/hooks/useSaveManager.ts

export interface UseSaveManagerReturn {
  // State
  activeSlotId: SlotId | null;
  isLoading: boolean;
  isSaving: boolean;
  error: SaveError | null;

  // Operations
  save: (data: SaveData) => Promise<SaveResult<void>>;
  load: (slotId: SlotId) => Promise<SaveResult<SaveData>>;
  loadLatest: () => Promise<SaveResult<SaveSlot>>;
  autoSave: () => Promise<void>;
  backup: (slotId: SlotId) => Promise<string>;
  restore: (backupId: string) => Promise<SaveResult<void>>;
  delete: (slotId: SlotId) => Promise<SaveResult<void>>;
}

// lib/save/hooks/useCloudSync.ts

export interface UseCloudSyncReturn {
  // State
  status: SyncStatus;
  lastSyncedAt: number | null;
  pendingChanges: number;
  conflict: ConflictInfo | null;
  error: SyncError | null;
  isOnline: boolean;

  // Operations
  sync: () => Promise<void>;
  resolveConflict: (resolution: ConflictResolution) => Promise<void>;
  forcePush: () => Promise<void>;
  forcePull: () => Promise<void>;
}

// lib/save/hooks/useSaveSlots.ts

export interface UseSaveSlotsReturn {
  // State
  slots: SaveSlotMeta[];
  isLoading: boolean;

  // Operations
  createSlot: (name: string) => Promise<SaveResult<SlotId>>;
  deleteSlot: (slotId: SlotId) => Promise<SaveResult<void>>;
  renameSlot: (slotId: SlotId, name: string) => Promise<SaveResult<void>>;
  duplicateSlot: (sourceSlotId: SlotId, targetSlotId: SlotId) => Promise<SaveResult<void>>;
}
```

---

## 14. Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Folder structure setup
- [ ] Type definitions
- [ ] IndexedDB adapter
- [ ] Validation service

### Phase 2: Save/Load
- [ ] Save service implementation
- [ ] Load service implementation
- [ ] Migration utilities
- [ ] React hooks

### Phase 3: Cloud Sync
- [ ] Firebase Auth integration
- [ ] Firestore adapter
- [ ] Sync service
- [ ] Conflict resolver

### Phase 4: UI Components
- [ ] SaveStatusIndicator
- [ ] SyncProgress
- [ ] ConflictDialog

### Phase 5: Polish
- [ ] Error handling
- [ ] Retry mechanisms
- [ ] Loading states
- [ ] Testing

---

*End of Technical Design Document*
