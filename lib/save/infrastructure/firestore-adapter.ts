/**
 * Firestore Adapter
 *
 * Phase 3: Cloud Sync
 * Firestore operations wrapper
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  enableIndexedDbPersistence,
  disableNetwork,
  enableNetwork,
  writeBatch,
  type DocumentReference,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import { StorageError, SaveSyncError } from "../types/errors";
import type { SlotId, SaveSlotMeta } from "../types/save-slot";
import type { SaveData } from "../types/save-data";
import type { SyncErrorCode } from "../types/errors";

/**
 * Firestore document structure
 */
interface SaveDocument {
  data: SaveData;
  meta: SaveSlotMeta;
  updatedAt: number;
  createdAt: number;
}

/**
 * Firestore adapter interface
 */
export interface IFirestoreAdapter {
  initialize(): Promise<void>;
  isOnline(): boolean;
  saveSlot(userId: string, slotId: SlotId, data: SaveData, meta: SaveSlotMeta): Promise<void>;
  loadSlot(userId: string, slotId: SlotId): Promise<{ data: SaveData; meta: SaveSlotMeta } | null>;
  deleteSlot(userId: string, slotId: SlotId): Promise<void>;
  loadAllSlots(userId: string): Promise<Array<{ slotId: SlotId; data: SaveData; meta: SaveSlotMeta }>>;
  subscribeToSlot(
    userId: string,
    slotId: SlotId,
    callback: (data: SaveData | null) => void
  ): () => void;
  enableOfflinePersistence(): Promise<void>;
  setNetworkEnabled(enabled: boolean): Promise<void>;
}

/**
 * Firebase Firestore adapter implementation
 */
export class FirestoreAdapter implements IFirestoreAdapter {
  private firestore = null as ReturnType<typeof import("firebase/firestore").getFirestore> | null;
  private online = true;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the adapter
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      const { getFirestore: getFirestoreFn } = await import("firebase/firestore");
      const { getFirebaseServices } = await import("./firebase-config");

      const services = getFirebaseServices();
      if (!services) {
        throw new StorageError("Firebase not initialized", "read");
      }

      this.firestore = getFirestoreFn(services.app);
    } catch (error) {
      throw new StorageError(
        error instanceof Error ? error.message : "Failed to initialize Firestore",
        "read"
      );
    }
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return this.online;
  }

  /**
   * Save slot to cloud
   */
  async saveSlot(
    userId: string,
    slotId: SlotId,
    data: SaveData,
    meta: SaveSlotMeta
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      const now = Date.now();
      const saveDoc: SaveDocument = {
        data,
        meta,
        updatedAt: now,
        createdAt: meta.localModifiedAt || now,
      };

      const docRef = this.getSaveDocumentRef(userId, slotId);
      await setDoc(docRef, saveDoc);
    } catch (error: unknown) {
      throw this.handleFirestoreError(error, "write");
    }
  }

  /**
   * Load slot from cloud
   */
  async loadSlot(
    userId: string,
    slotId: SlotId
  ): Promise<{ data: SaveData; meta: SaveSlotMeta } | null> {
    await this.ensureInitialized();

    try {
      const docRef = this.getSaveDocumentRef(userId, slotId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const saveDoc = docSnap.data() as SaveDocument;
      return {
        data: saveDoc.data,
        meta: saveDoc.meta,
      };
    } catch (error: unknown) {
      throw this.handleFirestoreError(error, "read");
    }
  }

  /**
   * Delete slot from cloud
   */
  async deleteSlot(userId: string, slotId: SlotId): Promise<void> {
    await this.ensureInitialized();

    try {
      const docRef = this.getSaveDocumentRef(userId, slotId);
      await deleteDoc(docRef);
    } catch (error: unknown) {
      throw this.handleFirestoreError(error, "delete");
    }
  }

  /**
   * Load all slots for a user
   */
  async loadAllSlots(
    userId: string
  ): Promise<Array<{ slotId: SlotId; data: SaveData; meta: SaveSlotMeta }>> {
    await this.ensureInitialized();

    try {
      const savesRef = collection(this.firestore!, `saves/${userId}/slots`);
      const querySnapshot = await getDocs(savesRef);

      const results: Array<{ slotId: SlotId; data: SaveData; meta: SaveSlotMeta }> = [];

      querySnapshot.forEach((doc) => {
        const saveDoc = doc.data() as SaveDocument;
        const slotId = doc.id as unknown as SlotId;
        results.push({
          slotId,
          data: saveDoc.data,
          meta: saveDoc.meta,
        });
      });

      return results;
    } catch (error: unknown) {
      throw this.handleFirestoreError(error, "read");
    }
  }

  /**
   * Subscribe to slot changes (real-time)
   */
  subscribeToSlot(
    userId: string,
    slotId: SlotId,
    callback: (data: SaveData | null) => void
  ): () => void {
    if (!this.firestore) {
      callback(null);
      return () => {};
    }

    const docRef = this.getSaveDocumentRef(userId, slotId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const saveDoc = docSnap.data() as SaveDocument;
        callback(saveDoc.data);
      } else {
        callback(null);
      }
    });

    return unsubscribe;
  }

  /**
   * Enable offline persistence
   */
  async enableOfflinePersistence(): Promise<void> {
    await this.ensureInitialized();

    try {
      await enableIndexedDbPersistence(this.firestore!);
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === "failed-precondition") {
        console.warn("Firestore persistence failed: multiple tabs open");
      } else if (err.code === "unimplemented") {
        console.warn("Firestore persistence not available in this browser");
      }
    }
  }

  /**
   * Enable/disable network
   */
  async setNetworkEnabled(enabled: boolean): Promise<void> {
    await this.ensureInitialized();

    if (enabled) {
      await enableNetwork(this.firestore!);
    } else {
      await disableNetwork(this.firestore!);
    }

    this.online = enabled;
  }

  /**
   * Get document reference for a save slot
   */
  private getSaveDocumentRef(userId: string, slotId: SlotId): DocumentReference<DocumentData> {
    if (!this.firestore) {
      throw new StorageError("Firestore not initialized", "read");
    }
    return doc(this.firestore, "saves", userId, "slots", String(slotId));
  }

  /**
   * Ensure adapter is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.firestore) {
      await this.initialize();
    }
  }

  /**
   * Handle Firestore errors
   */
  private handleFirestoreError(error: unknown, operation: "read" | "write" | "delete"): never {
    const err = error as { code?: string; message?: string };

    let code: SyncErrorCode = "UNKNOWN";
    let message = "Firestore operation failed";

    if (err.code) {
      switch (err.code) {
        case "permission-denied":
          code = "AUTH_EXPIRED";
          message = "Permission denied. Please sign in again.";
          break;
        case "not-found":
          code = "UNKNOWN";
          message = "Document not found.";
          break;
        case "resource-exhausted":
          code = "QUOTA_EXCEEDED";
          message = "Storage quota exceeded.";
          break;
        case "unavailable":
          code = "NETWORK_ERROR";
          message = "Service temporarily unavailable.";
          break;
        case "cancelled":
          code = "NETWORK_ERROR";
          message = "Operation cancelled.";
          break;
        case "deadline-exceeded":
          code = "TIMEOUT";
          message = "Request timed out.";
          break;
        default:
          message = err.message || "Firestore error occurred";
      }
    }

    throw new SaveSyncError(message, code);
  }

  /**
   * Clean up
   */
  dispose(): void {
    this.firestore = null;
    this.initPromise = null;
  }
}

/**
 * Singleton instance
 */
let firestoreAdapterInstance: FirestoreAdapter | null = null;

export function getFirestoreAdapter(): FirestoreAdapter {
  if (!firestoreAdapterInstance) {
    firestoreAdapterInstance = new FirestoreAdapter();
  }
  return firestoreAdapterInstance;
}
