import { memo } from "react";
import { motion } from "framer-motion";
import { ChatBubble } from "./ChatBubble";
import { GroceryListInChat } from "./GroceryListInChat";
import { GroceryListsOverview } from "./GroceryListsOverview";
import { ListEditor } from "./ListEditor";
import type { SerializedUI } from "@/types/websocket";

interface ChatBubbleWithUIProps {
  role: "user" | "assistant";
  content: string;
  intent?: string;
  timestamp?: string;
  isTyping?: boolean;
  ui?: SerializedUI;
  onToggleItem?: (listItemId: string) => void;
  onSelectList?: (listId: string, listName: string) => void;
  onAddItemToList?: (
    listId: string,
    itemName: string,
    quantity: number,
  ) => void;
  onRemoveItemFromList?: (listId: string, listItemId: string) => void;
}

export const ChatBubbleWithUI = memo(function ChatBubbleWithUI({
  role,
  content,
  intent,
  timestamp,
  isTyping,
  ui,
  onToggleItem,
  onSelectList,
  onAddItemToList,
  onRemoveItemFromList,
}: ChatBubbleWithUIProps) {
  const isUser = role === "user";

  return (
    <div className="flex flex-col gap-3">
      {/* Text bubble */}
      <ChatBubble
        role={role}
        content={content}
        intent={intent}
        timestamp={timestamp}
        isTyping={isTyping}
      />

      {/* UI component (only for assistant messages with UI data) */}
      {!isUser && ui && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
          className="ml-10" // Align with text bubble (avatar is 8 + gap-2)
        >
          {(() => {
            try {
              console.log(
                "[ChatBubbleWithUI] Rendering UI type:",
                ui.type,
                ui.data,
              );

              if (ui.type === "grocery-list") {
                return (
                  <GroceryListInChat
                    list={ui.data}
                    onToggleItem={onToggleItem || (() => {})}
                  />
                );
              }

              if (ui.type === "grocery-lists-overview") {
                return (
                  <GroceryListsOverview
                    data={ui.data}
                    onSelectList={(listId, listName) => {
                      onSelectList?.(listId, listName);
                    }}
                  />
                );
              }

              if (ui.type === "list-editor") {
                return (
                  <ListEditor
                    data={ui.data}
                    onToggleItem={(listItemId) => {
                      onToggleItem?.(listItemId);
                    }}
                    onRemoveItem={(listItemId) => {
                      onRemoveItemFromList?.(ui.data.list.id, listItemId);
                    }}
                    onAddItem={(itemName, quantity) => {
                      onAddItemToList?.(ui.data.list.id, itemName, quantity);
                    }}
                  />
                );
              }

              console.warn("[ChatBubbleWithUI] Unknown UI type:", ui.type);
              return (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  Unknown UI type: {ui.type}
                </div>
              );
            } catch (error) {
              console.error(
                "[ChatBubbleWithUI] Error rendering UI:",
                error,
                ui,
              );
              return (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  Error rendering component:{" "}
                  {error instanceof Error ? error.message : "Unknown error"}
                </div>
              );
            }
          })()}
        </motion.div>
      )}
    </div>
  );
});
