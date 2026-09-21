/**
 * IndexedDB storage for offline application drafts using `idb`.
 *
 * Provides resilient offline caching for student hostel applications,
 * version tracking for optimistic concurrency, and conflict detection.
 */

import { openDB, type IDBPDatabase } from "idb";
import type { ApplicationFormData } from "@/components/application/application-form";

const DB_NAME = "hostelhub_offline_v1";
const DB_VERSION = 1;
const DRAFTS_STORE = "drafts";

export interface OfflineApplicationDraft {
  cycleId: string;
  applicationId?: string | null;
  referenceNumber?: string | null;
  formData: ApplicationFormData;
  version: number;
  serverVersion?: number;
  updatedAt: number;
  syncStatus: "synced" | "pending_sync" | "syncing" | "conflict";
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is only available in browser environments"));
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
          db.createObjectStore(DRAFTS_STORE, { keyPath: "cycleId" });
        }
      },
    });
  }

  return dbPromise;
}

/**
 * Save or update offline draft in IndexedDB
 */
export async function saveOfflineDraft(draft: OfflineApplicationDraft): Promise<void> {
  try {
    const db = await getDb();
    await db.put(DRAFTS_STORE, {
      ...draft,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn("Failed to persist offline draft to IndexedDB:", err);
  }
}

/**
 * Retrieve offline draft for a specific allocation cycle
 */
export async function getOfflineDraft(
  cycleId: string,
): Promise<OfflineApplicationDraft | undefined> {
  try {
    const db = await getDb();
    return await db.get(DRAFTS_STORE, cycleId);
  } catch (err) {
    console.warn("Failed to read offline draft from IndexedDB:", err);
    return undefined;
  }
}

/**
 * Delete offline draft after successful final submission
 */
export async function deleteOfflineDraft(cycleId: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(DRAFTS_STORE, cycleId);
  } catch (err) {
    console.warn("Failed to delete offline draft from IndexedDB:", err);
  }
}

/**
 * Get all drafts with pending sync
 */
export async function getPendingDrafts(): Promise<OfflineApplicationDraft[]> {
  try {
    const db = await getDb();
    const allDrafts: OfflineApplicationDraft[] = await db.getAll(DRAFTS_STORE);
    return allDrafts.filter((d) => d.syncStatus === "pending_sync");
  } catch (err) {
    console.warn("Failed to read pending drafts from IndexedDB:", err);
    return [];
  }
}

/**
 * Mark a draft as successfully synchronized
 */
export async function markDraftSynced(cycleId: string, newVersion: number): Promise<void> {
  try {
    const db = await getDb();
    const draft = await db.get(DRAFTS_STORE, cycleId);
    if (draft) {
      draft.syncStatus = "synced";
      draft.version = newVersion;
      draft.serverVersion = newVersion;
      draft.updatedAt = Date.now();
      await db.put(DRAFTS_STORE, draft);
    }
  } catch (err) {
    console.warn("Failed to mark draft synced:", err);
  }
}

/**
 * Mark a draft as having a version conflict
 */
export async function markDraftConflict(cycleId: string, serverVersion: number): Promise<void> {
  try {
    const db = await getDb();
    const draft = await db.get(DRAFTS_STORE, cycleId);
    if (draft) {
      draft.syncStatus = "conflict";
      draft.serverVersion = serverVersion;
      await db.put(DRAFTS_STORE, draft);
    }
  } catch (err) {
    console.warn("Failed to mark draft conflict:", err);
  }
}
