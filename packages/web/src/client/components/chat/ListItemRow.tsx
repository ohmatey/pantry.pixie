import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Trash2 } from "lucide-react";

interface Props {
  listItem: {
    id: string;
    name: string;
    quantity: number;
    unit?: string;
    notes?: string;
    isCompleted: boolean;
  };
  onToggle: () => void;
  onRemove: () => void;
}

export function ListItemRow({ listItem, onToggle, onRemove }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center gap-3 px-4 py-3 hover:bg-pixie-sage-50/50"
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all"
        style={{
          borderColor: listItem.isCompleted ? "#8fbc8f" : "#c8d5b9",
          backgroundColor: listItem.isCompleted ? "#8fbc8f" : "transparent",
        }}
      >
        {listItem.isCompleted && <Check className="w-3 h-3 text-white" />}
      </button>

      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-medium ${
            listItem.isCompleted
              ? "line-through text-pixie-charcoal-100"
              : "text-pixie-charcoal-300"
          }`}
        >
          {listItem.name}
        </span>
        {listItem.notes && (
          <p className="text-xs text-pixie-charcoal-100 mt-0.5 truncate">
            {listItem.notes}
          </p>
        )}
      </div>

      {/* Quantity */}
      {listItem.quantity > 1 && (
        <span className="text-xs text-pixie-charcoal-100 shrink-0">
          x{listItem.quantity}
        </span>
      )}

      {/* Remove Button */}
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="shrink-0 p-2 text-pixie-charcoal-100 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ) : (
        <div className="flex gap-1">
          <button
            onClick={() => {
              onRemove();
              setShowConfirm(false);
            }}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
          >
            Remove
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="px-2 py-1 text-xs border border-pixie-cream-200 rounded hover:bg-pixie-cream-100"
          >
            Cancel
          </button>
        </div>
      )}
    </motion.div>
  );
}
