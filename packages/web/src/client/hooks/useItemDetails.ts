import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { apiGet } from "../lib/api";

export interface ItemDetails {
  id: string;
  homeId: string;
  name: string;
  description: string | null;
  category: string | null;
  quantity: number;
  unit: string | null;
  price: string | null;
  expiresAt: string | null;
  isRecurring: boolean;
  recurringInterval: string | null;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook to fetch full item details on demand
 * Used by ListItemDetailsModal to show complete item information
 */
export function useItemDetails(itemId: string | null) {
  const { token, user } = useAuth();

  return useQuery({
    queryKey: ["item-details", itemId],
    queryFn: async () => {
      const res = await apiGet<ItemDetails>(
        `/api/homes/${user!.homeId}/items/${itemId}`,
        token!,
      );
      return res.data;
    },
    enabled: !!token && !!user?.homeId && !!itemId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
