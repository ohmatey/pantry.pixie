import { useState, useRef, memo } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, Trash2 } from "lucide-react";
import { ItemDetailsModal } from "./ItemDetailsModal";
import { toast } from "sonner";
import type { Item } from "@/hooks/useItems";

interface ItemRowProps {
  item: Item;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onLongPress?: () => void;
}

export const ItemRow = memo(function ItemRow({
  item,
  onToggle,
  onDelete,
  selectionMode = false,
  isSelected = false,
  onLongPress,
}: ItemRowProps) {
  const [animating, setAnimating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const prevChecked = useRef(item.isChecked);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Swipe gesture state
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-150, -50, 0], [1, 0.8, 1]);
  const deleteButtonOpacity = useTransform(x, [-150, -50, 0], [1, 0.5, 0]);

  // Detect when checked state changes (optimistic update from parent)
  if (item.isChecked !== prevChecked.current) {
    prevChecked.current = item.isChecked;
    if (!animating) {
      setAnimating(true);
    }
  }

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAnimating(true);
    onToggle(item.id);
  };

  const handleItemClick = () => {
    setShowModal(true);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(item.id);
      toast.success(`Deleted ${item.name}`, {
        action: {
          label: 'Undo',
          onClick: () => {
            // TODO: Implement undo
            toast.info('Undo not yet implemented');
          },
        },
      });
    }
  };

  const handlePanStart = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePan = (event: PointerEvent, info: PanInfo) => {
    // Only allow left swipe (negative offset)
    if (info.offset.x < 0) {
      x.set(info.offset.x);
    }
  };

  const handlePanEnd = (event: PointerEvent, info: PanInfo) => {
    // If swiped more than 100px, trigger delete confirmation
    if (info.offset.x < -100) {
      setShowDeleteConfirm(true);
      x.set(0);
    } else {
      // Snap back
      x.set(0);
    }
  };

  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      if (!selectionMode && onLongPress) {
        onLongPress();
      } else {
        setShowDeleteConfirm(true);
      }
    }, 500); // 500ms long press
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
        {/* Delete button (revealed by swipe) */}
        <motion.div
          style={{ opacity: deleteButtonOpacity }}
          className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 dark:bg-red-600 flex items-center justify-center pointer-events-none"
        >
          <Trash2 className="w-5 h-5 text-white" />
        </motion.div>

        {/* Swipeable item row */}
        <motion.div
          style={!selectionMode ? { x, opacity } : {}}
          drag={!selectionMode ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onPanStart={handlePanStart}
          onPan={handlePan}
          onPanEnd={handlePanEnd}
          onPointerDown={handleLongPressStart}
          onPointerUp={handleLongPressEnd}
          onPointerCancel={handleLongPressEnd}
          className={cn(
            "flex items-center gap-3 w-full px-4 py-3 min-h-[56px] text-left transition-all duration-200 bg-white dark:bg-pixie-dusk-100",
            "hover:bg-pixie-sage-50/50 dark:hover:bg-pixie-dusk-200/50",
            item.isChecked && !selectionMode && "opacity-60",
            selectionMode && isSelected && "bg-pixie-sage-50 dark:bg-pixie-sage-900/20"
          )}
          data-testid="item-row"
        >
          {/* Selection mode checkbox OR regular checkbox */}
          {selectionMode ? (
            <button
              type="button"
              onClick={handleCheckboxClick}
              className="relative shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
              aria-label={`${isSelected ? 'Deselect' : 'Select'} ${item.name}`}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded border-2 transition-all duration-200",
                  isSelected
                    ? "bg-pixie-sage-500 border-pixie-sage-500 dark:bg-pixie-glow-sage dark:border-pixie-glow-sage"
                    : "border-gray-300 dark:border-gray-600"
                )}
              >
                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCheckboxClick}
              aria-label={`${item.isChecked ? 'Uncheck' : 'Check'} ${item.name}`}
              aria-pressed={item.isChecked}
              className="relative shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
            >
              <div
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-200",
                  item.isChecked
                    ? "bg-pixie-sage-400 border-pixie-sage-400 dark:bg-pixie-glow-sage dark:border-pixie-glow-sage"
                    : "border-pixie-sage-300 dark:border-pixie-mist-300",
                  animating && item.isChecked && "animate-[check-pop_0.4s_ease-out]"
                )}
                onAnimationEnd={() => setAnimating(false)}
                data-testid="item-checkbox"
              >
                {item.isChecked && (
                  <Check
                    className={cn(
                      "w-3.5 h-3.5 text-white",
                      animating && "animate-[check-draw_0.3s_ease-out_0.1s_both]"
                    )}
                  />
                )}
              </div>
              {/* Ripple ring on check */}
              {animating && item.isChecked && (
                <div className="absolute inset-0 rounded-full border-2 border-pixie-sage-400/60 dark:border-pixie-glow-sage/60 animate-[check-ripple_0.5s_ease-out_forwards]" />
              )}
            </button>
          )}

          {/* Item info (clickable) */}
          <button
            onClick={handleItemClick}
            className="flex-1 min-w-0 text-left"
          >
            <span
              className={cn(
                "text-sm font-medium transition-all duration-200",
                item.isChecked
                  ? "line-through text-pixie-charcoal-100 dark:text-pixie-mist-300"
                  : "text-pixie-charcoal-300 dark:text-pixie-mist-100"
              )}
            >
              {item.name}
            </span>
          </button>

          {/* Quantity (clickable) */}
          {item.quantity > 0 && (
            <button
              onClick={handleItemClick}
              className={cn(
                "text-xs shrink-0 transition-opacity duration-200",
                item.isChecked
                  ? "text-pixie-charcoal-100/50 dark:text-pixie-mist-300/50"
                  : "text-pixie-charcoal-100 dark:text-pixie-mist-300"
              )}
            >
              {item.quantity} {item.unit || ""}
            </button>
          )}
        </motion.div>
      </div>

      {/* Delete confirmation toast */}
      {showDeleteConfirm && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-pixie-charcoal-300 dark:bg-pixie-dusk-300 text-white rounded-lg shadow-xl p-4 flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <span className="text-sm">Delete {item.name}?</span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                handleDelete();
                setShowDeleteConfirm(false);
              }}
              className="px-3 py-1 text-xs font-medium bg-red-500 hover:bg-red-600 rounded-md transition-colors"
            >
              Delete
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

      {/* Item details modal */}
      <ItemDetailsModal
        item={item}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onDelete={() => onDelete?.(item.id)}
      />
    </>
  );
});
