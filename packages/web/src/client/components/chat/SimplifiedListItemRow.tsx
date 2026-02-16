import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface SimplifiedListItemRowProps {
  item: {
    id: string;
    itemId: string;
    name: string;
    quantity: number;
    isCompleted: boolean;
  };
  onToggle: () => void;
}

export const SimplifiedListItemRow = memo(function SimplifiedListItemRow({
  item,
  onToggle,
}: SimplifiedListItemRowProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-all duration-200",
        "hover:bg-pixie-sage-50/50 dark:hover:bg-pixie-dusk-200/50",
        item.isCompleted && "opacity-60",
      )}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${item.isCompleted ? "Uncheck" : "Check"} ${item.name}`}
        className="shrink-0 flex items-center justify-center"
      >
        <div
          className={cn(
            "flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all duration-200",
            item.isCompleted
              ? "bg-pixie-sage-400 border-pixie-sage-400 dark:bg-pixie-glow-sage dark:border-pixie-glow-sage"
              : "border-pixie-sage-300 dark:border-pixie-mist-300",
          )}
        >
          {item.isCompleted && <Check className="w-3 h-3 text-white" />}
        </div>
      </button>

      {/* Item name */}
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "text-sm font-medium transition-all duration-200",
            item.isCompleted
              ? "line-through text-pixie-charcoal-100 dark:text-pixie-mist-300"
              : "text-pixie-charcoal-300 dark:text-pixie-mist-100",
          )}
        >
          {item.name}
        </span>
      </div>

      {/* Quantity */}
      {item.quantity > 1 && (
        <span
          className={cn(
            "text-xs shrink-0",
            item.isCompleted
              ? "text-pixie-charcoal-100/50 dark:text-pixie-mist-300/50"
              : "text-pixie-charcoal-100 dark:text-pixie-mist-300",
          )}
        >
          x{item.quantity}
        </span>
      )}
    </motion.div>
  );
});
