import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  MoreHorizontal,
  RotateCcw,
  Pencil,
  Trash2,
} from "lucide-react";
import { ScheduleBadge } from "./ScheduleBadge";
import { ListItemRow } from "./ListItemRow";
import { AddItemInput } from "./AddItemInput";
import type { GroceryListWithItems } from "@/hooks/useGroceryLists";

interface GroceryListCardProps {
  list: GroceryListWithItems;
  onToggleItem: (listId: string, listItemId: string) => void;
  onRemoveItem: (listId: string, listItemId: string) => void;
  onAddItem: (listId: string, name: string) => Promise<void>;
  onReset?: (listId: string) => void;
  onEdit?: (listId: string) => void;
  onDelete?: (listId: string) => void;
  isAddingItem?: boolean;
}

export function GroceryListCard({
  list,
  onToggleItem,
  onRemoveItem,
  onAddItem,
  onReset,
  onEdit,
  onDelete,
  isAddingItem = false,
}: GroceryListCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const hasSchedule = !!list.recurringSchedule;
  const canDelete = !list.isDefault;

  return (
    <div className="bg-white dark:bg-pixie-dusk-100 rounded-lg border border-pixie-cream-200 dark:border-pixie-dusk-300 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm font-semibold text-pixie-charcoal-300 dark:text-pixie-mist-100 truncate">
            {list.name}
          </span>
          {hasSchedule && (
            <ScheduleBadge
              schedule={list.recurringSchedule!}
              roundNumber={list.roundNumber}
            />
          )}
          <span className="text-xs text-pixie-charcoal-100/60 dark:text-pixie-mist-300/60 shrink-0">
            {list.completedItems}/{list.totalItems}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Menu button */}
          {(canDelete || hasSchedule || onEdit) && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1.5 hover:bg-pixie-sage-50 dark:hover:bg-pixie-dusk-200 rounded-md transition-colors cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4 text-pixie-charcoal-100 dark:text-pixie-mist-300" />
            </div>
          )}

          <ChevronDown
            className={cn(
              "w-4 h-4 text-pixie-charcoal-100 dark:text-pixie-mist-300 transition-transform duration-200",
              collapsed && "-rotate-90",
            )}
          />
        </div>
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute right-4 z-50 bg-white dark:bg-pixie-dusk-200 rounded-lg shadow-lg border border-pixie-cream-200 dark:border-pixie-dusk-300 py-1 min-w-[160px]"
            >
              {onEdit && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(list.id);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-pixie-charcoal-300 dark:text-pixie-mist-100 hover:bg-pixie-sage-50 dark:hover:bg-pixie-dusk-300 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
              )}
              {hasSchedule && onReset && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onReset(list.id);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-pixie-charcoal-300 dark:text-pixie-mist-100 hover:bg-pixie-sage-50 dark:hover:bg-pixie-dusk-300 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset Round
                </button>
              )}
              {canDelete && onDelete && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(list.id);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete List
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Progress bar (inline) */}
      {!collapsed && list.totalItems > 0 && (
        <div className="px-4 pb-2">
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
                    : "from-pixie-sage-300 to-pixie-sage-400",
              )}
            />
          </div>
        </div>
      )}

      {/* Items */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="divide-y divide-pixie-cream-100 dark:divide-pixie-dusk-300">
              {list.items.map((listItem) => (
                <ListItemRow
                  key={listItem.id}
                  listItem={listItem}
                  onToggle={(id) => onToggleItem(list.id, id)}
                  onRemove={(id) => onRemoveItem(list.id, id)}
                />
              ))}
            </div>

            {/* Add item input */}
            <div className="border-t border-pixie-cream-100 dark:border-pixie-dusk-300">
              <AddItemInput
                onAdd={(name) => onAddItem(list.id, name)}
                isAdding={isAddingItem}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
