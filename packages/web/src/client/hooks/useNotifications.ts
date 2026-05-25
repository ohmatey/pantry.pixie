import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { apiGet, apiPatch } from "../lib/api";

export interface NotificationItem {
  id: string;
  homeId: string;
  userId: string | null;
  type:
    | "recurring_due"
    | "expiring_soon"
    | "partner_activity"
    | "sunday_sync"
    | "running_low";
  title: string;
  body: string | null;
  refId: string | null;
  isRead: boolean;
  createdAt: string;
}

/**
 * Shared notifications query. The same queryKey is used by the header bell and
 * the inbox page, so react-query dedupes to a single request and they stay in
 * sync. Polls every 60s and on window focus so a partner's actions surface.
 */
export function useNotifications() {
  const { token, user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.homeId],
    queryFn: async () => {
      const res = await apiGet<NotificationItem[]>(
        `/api/homes/${user!.homeId}/notifications`,
        token!,
      );
      return res.data ?? [];
    },
    enabled: !!token && !!user?.homeId,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiPatch(
        `/api/homes/${user!.homeId}/notifications/${id}/read`,
        token!,
        {},
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", user?.homeId],
      });
    },
  });
}
