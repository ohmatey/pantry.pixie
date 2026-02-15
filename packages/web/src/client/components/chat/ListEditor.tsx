import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { ListItemRow } from "./ListItemRow";
import type { ListEditorUI } from "../../../server/ws";

interface Props {
  data: ListEditorUI;
  onToggleItem: (listItemId: string) => void;
  onRemoveItem: (listItemId: string) => void;
  onAddItem: (itemName: string, quantity: number) => void;
}

export function ListEditor({ data, onToggleItem, onRemoveItem, onAddItem }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState(1);

  const handleAdd = () => {
    if (newItemName.trim()) {
      onAddItem(newItemName.trim(), newItemQuantity);
      setNewItemName("");
      setNewItemQuantity(1);
      setIsAdding(false);
    }
  };

  const { list } = data;

  return (
    <div className="bg-white dark:bg-pixie-dusk-100 rounded-lg border border-pixie-cream-200 max-w-md shadow-pixie-soft">
      {/* Header */}
      <div className="px-4 py-3 border-b border-pixie-cream-100">
        <h3 className="font-semibold text-pixie-charcoal-300">{list.name}</h3>
        {list.description && (
          <p className="text-xs text-pixie-charcoal-100 mt-1">{list.description}</p>
        )}
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-pixie-charcoal-100">
            {list.completedItems}/{list.totalItems} completed ({list.completionPercentage}%)
          </span>
          {list.estimatedCost && (
            <span className="font-medium text-pixie-charcoal-300">
              ฿{list.estimatedCost.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className="divide-y divide-pixie-cream-100 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {list.items.map((item) => (
            <ListItemRow
              key={item.id}
              listItem={item}
              onToggle={() => onToggleItem(item.id)}
              onRemove={() => onRemoveItem(item.id)}
            />
          ))}
        </AnimatePresence>

        {list.items.length === 0 && !isAdding && (
          <div className="px-4 py-8 text-center text-sm text-pixie-charcoal-100">
            No items yet
          </div>
        )}
      </div>

      {/* Add Item Section */}
      <div className="p-4 border-t border-pixie-cream-100">
        {isAdding ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Item name..."
                className="flex-1 px-3 py-2 border border-pixie-cream-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-pixie-sage-400"
                autoFocus
              />
              <input
                type="number"
                min="1"
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                className="w-16 px-2 py-2 border border-pixie-cream-200 rounded-md text-sm text-center"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewItemName("");
                  setNewItemQuantity(1);
                }}
                className="px-3 py-1.5 text-sm text-pixie-charcoal-200 hover:text-pixie-charcoal-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="px-3 py-1.5 text-sm bg-pixie-sage-400 text-white rounded-md hover:bg-pixie-sage-500"
              >
                Add Item
              </button>
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-2 text-sm text-pixie-sage-600 hover:bg-pixie-sage-50 rounded-md flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        )}
      </div>
    </div>
  );
}
