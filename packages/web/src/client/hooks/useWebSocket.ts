import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "./useAuth";

interface WSMessage {
  type: string;
  payload: any;
  timestamp: string;
}

interface UseWebSocketOptions {
  onMessage?: (msg: WSMessage) => void;
  onStatusChange?: (status: "connected" | "disconnected" | "reconnecting") => void;
}

export function useWebSocket({ onMessage, onStatusChange }: UseWebSocketOptions = {}) {
  const { token } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [isConnected, setIsConnected] = useState(false);
  const mountedRef = useRef(true);

  // Store callbacks in refs so they don't cause reconnections
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  useEffect(() => {
    mountedRef.current = true;
    // Track the active connection for this effect invocation.
    // Prevents StrictMode's stale onclose from triggering reconnects.
    let activeWs: WebSocket | null = null;

    function connect() {
      if (!token || !mountedRef.current) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const ws = new WebSocket(`${protocol}//${host}/ws?token=${token}`);
      activeWs = ws;

      ws.onopen = () => {
        if (activeWs !== ws) { ws.close(); return; }
        setIsConnected(true);
        onStatusChangeRef.current?.("connected");
      };

      ws.onmessage = (event) => {
        if (activeWs !== ws) return;
        try {
          const data = JSON.parse(event.data) as WSMessage;
          onMessageRef.current?.(data);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (activeWs !== ws) return;
        setIsConnected(false);
        onStatusChangeRef.current?.("disconnected");

        // Reconnect after 2 seconds
        reconnectTimerRef.current = setTimeout(() => {
          onStatusChangeRef.current?.("reconnecting");
          connect();
        }, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    }

    connect();

    return () => {
      mountedRef.current = false;
      activeWs = null;
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [token]);

  const send = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const sendChatMessage = useCallback(
    (threadId: string, content: string, listId?: string | null) => {
      send({
        type: "message",
        payload: { threadId, role: "user", content, listId },
        timestamp: new Date().toISOString(),
      });
    },
    [send]
  );

  return { isConnected, send, sendChatMessage };
}
