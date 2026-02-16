import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "../lib/api";

export interface ListItemWithItem {
  id: string;
  listId: string;
  itemId: string;
  quantity: number;
  isCompleted: boolean;
  addedAt: string;
  completedAt: string | null;
  notes: string | null;
  estimatedPrice: string | null;
  item: {
    id: string;
    homeId: string;
    name: string;
    description: string | null;
    category: string | null;
    quantity: number;
    unit: string | null;
    price: string | null;
  };
}

export interface GroceryListWithItems {
  id: string;
  homeId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  completedAt: string | null;
  totalBudget: string | null;
  estimatedCost: string | null;
  recurringSchedule: string | null;
  scheduleDayOfWeek: number | null;
  scheduleDayOfMonth: number | null;
  nextResetAt: string | null;
  lastResetAt: string | null;
  roundNumber: number;
  isDefault: boolean;
  items: ListItemWithItem[];
  completedItems: number;
  totalItems: number;
  completionPercentage: number;
}

interface CreateListInput {
  name: string;
  description?: string;
  recurringSchedule?: string | null;
  scheduleDayOfWeek?: number | null;
  scheduleDayOfMonth?: number | null;
}

interface UpdateListInput {
  name?: string;
  description?: string;
  recurringSchedule?: string | null;
  scheduleDayOfWeek?: number | null;
  scheduleDayOfMonth?: number | null;
}

export function useGroceryLists() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["grocery-lists", user?.homeId];

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiGet<GroceryListWithItems[]>(
        `/api/homes/${user!.homeId}/lists`,
        token!,
      );
      return res.data || [];
    },
    enabled: !!token && !!user?.homeId,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });

  const lists = data || [];

  const defaultList = useMemo(
    () => lists.find((l) => l.isDefault) ?? null,
    [lists],
  );

  const namedLists = useMemo(() => lists.filter((l) => !l.isDefault), [lists]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  // Create list
  const createListMut = useMutation({
    mutationFn: async (input: CreateListInput) => {
      const res = await apiPost(
        `/api/homes/${user!.homeId}/lists`,
        token!,
        input,
      );
      return res.data;
    },
    onSuccess: invalidate,
  });

  // Update list
  const updateListMut = useMutation({
    mutationFn: async ({ id, ...input }: UpdateListInput & { id: string }) => {
      const res = await apiPut(
        `/api/homes/${user!.homeId}/lists/${id}`,
        token!,
        input,
      );
      return res.data;
    },
    onSuccess: invalidate,
  });

  // Delete list
  const deleteListMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiDelete(
        `/api/homes/${user!.homeId}/lists/${id}`,
        token!,
      );
      return res;
    },
    onSuccess: invalidate,
  });

  // Add item by name (find-or-create)
  const addItemByNameMut = useMutation({
    mutationFn: async ({
      listId,
      name,
      quantity,
    }: {
      listId: string;
      name: string;
      quantity?: number;
    }) => {
      const res = await apiPost(
        `/api/homes/${user!.homeId}/lists/${listId}/items/by-name`,
        token!,
        { name, quantity },
      );
      return res.data;
    },
    onSuccess: invalidate,
  });

  // Remove list item
  const removeListItemMut = useMutation({
    mutationFn: async ({
      listId,
      listItemId,
    }: {
      listId: string;
      listItemId: string;
    }) => {
      const res = await apiDelete(
        `/api/homes/${user!.homeId}/lists/${listId}/items/${listItemId}`,
        token!,
      );
      return res;
    },
    onSuccess: invalidate,
  });

  // Toggle list item (with optimistic update)
  const toggleListItemMut = useMutation({
    mutationFn: async ({
      listId,
      listItemId,
    }: {
      listId: string;
      listItemId: string;
    }) => {
      const res = await apiPatch(
        `/api/homes/${user!.homeId}/lists/${listId}/items/${listItemId}/toggle`,
        token!,
      );
      return res.data;
    },
    onMutate: async ({ listId, listItemId }) => {
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<GroceryListWithItems[]>(queryKey, (old) =>
        old?.map((list) =>
          list.id === listId
            ? {
                ...list,
                items: list.items.map((li) =>
                  li.id === listItemId
                    ? { ...li, isCompleted: !li.isCompleted }
                    : li,
                ),
                completedItems: list.items.reduce(
                  (n, li) =>
                    n +
                    (li.id === listItemId
                      ? li.isCompleted
                        ? 0
                        : 1
                      : li.isCompleted
                        ? 1
                        : 0),
                  0,
                ),
              }
            : list,
        ),
      );
    },
    onSettled: invalidate,
  });

  // Reset list
  const resetListMut = useMutation({
    mutationFn: async (listId: string) => {
      const res = await apiPatch(
        `/api/homes/${user!.homeId}/lists/${listId}/reset`,
        token!,
      );
      return res.data;
    },
    onSuccess: invalidate,
  });

  return {
    lists,
    defaultList,
    namedLists,
    isLoading,
    refetch,
    createList: (data: CreateListInput) => createListMut.mutateAsync(data),
    updateList: (id: string, data: UpdateListInput) =>
      updateListMut.mutateAsync({ id, ...data }),
    deleteList: (id: string) => deleteListMut.mutateAsync(id),
    addItemToList: (listId: string, name: string, quantity?: number) =>
      addItemByNameMut.mutateAsync({ listId, name, quantity }),
    removeListItem: (listId: string, listItemId: string) =>
      removeListItemMut.mutateAsync({ listId, listItemId }),
    toggleListItem: (listId: string, listItemId: string) =>
      toggleListItemMut.mutate({ listId, listItemId }),
    resetList: (listId: string) => resetListMut.mutateAsync(listId),
    isCreating: createListMut.isPending,
    isAddingItem: addItemByNameMut.isPending,
  };
}
