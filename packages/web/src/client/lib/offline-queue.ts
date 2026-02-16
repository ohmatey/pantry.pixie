/**
 * Offline Mutation Queue
 *
 * Queues mutations when offline and syncs them when back online.
 * Handles retry logic, dependencies, and conflict resolution.
 */

import { db, type MutationQueueEntry } from "./db";

// ============================================================================
// Queue Manager
// ============================================================================

class OfflineQueue {
  private processing = false;
  private listeners: Array<() => void> = [];

  /**
   * Add a mutation to the queue
   */
  async add(
    entry: Omit<
      MutationQueueEntry,
      "id" | "timestamp" | "retryCount" | "error"
    >,
  ): Promise<string> {
    const queueEntry: MutationQueueEntry = {
      id: crypto.randomUUID(),
      ...entry,
      timestamp: Date.now(),
      retryCount: 0,
    };

    await db.mutationQueue.add(queueEntry);
    this.notifyListeners();

    // Trigger background sync if supported
    this.registerBackgroundSync();

    return queueEntry.id;
  }

  /**
   * Process all pending mutations
   */
  async process(): Promise<{ success: number; failed: number }> {
    if (this.processing) {
      console.log("Queue already processing, skipping...");
      return { success: 0, failed: 0 };
    }

    this.processing = true;
    let successCount = 0;
    let failedCount = 0;

    try {
      const pending = await db.mutationQueue.orderBy("timestamp").toArray();

      if (pending.length === 0) {
        return { success: 0, failed: 0 };
      }

      console.log(`Processing ${pending.length} queued mutation(s)...`);

      for (const entry of pending) {
        try {
          await this.executeMutation(entry);
          await db.mutationQueue.delete(entry.id);
          successCount++;
        } catch (error) {
          failedCount++;
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          if (entry.retryCount >= 5) {
            console.error("Max retries reached, removing from queue:", entry);
            await db.mutationQueue.delete(entry.id);
          } else {
            // Exponential backoff: 1s, 2s, 4s, 8s, 16s
            const backoffDelay = Math.pow(2, entry.retryCount) * 1000;
            await db.mutationQueue.update(entry.id, {
              retryCount: entry.retryCount + 1,
              error: errorMessage,
              timestamp: Date.now() + backoffDelay, // Delay next retry
            });
          }
        }
      }

      console.log(
        `Queue processing complete: ${successCount} succeeded, ${failedCount} failed`,
      );
    } finally {
      this.processing = false;
      this.notifyListeners();
    }

    return { success: successCount, failed: failedCount };
  }

  /**
   * Execute a single mutation against the server
   */
  private async executeMutation(entry: MutationQueueEntry): Promise<void> {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No authentication token found");
    }

    // Build endpoint URL
    const endpoint = this.buildEndpoint(entry);

    // Build HTTP method
    const method =
      entry.type === "CREATE"
        ? "POST"
        : entry.type === "UPDATE"
          ? "PATCH"
          : "DELETE";

    // Make request
    const response = await fetch(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: entry.type !== "DELETE" ? JSON.stringify(entry.payload) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP ${response.status}: ${errorText || response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Build API endpoint URL for a mutation
   */
  private buildEndpoint(entry: MutationQueueEntry): string {
    const baseUrl = "/api";
    const { homeId, entity, entityId, type } = entry;

    // Map entity names to plural form
    const entityPath = entity === "item" ? "items" : `${entity}s`;

    if (type === "CREATE") {
      return `${baseUrl}/homes/${homeId}/${entityPath}`;
    } else {
      return `${baseUrl}/homes/${homeId}/${entityPath}/${entityId}`;
    }
  }

  /**
   * Get pending mutation count
   */
  async getPendingCount(homeId?: string): Promise<number> {
    if (homeId) {
      return db.mutationQueue.where({ homeId }).count();
    }
    return db.mutationQueue.count();
  }

  /**
   * Clear all mutations (use with caution!)
   */
  async clear(homeId?: string): Promise<void> {
    if (homeId) {
      await db.mutationQueue.where({ homeId }).delete();
    } else {
      await db.mutationQueue.clear();
    }
    this.notifyListeners();
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Register background sync (if supported)
   */
  private registerBackgroundSync() {
    if (
      "serviceWorker" in navigator &&
      "sync" in ServiceWorkerRegistration.prototype
    ) {
      navigator.serviceWorker.ready
        .then((registration) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (registration as any).sync.register("sync-mutations");
        })
        .catch((error) => {
          console.warn("Background sync registration failed:", error);
        });
    }
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const offlineQueue = new OfflineQueue();

// ============================================================================
// Auto-sync on visibility change and online event
// ============================================================================

if (typeof window !== "undefined") {
  // Sync when going online
  window.addEventListener("online", () => {
    console.log("Network online, processing queue...");
    offlineQueue.process();
  });

  // Sync when tab becomes visible (user returns to app)
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && navigator.onLine) {
      console.log("App visible and online, processing queue...");
      offlineQueue.process();
    }
  });
}
