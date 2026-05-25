import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ChatBubbleWithUI } from "@/components/chat/ChatBubbleWithUI";
import { ChatInput } from "@/components/chat/ChatInput";
import { StarterPrompts } from "@/components/chat/StarterPrompts";
import { ListSelector } from "@/components/chat/ListSelector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft } from "lucide-react";
import { apiFetch, apiPost } from "@/lib/api";
import { fileToDataUrl } from "@/lib/image";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import type {
  SerializedUI,
  UIWebSocketMessage,
  ListUpdateWebSocketMessage,
  ReceiptReviewUI,
} from "@/types/websocket";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  intent?: string;
  timestamp: string;
  ui?: SerializedUI;
  isStreaming?: boolean;
}

export default function ChatPage() {
  const { token, user } = useAuth();
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const activeThreadId = threadId ?? null;

  // Fetch thread info for title
  const { data: threadsData } = useQuery({
    queryKey: ["threads", user?.homeId],
    queryFn: () => apiFetch(`/api/homes/${user!.homeId}/chat/threads`, token!),
    enabled: !!token && !!user?.homeId,
  });

  const currentThread = threadsData?.data?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t: any) => t.id === activeThreadId,
  );

  // Fetch messages for active thread
  const { data: messagesData } = useQuery({
    queryKey: ["messages", activeThreadId],
    queryFn: () =>
      apiFetch(
        `/api/homes/${user!.homeId}/chat/threads/${activeThreadId}/messages`,
        token!,
      ),
    enabled: !!activeThreadId && !!token,
  });

  // Set messages from DB
  useEffect(() => {
    if (messagesData?.success && messagesData.data) {
      const dbMessages: Message[] = messagesData.data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          intent: m.intent,
          timestamp: m.createdAt,
        }))
        .reverse();
      setMessages(dbMessages);
    }
  }, [messagesData]);

  // WebSocket message handler
  const handleWSMessage = useCallback(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (msg: any) => {
      console.log("[Chat] Received WS message:", msg.type, msg.payload);

      if (msg.type === "message" && msg.payload?.threadId === activeThreadId) {
        setMessages((prev) => {
          // Avoid duplicates
          if (
            msg.payload.messageId &&
            prev.some((m) => m.id === msg.payload.messageId)
          ) {
            return prev;
          }
          return [
            ...prev,
            {
              id: msg.payload.messageId,
              role: msg.payload.role,
              content: msg.payload.content,
              intent: msg.payload.intent,
              timestamp: msg.timestamp,
            },
          ];
        });
        setIsTyping(false);
      } else if (
        msg.type === "ui_message" &&
        msg.payload?.threadId === activeThreadId
      ) {
        const uiMsg = msg as UIWebSocketMessage;
        console.log("[Chat] UI message:", {
          content: uiMsg.payload.content,
          ui: uiMsg.payload.ui,
          isStreaming: uiMsg.payload.isStreaming,
        });
        setMessages((prev) => {
          // Find existing message by ID (for streaming updates)
          const existingIndex = prev.findIndex(
            (m) => m.id === uiMsg.payload.messageId,
          );

          if (existingIndex >= 0) {
            // Update existing message (streaming)
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              content: uiMsg.payload.content,
              ui: uiMsg.payload.ui,
              isStreaming: uiMsg.payload.isStreaming,
            };
            return updated;
          } else {
            // Add new message
            return [
              ...prev,
              {
                id: uiMsg.payload.messageId,
                role: uiMsg.payload.role,
                content: uiMsg.payload.content,
                ui: uiMsg.payload.ui,
                isStreaming: uiMsg.payload.isStreaming,
                timestamp: msg.timestamp,
              },
            ];
          }
        });

        if (!uiMsg.payload.isStreaming) {
          setIsTyping(false);
        }
      } else if (msg.type === "list_update") {
        // Handle real-time list updates from other clients
        const listMsg = msg as ListUpdateWebSocketMessage;
        setMessages((prev) => {
          return prev.map((m) => {
            // Find messages with grocery list UI
            if (
              m.ui?.type === "grocery-list" &&
              m.ui.data.id === listMsg.payload.list?.id
            ) {
              // Update the UI data based on action
              const updatedUI = { ...m.ui };

              if (
                listMsg.payload.action === "item_toggled" &&
                listMsg.payload.listItem
              ) {
                // Update the specific item's completion status
                updatedUI.data = {
                  ...updatedUI.data,
                  items: updatedUI.data.items.map((item) =>
                    item.id === listMsg.payload.listItem.id
                      ? {
                          ...item,
                          isCompleted: listMsg.payload.listItem.isCompleted,
                        }
                      : item,
                  ),
                };

                // Recalculate stats
                const completedCount = updatedUI.data.items.filter(
                  (i) => i.isCompleted,
                ).length;
                updatedUI.data.completedItems = completedCount;
                updatedUI.data.completionPercentage =
                  updatedUI.data.totalItems > 0
                    ? Math.round(
                        (completedCount / updatedUI.data.totalItems) * 100,
                      )
                    : 0;
              }

              return { ...m, ui: updatedUI };
            }
            return m;
          });
        });
      } else if (msg.type === "status") {
        if (msg.payload?.status === "typing") {
          setIsTyping(true);
        } else if (msg.payload?.status === "idle") {
          setIsTyping(false);
        }
      } else if (msg.type === "inventory:updated") {
        // Show toast notification for inventory changes
        const { action, itemName } = msg.payload || {};
        if (action && itemName) {
          const actionText =
            action === "added"
              ? "Added"
              : action === "removed"
                ? "Removed"
                : "Updated";
          toast.success(`${actionText} ${itemName}`, {
            description: "Inventory updated",
            action: {
              label: "Undo",
              onClick: () => {
                toast.info("Undo not yet implemented");
              },
            },
            duration: 3000,
          });
        }
      }
    },
    [activeThreadId],
  );

  const { sendChatMessage, isConnected } = useWebSocket({
    onMessage: handleWSMessage,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = (content: string) => {
    if (!activeThreadId) return;

    // Optimistic UI: add user message immediately
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content,
        timestamp: new Date().toISOString(),
      },
    ]);

    setIsTyping(true);
    sendChatMessage(activeThreadId, content, selectedListId);
  };

  // Scan a receipt photo right inside chat: parse over HTTP (image never hits the
  // socket), then send a short summary + the parsed payload so Pixie can present
  // an inline review card.
  const handleAttachReceipt = useCallback(
    async (file: File) => {
      if (!activeThreadId || !user?.homeId || !token) return;
      setScanning(true);
      try {
        const dataUrl = await fileToDataUrl(file);
        const res = await apiPost<ReceiptReviewUI>(
          `/api/homes/${user.homeId}/receipts/scan`,
          token,
          { image: dataUrl },
        );
        const parsed = res.data;
        if (!parsed || parsed.items.length === 0) {
          toast.error(
            "Couldn't read that receipt — try a clearer photo, or add items from the Pantry tab.",
          );
          return;
        }
        const summary = `I scanned a receipt${
          parsed.merchant ? ` from ${parsed.merchant}` : ""
        }${parsed.total != null ? ` totaling ฿${parsed.total.toFixed(2)}` : ""}.`;
        setMessages((prev) => [
          ...prev,
          { role: "user", content: summary, timestamp: new Date().toISOString() },
        ]);
        setIsTyping(true);
        sendChatMessage(activeThreadId, summary, selectedListId, parsed);
      } catch {
        toast.error("Receipt scan failed — please try again");
      } finally {
        setScanning(false);
      }
    },
    [activeThreadId, user?.homeId, token, selectedListId, sendChatMessage],
  );

  // Mutation for toggling list items
  const toggleListItem = useMutation({
    mutationFn: async ({
      listId,
      listItemId,
    }: {
      listId: string;
      listItemId: string;
    }) => {
      return apiFetch(
        `/api/homes/${user!.homeId}/lists/${listId}/items/${listItemId}/toggle`,
        token!,
        {
          method: "POST",
        },
      );
    },
    onError: (error) => {
      toast.error("Failed to update item");
      console.error("Toggle error:", error);
    },
  });

  // Mutation for removing list items
  const removeListItem = useMutation({
    mutationFn: async ({
      listId,
      listItemId,
    }: {
      listId: string;
      listItemId: string;
    }) => {
      return apiFetch(
        `/api/homes/${user!.homeId}/lists/${listId}/items/${listItemId}`,
        token!,
        { method: "DELETE" },
      );
    },
    onSuccess: () => {
      toast.success("Item removed");
    },
    onError: () => {
      toast.error("Failed to remove item");
    },
  });

  const handleToggleListItem = useCallback(
    (listId: string, listItemId: string) => {
      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => {
          // Handle grocery-list UI type
          if (m.ui?.type === "grocery-list" && m.ui.data.id === listId) {
            const updatedUI = { ...m.ui };
            updatedUI.data = {
              ...updatedUI.data,
              items: updatedUI.data.items.map((item) =>
                item.id === listItemId
                  ? { ...item, isCompleted: !item.isCompleted }
                  : item,
              ),
            };

            // Recalculate stats
            const completedCount = updatedUI.data.items.filter(
              (i) => i.isCompleted,
            ).length;
            updatedUI.data.completedItems = completedCount;
            updatedUI.data.completionPercentage =
              updatedUI.data.totalItems > 0
                ? Math.round((completedCount / updatedUI.data.totalItems) * 100)
                : 0;

            return { ...m, ui: updatedUI };
          }

          // Handle list-editor UI type
          if (m.ui?.type === "list-editor" && m.ui.data.list.id === listId) {
            const updatedUI = { ...m.ui };
            updatedUI.data = {
              ...updatedUI.data,
              list: {
                ...updatedUI.data.list,
                items: updatedUI.data.list.items.map((item) =>
                  item.id === listItemId
                    ? { ...item, isCompleted: !item.isCompleted }
                    : item,
                ),
              },
            };

            // Recalculate stats
            const completedCount = updatedUI.data.list.items.filter(
              (i) => i.isCompleted,
            ).length;
            updatedUI.data.list.completedItems = completedCount;
            updatedUI.data.list.completionPercentage =
              updatedUI.data.list.totalItems > 0
                ? Math.round(
                    (completedCount / updatedUI.data.list.totalItems) * 100,
                  )
                : 0;

            return { ...m, ui: updatedUI };
          }

          return m;
        }),
      );

      // Call API
      toggleListItem.mutate({ listId, listItemId });
    },
    [toggleListItem],
  );

  // Handler for selecting a list from overview
  const handleSelectList = useCallback(
    (listId: string, listName: string) => {
      if (!activeThreadId) return;
      sendChatMessage(activeThreadId, `Show me the ${listName} list`);
    },
    [activeThreadId, sendChatMessage],
  );

  // Handler for adding item to list via chat message
  const handleAddItemToList = useCallback(
    (listId: string, itemName: string, quantity: number) => {
      if (!activeThreadId) return;
      const quantityText = quantity > 1 ? `${quantity} ` : "";
      sendChatMessage(
        activeThreadId,
        `Add ${quantityText}${itemName} to my list`,
      );
    },
    [activeThreadId, sendChatMessage],
  );

  // Handler for removing item from list
  const handleRemoveItemFromList = useCallback(
    (listId: string, listItemId: string) => {
      removeListItem.mutate({ listId, listItemId });
    },
    [removeListItem],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Chat header with back button */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-pixie-cream-200 dark:border-pixie-dusk-300 bg-white dark:bg-pixie-dusk-100 shrink-0">
        <button
          onClick={() => navigate("/chats")}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-pixie-cream-100 dark:hover:bg-pixie-dusk-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-pixie-charcoal-200 dark:text-pixie-mist-200" />
        </button>
        <span className="text-sm font-medium text-pixie-charcoal-300 dark:text-pixie-mist-100 truncate">
          {currentThread?.title || "Chat"}
        </span>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.length === 0 && !isTyping && (
            <StarterPrompts onSelectPrompt={handleSend} />
          )}

          {messages.map((msg, i) => (
            <ChatBubbleWithUI
              key={msg.id || `msg-${i}`}
              role={msg.role}
              content={msg.content}
              intent={msg.intent}
              timestamp={msg.timestamp}
              ui={msg.ui}
              isTyping={msg.isStreaming}
              onToggleItem={(listItemId) => {
                if (msg.ui?.type === "grocery-list") {
                  handleToggleListItem(msg.ui.data.id, listItemId);
                } else if (msg.ui?.type === "list-editor") {
                  handleToggleListItem(msg.ui.data.list.id, listItemId);
                }
              }}
              onSelectList={handleSelectList}
              onAddItemToList={handleAddItemToList}
              onRemoveItemFromList={handleRemoveItemFromList}
            />
          ))}

          {isTyping && (
            <div className="flex gap-2 items-center text-pixie-charcoal-100 dark:text-pixie-mist-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Pixie is thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* List Selector */}
      <ListSelector
        selectedListId={selectedListId}
        onSelectList={setSelectedListId}
      />

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onAttachReceipt={handleAttachReceipt}
        scanning={scanning}
        disabled={!isConnected || !activeThreadId}
      />
    </div>
  );
}
