import { motion } from "framer-motion";
import { ShoppingCart, Check } from "lucide-react";
import type { GroceryListsOverviewUI } from "@/types/websocket";

interface Props {
  data: GroceryListsOverviewUI;
  onSelectList: (listId: string, listName: string) => void;
}

export function GroceryListsOverview({ data, onSelectList }: Props) {
  return (
    <div className="space-y-3 max-w-2xl">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-pixie-charcoal-300">
          Your Lists ({data.lists.length})
        </h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {data.lists.map((list) => (
          <motion.button
            key={list.id}
            onClick={() => onSelectList(list.id, list.name)}
            className="bg-white dark:bg-pixie-dusk-100 rounded-lg border border-pixie-cream-200 p-4 text-left hover:shadow-md hover:border-pixie-sage-300 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-pixie-charcoal-300 truncate">
                  {list.name}
                </h4>
                {list.description && (
                  <p className="text-xs text-pixie-charcoal-100 mt-1 line-clamp-2">
                    {list.description}
                  </p>
                )}
              </div>
              <ShoppingCart className="w-5 h-5 text-pixie-sage-400 ml-2 shrink-0" />
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-pixie-cream-200 rounded-full mb-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${list.completionPercentage}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  list.completionPercentage >= 75 ? "bg-pixie-sage-600" :
                  list.completionPercentage >= 50 ? "bg-pixie-sage-500" :
                  "bg-pixie-sage-300"
                }`}
              />
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-pixie-charcoal-100">
                <Check className="w-3 h-3 inline mr-1" />
                {list.completedItems}/{list.totalItems} completed
              </span>
              {list.estimatedCost && (
                <span className="font-medium text-pixie-charcoal-300">
                  ฿{list.estimatedCost.toFixed(2)}
                </span>
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {data.lists.length === 0 && (
        <div className="text-center py-8 text-sm text-pixie-charcoal-100">
          No lists yet. Try saying "Create a grocery list"
        </div>
      )}
    </div>
  );
}
