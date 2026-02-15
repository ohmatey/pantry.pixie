/**
 * Sync Status Hook
 *
 * Tracks the status of offline mutation queue synchronization.
 * Provides pending count and sync triggers.
 */

import { useState, useEffect } from 'react';
import { offlineQueue } from '../lib/offline-queue';

export interface SyncStatus {
  pendingCount: number;
  isProcessing: boolean;
  lastSyncAt: number | null;
}

export function useSyncStatus(homeId?: string) {
  const [status, setStatus] = useState<SyncStatus>({
    pendingCount: 0,
    isProcessing: false,
    lastSyncAt: null,
  });

  useEffect(() => {
    // Initial load
    offlineQueue.getPendingCount(homeId).then((count) => {
      setStatus((prev) => ({ ...prev, pendingCount: count }));
    });

    // Subscribe to queue changes
    const unsubscribe = offlineQueue.subscribe(() => {
      offlineQueue.getPendingCount(homeId).then((count) => {
        setStatus((prev) => ({ ...prev, pendingCount: count }));
      });
    });

    return unsubscribe;
  }, [homeId]);

  const syncNow = async () => {
    setStatus((prev) => ({ ...prev, isProcessing: true }));
    try {
      await offlineQueue.process();
      setStatus((prev) => ({
        ...prev,
        isProcessing: false,
        lastSyncAt: Date.now(),
      }));
    } catch (error) {
      console.error('Sync failed:', error);
      setStatus((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  return {
    ...status,
    syncNow,
  };
}
