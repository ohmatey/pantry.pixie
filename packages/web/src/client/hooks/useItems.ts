import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useOfflineAwareMutation } from "./useOfflineAwareMutation";
import { apiGet, apiPatch } from "../lib/api";
import { db, type IDBItem } from "../lib/db";

export interface Item {
  id: string;
  homeId: string;
  name: string;
  description: string | null;
  category: string | null;
  quantity: number;
  unit: string | null;
  location: string | null;
  expiresAt: string | null;
  dateAdded: string;
  lastUpdated: string;
  isRecurring: boolean;
  recurringInterval: string | null;
  isChecked: boolean;
  notes: string | null;
  price: string | null;
}

/**
 * Convert server Item to IndexedDB Item
 */
function toIDBItem(item: Item): IDBItem {
  return {
    id: item.id,
    homeId: item.homeId,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    isChecked: item.isChecked,
    expiresAt: item.expiresAt ? new Date(item.expiresAt).getTime() : null,
    recurring: item.isRecurring
      ? {
          enabled: true,
          interval: item.recurringInterval,
          nextScheduledAt: null, // TODO: Calculate from recurringInterval
        }
      : null,
    _localVersion: Date.now(),
    _serverVersion: Date.now(),
    _syncStatus: 'synced',
    _lastModified: new Date(item.lastUpdated).getTime(),
    _deleted: false,
  };
}

export function useItems() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["items", user?.homeId],
    queryFn: async () => {
      const res = await apiGet<Item[]>(`/api/homes/${user!.homeId}/items`, token!);
      const items = res.data || [];

      // Sync to IndexedDB
      if (items.length > 0) {
        const idbItems = items.map(toIDBItem);
        await db.items.bulkPut(idbItems);
      }

      return items;
    },
    enabled: !!token && !!user?.homeId,
    refetchOnWindowFocus: true,
    // Use cached data while revalidating
    placeholderData: (previousData) => previousData,
  });

  const toggleMutation = useOfflineAwareMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      const res = await apiPatch<Item>(
        `/api/homes/${user!.homeId}/items/${itemId}/toggle`,
        token!
      );
      return res.data;
    },

    queueEntry: ({ itemId }) => ({
      type: 'UPDATE',
      entity: 'item',
      entityId: itemId,
      homeId: user!.homeId,
      payload: { toggle: true },
    }),

    optimisticUpdate: async ({ itemId }) => {
      // Update React Query cache immediately
      await queryClient.cancelQueries({ queryKey: ["items", user?.homeId] });
      queryClient.setQueryData<Item[]>(["items", user?.homeId], (old) =>
        old?.map((item) =>
          item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
        )
      );

      // Update IndexedDB immediately
      const idbItem = await db.items.get(itemId);
      if (idbItem) {
        await db.items.update(itemId, {
          isChecked: !idbItem.isChecked,
          _syncStatus: 'pending',
          _lastModified: Date.now(),
          _localVersion: Date.now(),
        });
      }
    },

    onSuccess: (data) => {
      // Update IndexedDB with server response
      if (data) {
        db.items.put(toIDBItem(data));
      }
      // Invalidate query to refetch
      queryClient.invalidateQueries({ queryKey: ["items", user?.homeId] });
    },

    onError: (error) => {
      console.error('Toggle item failed:', error);
      // Revert optimistic update
      queryClient.invalidateQueries({ queryKey: ["items", user?.homeId] });
    },
  });

  const items = data || [];

  return {
    items,
    isLoading,
    refetch,
    toggleItem: (itemId: string) => toggleMutation.mutate({ itemId }),
  };
}
