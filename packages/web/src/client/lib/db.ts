/**
 * IndexedDB Schema with Dexie
 *
 * Provides persistent offline storage for:
 * - Items (grocery list items)
 * - Messages (chat messages)
 * - Mutation queue (offline operations)
 * - Sync metadata (sync state tracking)
 */

import Dexie, { type EntityTable } from "dexie";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface IDBItem {
  id: string;
  homeId: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  isChecked: boolean;
  expiresAt: number | null;
  recurring: {
    enabled: boolean;
    interval: string | null;
    nextScheduledAt: number | null;
  } | null;
  // Sync metadata
  _localVersion: number;
  _serverVersion: number | null;
  _syncStatus: "synced" | "pending" | "conflict";
  _lastModified: number;
  _deleted: boolean; // Soft delete marker
}

export interface IDBMessage {
  id: string;
  threadId: string;
  homeId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  // Sync metadata
  _localVersion: number;
  _serverVersion: number | null;
  _syncStatus: "synced" | "pending" | "conflict";
  _lastModified: number;
}

export interface MutationQueueEntry {
  id: string; // UUID
  type: "CREATE" | "UPDATE" | "DELETE";
  entity: "item" | "list_item" | "message";
  entityId: string;
  homeId: string;
  payload: any;
  retryCount: number;
  timestamp: number;
  dependsOn?: string[]; // For ordered operations (e.g., create must happen before update)
  error?: string; // Last error message if any
}

export interface SyncMeta {
  homeId: string;
  entity: "items" | "messages";
  lastSyncAt: number;
  lastServerVersion: number;
  conflictCount: number;
}

export interface QueuedChatMessage {
  id: string;
  threadId: string;
  content: string;
  timestamp: number;
  retryCount: number;
  error?: string;
}

// ============================================================================
// Dexie Database Class
// ============================================================================

class PixieDatabase extends Dexie {
  // Typed tables
  items!: EntityTable<IDBItem, "id">;
  messages!: EntityTable<IDBMessage, "id">;
  mutationQueue!: EntityTable<MutationQueueEntry, "id">;
  syncMeta!: EntityTable<SyncMeta, "homeId">;
  chatQueue!: EntityTable<QueuedChatMessage, "id">;

  constructor() {
    super("PixieDB");

    // Schema version 1
    this.version(1).stores({
      // Items: primary key + compound indexes for efficient queries
      items: "id, homeId, [homeId+isChecked], [homeId+category], _lastModified",

      // Messages: primary key + compound indexes
      messages: "id, threadId, homeId, timestamp, [threadId+timestamp]",

      // Mutation queue: auto-increment id + indexes for processing
      mutationQueue: "++id, timestamp, homeId, [homeId+timestamp], _syncStatus",

      // Sync metadata: homeId as primary key
      syncMeta: "homeId, entity, lastSyncAt",
    });

    // Schema version 2: Add chat queue for offline messages
    this.version(2).stores({
      // Chat queue: primary key + indexes for processing
      chatQueue: "id, threadId, timestamp, [threadId+timestamp]",
    });
  }

  /**
   * Get all items for a home, excluding soft-deleted ones
   */
  async getHomeItems(homeId: string): Promise<IDBItem[]> {
    return this.items
      .where({ homeId })
      .and((item) => !item._deleted)
      .toArray();
  }

  /**
   * Get unchecked items for a home (grocery list)
   */
  async getGroceryList(homeId: string): Promise<IDBItem[]> {
    return this.items
      .where("[homeId+isChecked]")
      .equals([homeId, false] as any)
      .and((item) => !item._deleted)
      .toArray();
  }

  /**
   * Get messages for a thread
   */
  async getThreadMessages(threadId: string): Promise<IDBMessage[]> {
    return this.messages.where({ threadId }).sortBy("timestamp");
  }

  /**
   * Get pending mutations for sync
   */
  async getPendingMutations(homeId?: string): Promise<MutationQueueEntry[]> {
    const query = homeId
      ? this.mutationQueue.where({ homeId })
      : this.mutationQueue.toCollection();

    return query.sortBy("timestamp");
  }

  /**
   * Clear all data (for logout)
   */
  async clearAllData() {
    await Promise.all([
      this.items.clear(),
      this.messages.clear(),
      this.mutationQueue.clear(),
      this.syncMeta.clear(),
      this.chatQueue.clear(),
    ]);
  }

  /**
   * Get database size estimate
   */
  async getStorageEstimate(): Promise<{ usage: number; quota: number }> {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return { usage: 0, quota: 0 };
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const db = new PixieDatabase();

// ============================================================================
// Utility functions
// ============================================================================

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== "undefined" && "indexedDB" in window;
  } catch {
    return false;
  }
}

/**
 * Check if storage quota is approaching limit (>80%)
 */
export async function isStorageQuotaHigh(): Promise<boolean> {
  const { usage, quota } = await db.getStorageEstimate();
  if (quota === 0) return false;
  return usage / quota > 0.8;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
