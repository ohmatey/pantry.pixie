/**
 * Offline-Aware Mutation Hook
 *
 * Wrapper around React Query mutations that automatically:
 * - Queues mutations when offline
 * - Applies optimistic updates immediately
 * - Syncs when back online
 */

import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { useNetworkStatus } from './useNetworkStatus';
import { offlineQueue } from '../lib/offline-queue';
import type { MutationQueueEntry } from '../lib/db';

export interface OfflineAwareMutationOptions<TData, TVariables> {
  /**
   * The mutation function to execute when online
   */
  mutationFn: (variables: TVariables) => Promise<TData>;

  /**
   * Factory function to create a queue entry for offline mutations
   */
  queueEntry: (
    variables: TVariables
  ) => Omit<
    MutationQueueEntry,
    'id' | 'timestamp' | 'retryCount' | 'error'
  >;

  /**
   * Optimistic update function (runs immediately, even when offline)
   */
  optimisticUpdate: (variables: TVariables) => Promise<void>;

  /**
   * Success callback (only called when mutation succeeds, not when queued)
   */
  onSuccess?: (data: TData, variables: TVariables) => void;

  /**
   * Error callback
   */
  onError?: (error: Error, variables: TVariables) => void;
}

interface OfflineMutationResult<TData> {
  success: boolean;
  queued: boolean;
  data?: TData;
}

export function useOfflineAwareMutation<TData, TVariables>({
  mutationFn,
  queueEntry,
  optimisticUpdate,
  onSuccess,
  onError,
}: OfflineAwareMutationOptions<TData, TVariables>) {
  const isOnline = useNetworkStatus();

  return useMutation<OfflineMutationResult<TData>, Error, TVariables>({
    mutationFn: async (variables: TVariables) => {
      // Always apply optimistic update first
      await optimisticUpdate(variables);

      if (!isOnline) {
        // Offline: queue the mutation
        await offlineQueue.add(queueEntry(variables));
        return { success: true, queued: true };
      }

      // Online: execute immediately
      try {
        const data = await mutationFn(variables);
        return { success: true, queued: false, data };
      } catch (error) {
        // Failed online mutation - queue it for retry
        console.warn('Online mutation failed, queueing for retry:', error);
        await offlineQueue.add(queueEntry(variables));
        throw error;
      }
    },

    onSuccess: (result, variables) => {
      // Only call onSuccess if mutation wasn't queued (i.e., it actually executed)
      if (!result.queued && result.data && onSuccess) {
        onSuccess(result.data, variables);
      }
    },

    onError,
  });
}
