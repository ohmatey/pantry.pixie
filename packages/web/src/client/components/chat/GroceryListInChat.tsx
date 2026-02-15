import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ListItemRow } from "../list/ListItemRow";
import type { SerializedUI } from "@/types/websocket";

interface GroceryListInChatProps {
  list: SerializedUI["data"];
  onToggleItem: (listItemId: string) => void;
}

export function GroceryListInChat({ list, onToggleItem }: GroceryListInChatProps) {
  return (
    <div className="bg-white dark:bg-pixie-dusk-100 rounded-lg border border-pixie-cream-200 dark:border-pixie-dusk-300 overflow-hidden shadow-pixie-soft max-w-md">
      {/* Header */}
      <div className="px-4 py-3 border-b border-pixie-cream-100 dark:border-pixie-dusk-300">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-pixie-charcoal-300 dark:text-pixie-mist-100">
            {list.name}
          </span>
          <span className="text-xs text-pixie-charcoal-100/60 dark:text-pixie-mist-300/60">
            {list.completedItems}/{list.totalItems}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {list.totalItems > 0 && (
        <div className="px-4 pt-3 pb-2">
          <div className="h-1.5 bg-pixie-cream-200 dark:bg-pixie-dusk-300 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${list.completionPercentage}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full bg-gradient-to-r",
                list.completionPercentage >= 75
                  ? "from-pixie-sage-600 to-pixie-glow-sage"
                  : list.completionPercentage >= 50
                    ? "from-pixie-sage-500 to-pixie-sage-600"
                    : "from-pixie-sage-300 to-pixie-sage-400"
              )}
            />
          </div>
        </div>
      )}

      {/* Items */}
      {list.items.length > 0 ? (
        <div className="divide-y divide-pixie-cream-100 dark:divide-pixie-dusk-300">
          {list.items.map((item) => {
            // Transform SerializedUI item to ListItemRow format
            const listItem = {
              id: item.id,
              itemId: item.itemId,
              quantity: item.quantity,
              isCompleted: item.isCompleted,
              item: {
                id: item.itemId,
                name: item.name,
              },
            };

            return (
              <ListItemRow
                key={item.id}
                listItem={listItem as any}
                onToggle={() => onToggleItem(item.id)}
                onRemove={() => {}} // No remove in chat view
              />
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-sm text-pixie-charcoal-100/60 dark:text-pixie-mist-300/60">
          No items yet
        </div>
      )}
    </div>
  );
}
