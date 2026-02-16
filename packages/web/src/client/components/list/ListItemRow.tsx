import { useState, useRef, memo } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, Trash2 } from "lucide-react";
import type { ListItemWithItem } from "@/hooks/useGroceryLists";
import { ListItemDetailsModal } from "./ListItemDetailsModal";

interface ListItemRowProps {
  listItem: ListItemWithItem;
  onToggle: (listItemId: string) => void;
  onRemove: (listItemId: string) => void;
}

export const ListItemRow = memo(function ListItemRow({
  listItem,
  onToggle,
  onRemove,
}: ListItemRowProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isPanning = useRef(false);

  const x = useMotionValue(0);
  const opacity = useTransform(x, [-150, -50, 0], [1, 0.8, 1]);
  const deleteButtonOpacity = useTransform(x, [-150, -50, 0], [1, 0.5, 0]);

  const handlePanStart = () => {
    isPanning.current = true;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePan = (_: PointerEvent, info: PanInfo) => {
    if (info.offset.x < 0) {
      x.set(info.offset.x);
    }
  };

  const handlePanEnd = (_: PointerEvent, info: PanInfo) => {
    if (info.offset.x < -100) {
      setShowDeleteConfirm(true);
    }
    x.set(0);
    // Small delay to prevent click after pan
    setTimeout(() => {
      isPanning.current = false;
    }, 100);
  };

  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowDeleteConfirm(true);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <>
      <div className="relative overflow-hidden">
        <motion.div
          style={{ opacity: deleteButtonOpacity }}
          className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 dark:bg-red-600 flex items-center justify-center pointer-events-none"
        >
          <Trash2 className="w-5 h-5 text-white" />
        </motion.div>

        <motion.div
          style={{ x, opacity }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onPanStart={handlePanStart}
          onPan={handlePan}
          onPanEnd={handlePanEnd}
          onPointerDown={handleLongPressStart}
          onPointerUp={handleLongPressEnd}
          onPointerCancel={handleLongPressEnd}
          className={cn(
            "flex items-center gap-3 w-full px-4 py-3 min-h-[48px] text-left transition-all duration-200 bg-white dark:bg-pixie-dusk-100",
            "hover:bg-pixie-sage-50/50 dark:hover:bg-pixie-dusk-200/50",
            listItem.isCompleted && "opacity-60",
          )}
        >
          {/* Checkbox */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(listItem.id);
            }}
            aria-label={`${listItem.isCompleted ? "Uncheck" : "Check"} ${listItem.item.name}`}
            className="relative shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
          >
            <div
              className={cn(
                "flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all duration-200",
                listItem.isCompleted
                  ? "bg-pixie-sage-400 border-pixie-sage-400 dark:bg-pixie-glow-sage dark:border-pixie-glow-sage"
                  : "border-pixie-sage-300 dark:border-pixie-mist-300",
              )}
            >
              {listItem.isCompleted && <Check className="w-3 h-3 text-white" />}
            </div>
          </button>

          {/* Item name - Clickable */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!isPanning.current) {
                setShowModal(true);
              }
            }}
            className="flex-1 text-left min-h-[44px] flex items-center"
          >
            <span
              className={cn(
                "text-sm font-medium transition-all duration-200",
                listItem.isCompleted
                  ? "line-through text-pixie-charcoal-100 dark:text-pixie-mist-300"
                  : "text-pixie-charcoal-300 dark:text-pixie-mist-100",
              )}
            >
              {listItem.item.name}
            </span>
          </button>

          {/* Quantity - Clickable */}
          {listItem.quantity > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!isPanning.current) {
                  setShowModal(true);
                }
              }}
              className="min-w-[44px] min-h-[44px] flex items-center justify-end shrink-0"
            >
              <span
                className={cn(
                  "text-xs",
                  listItem.isCompleted
                    ? "text-pixie-charcoal-100/50 dark:text-pixie-mist-300/50"
                    : "text-pixie-charcoal-100 dark:text-pixie-mist-300",
                )}
              >
                x{listItem.quantity}
              </span>
            </button>
          )}
        </motion.div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-pixie-charcoal-300 dark:bg-pixie-dusk-300 text-white rounded-lg shadow-xl p-4 flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <span className="text-sm">Remove {listItem.item.name}?</span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onRemove(listItem.id);
                setShowDeleteConfirm(false);
              }}
              className="px-3 py-1 text-xs font-medium bg-red-500 hover:bg-red-600 rounded-md transition-colors"
            >
              Remove
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-700 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Item Details Modal */}
      <ListItemDetailsModal
        listItem={listItem}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onRemove={onRemove}
      />
    </>
  );
});
