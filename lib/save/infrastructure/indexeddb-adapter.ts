/**
 * IndexedDB Adapter
 *
 * Phase 1: Core Infrastructure
 * Local storage implementation using IndexedDB
 */

import type { SlotId } from "../types/save-slot";
import type { SaveData } from "../types/save-data";
import type { SaveSlotMeta } from "../types/save-slot";
import { StorageError } from "../types/errors";

const DB_NAME = "wordrun3d-saves";
const DB_VERSION = 1;
const STORES = {
  SAVES: "saves",
  META: "meta",
  BACKUPS: "backups",
  QUEUE: "sync_queue",
} as const;

/**
 * IndexedDB adapter for local storage
 */
export class IndexedDBAdapter {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database connection
   */
  async initialize(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new StorageError("Failed to open IndexedDB", "read"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Saves store - stores full save data
        if (!db.objectStoreNames.contains(STORES.SAVES)) {
          db.createObjectStore(STORES.SAVES, { keyPath: "slotId" });
        }

        // Meta store - stores slot metadata for quick listing
        if (!db.objectStoreNames.contains(STORES.META)) {
          db.createObjectStore(STORES.META, { keyPath: "slotId" });
        }

        // Backups store - stores backup copies
        if (!db.objectStoreNames.contains(STORES.BACKUPS)) {
          db.createObjectStore(STORES.BACKUPS, { keyPath: "id" });
        }

        // Sync queue store - stores pending sync operations
        if (!db.objectStoreNames.contains(STORES.QUEUE)) {
          db.createObjectStore(STORES.QUEUE, { keyPath: "id" });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get database instance, initializing if needed
   */
  private async getDB(): Promise<IDBDatabase> {
    await this.initialize();
    if (!this.db) {
      throw new StorageError("Database not initialized", "read");
    }
    return this.db;
  }

  /**
   * Store save data
   */
  async put(slotId: SlotId, data: SaveData): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SAVES, "readwrite");
      const store = tx.objectStore(STORES.SAVES);
      const request = store.put({ slotId, ...data });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError(`Failed to write save slot ${slotId}`, "write"));
    });
  }

  /**
   * Get save data
   */
  async get(slotId: SlotId): Promise<SaveData | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SAVES, "readonly");
      const store = tx.objectStore(STORES.SAVES);
      const request = store.get(slotId);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
        } else {
          // Remove slotId from result, return only SaveData
          const { slotId: _, ...saveData } = result;
          resolve(saveData as SaveData);
        }
      };
      request.onerror = () => reject(new StorageError(`Failed to read save slot ${slotId}`, "read"));
    });
  }

  /**
   * Delete save data
   */
  async delete(slotId: SlotId): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.SAVES, STORES.META], "readwrite");
      const saveStore = tx.objectStore(STORES.SAVES);
      const metaStore = tx.objectStore(STORES.META);

      saveStore.delete(slotId);
      metaStore.delete(slotId);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new StorageError(`Failed to delete save slot ${slotId}`, "delete"));
    });
  }

  /**
   * Store metadata
   */
  async putMeta(slotId: SlotId, meta: SaveSlotMeta): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.META, "readwrite");
      const store = tx.objectStore(STORES.META);
      const request = store.put(meta);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError(`Failed to write metadata for slot ${slotId}`, "write"));
    });
  }

  /**
   * Get metadata
   */
  async getMeta(slotId: SlotId): Promise<SaveSlotMeta | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.META, "readonly");
      const store = tx.objectStore(STORES.META);
      const request = store.get(slotId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new StorageError(`Failed to read metadata for slot ${slotId}`, "read"));
    });
  }

  /**
   * Get all metadata
   */
  async getAllMeta(): Promise<SaveSlotMeta[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.META, "readonly");
      const store = tx.objectStore(STORES.META);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new StorageError("Failed to read all metadata", "read"));
    });
  }

  /**
   * Store backup
   */
  async putBackup(backupId: string, data: SaveData, meta: SaveSlotMeta): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.BACKUPS, "readwrite");
      const store = tx.objectStore(STORES.BACKUPS);
      const request = store.put({
        id: backupId,
        data,
        meta,
        createdAt: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError(`Failed to create backup ${backupId}`, "write"));
    });
  }

  /**
   * Get backup
   */
  async getBackup(backupId: string): Promise<{ data: SaveData; meta: SaveSlotMeta } | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.BACKUPS, "readonly");
      const store = tx.objectStore(STORES.BACKUPS);
      const request = store.get(backupId);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
        } else {
          resolve({ data: result.data, meta: result.meta });
        }
      };
      request.onerror = () => reject(new StorageError(`Failed to read backup ${backupId}`, "read"));
    });
  }

  /**
   * List all backup IDs
   */
  async listBackups(): Promise<string[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.BACKUPS, "readonly");
      const store = tx.objectStore(STORES.BACKUPS);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(new StorageError("Failed to list backups", "list"));
    });
  }

  /**
   * Delete old backups, keeping only the most recent ones
   */
  async pruneBackups(keepCount: number): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.BACKUPS, "readwrite");
      const store = tx.objectStore(STORES.BACKUPS);
      const request = store.getAll();

      request.onsuccess = () => {
        const backups = request.result as Array<{ id: string; createdAt: number }>;
        // Sort by creation date descending
        backups.sort((a, b) => b.createdAt - a.createdAt);

        // Delete backups beyond keepCount
        const toDelete = backups.slice(keepCount);
        for (const backup of toDelete) {
          store.delete(backup.id);
        }

        resolve();
      };
      request.onerror = () => reject(new StorageError("Failed to prune backups", "delete"));
    });
  }

  /**
   * Store sync queue
   */
  async putQueueItem(item: QueuedOperation): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUEUE, "readwrite");
      const store = tx.objectStore(STORES.QUEUE);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError("Failed to save queue item", "write"));
    });
  }

  /**
   * Get all queue items
   */
  async getQueue(): Promise<QueuedOperation[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUEUE, "readonly");
      const store = tx.objectStore(STORES.QUEUE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new StorageError("Failed to read queue", "read"));
    });
  }

  /**
   * Remove queue item
   */
  async removeQueueItem(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.QUEUE, "readwrite");
      const store = tx.objectStore(STORES.QUEUE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError("Failed to remove queue item", "delete"));
    });
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(Object.values(STORES), "readwrite");

      for (const storeName of Object.values(STORES)) {
        tx.objectStore(storeName).clear();
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new StorageError("Failed to clear database", "delete"));
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

/**
 * Queued sync operation
 */
interface QueuedOperation {
  id: string;
  type: "save" | "delete";
  slotId: SlotId;
  createdAt: number;
  retryCount: number;
}

/**
 * Singleton instance
 */
let instance: IndexedDBAdapter | null = null;

export function getIndexedDBAdapter(): IndexedDBAdapter {
  if (!instance) {
    instance = new IndexedDBAdapter();
  }
  return instance;
}
