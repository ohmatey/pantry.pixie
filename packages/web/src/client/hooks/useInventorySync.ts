import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "./useWebSocket";
import { useAuth } from "./useAuth";

/**
 * Listens for WebSocket inventory_update messages and invalidates
 * the items query cache so the List tab stays in sync.
 */
export function useInventorySync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { isConnected } = useWebSocket({
    onMessage: (msg) => {
      if (msg.type === "inventory_update") {
        queryClient.invalidateQueries({ queryKey: ["items", user?.homeId] });
      }
      if (msg.type === "list_update") {
        queryClient.invalidateQueries({ queryKey: ["grocery-lists", user?.homeId] });
      }
    },
  });

  return { isConnected };
}
