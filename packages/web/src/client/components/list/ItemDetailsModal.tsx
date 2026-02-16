import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Trash2, Calendar, DollarSign, Package } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { apiFetch } from "@/lib/api";
// formatTHB and parseTHB removed - unused from "@/lib/currency";
import { toast } from "sonner";

interface Item {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category?: string;
  expiresAt?: string;
  estimatedCost?: string;
  recurrenceType?: string;
  recurrenceInterval?: number;
  notes?: string;
}

interface ItemDetailsModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: () => void;
}

const UNITS = [
  "piece",
  "gram",
  "kg",
  "ml",
  "liter",
  "oz",
  "lb",
  "cup",
  "tbsp",
  "tsp",
  "bunch",
  "dozen",
  "loaf",
  "bottle",
  "box",
  "bag",
  "package",
  "jar",
];

const CATEGORIES = [
  "dairy",
  "meat",
  "produce",
  "grains",
  "pantry",
  "frozen",
  "beverages",
  "snacks",
  "condiments",
  "spices",
  "baking",
  "other",
];

const RECURRING_INTERVALS = [
  { value: "once", label: "Not recurring" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];

/**
 * Modal for editing item details
 * Edit quantity, unit, expiration, price, and recurring settings
 */
export function ItemDetailsModal({
  item,
  isOpen,
  onClose,
  onDelete,
}: ItemDetailsModalProps) {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const containerRef = useFocusTrap(isOpen);

  const [formData, setFormData] = useState({
    quantity: item.quantity || "1",
    unit: item.unit || "piece",
    category: item.category || "other",
    expiresAt: item.expiresAt ? item.expiresAt.split("T")[0] : "",
    estimatedCost: item.estimatedCost
      ? parseFloat(item.estimatedCost).toString()
      : "",
    recurrenceType: item.recurrenceType || "once",
    notes: item.notes || "",
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Item>) => {
      return await apiFetch(
        `/api/homes/${user!.homeId}/items/${item.id}`,
        token!,
        {
          method: "PUT",
          body: JSON.stringify(updates),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Item updated");
      onClose();
    },
    onError: () => {
      toast.error("Failed to update item");
    },
  });

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = {
      quantity: parseFloat(formData.quantity) || 1,
      unit: formData.unit,
      category: formData.category,
      recurrenceType: formData.recurrenceType,
      notes: formData.notes || null,
    };

    if (formData.expiresAt) {
      updates.expiresAt = new Date(formData.expiresAt).toISOString();
    } else {
      updates.expiresAt = null;
    }

    if (formData.estimatedCost) {
      const cost = parseFloat(formData.estimatedCost);
      if (!isNaN(cost) && cost > 0) {
        updates.estimatedCost = cost;
      }
    } else {
      updates.estimatedCost = null;
    }

    updateMutation.mutate(updates);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${item.name}"?`)) {
      onDelete?.();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-pixie-dusk-100 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2
                id="modal-title"
                className="text-lg font-semibold text-pixie-charcoal-300 dark:text-pixie-mist-100"
              >
                {item.name}
              </h2>
              <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300">
                Edit item details
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {/* Quantity & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-pixie-charcoal-200 dark:text-pixie-mist-200 mb-1">
                  <Package className="w-3 h-3 inline mr-1" />
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-pixie-dusk-200 text-pixie-charcoal-300 dark:text-pixie-mist-100 text-sm focus:outline-none focus:ring-2 focus:ring-pixie-sage-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-pixie-charcoal-200 dark:text-pixie-mist-200 mb-1">
                  Unit
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-pixie-dusk-200 text-pixie-charcoal-300 dark:text-pixie-mist-100 text-sm focus:outline-none focus:ring-2 focus:ring-pixie-sage-500"
                >
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-pixie-charcoal-200 dark:text-pixie-mist-200 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-pixie-dusk-200 text-pixie-charcoal-300 dark:text-pixie-mist-100 text-sm focus:outline-none focus:ring-2 focus:ring-pixie-sage-500 capitalize"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="capitalize">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Expiration Date */}
            <div>
              <label className="block text-xs font-medium text-pixie-charcoal-200 dark:text-pixie-mist-200 mb-1">
                <Calendar className="w-3 h-3 inline mr-1" />
                Expiration Date (optional)
              </label>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(e) =>
                  setFormData({ ...formData, expiresAt: e.target.value })
                }
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-pixie-dusk-200 text-pixie-charcoal-300 dark:text-pixie-mist-100 text-sm focus:outline-none focus:ring-2 focus:ring-pixie-sage-500"
              />
            </div>

            {/* Estimated Cost */}
            <div>
              <label className="block text-xs font-medium text-pixie-charcoal-200 dark:text-pixie-mist-200 mb-1">
                <DollarSign className="w-3 h-3 inline mr-1" />
                Estimated Cost (฿)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.estimatedCost}
                onChange={(e) =>
                  setFormData({ ...formData, estimatedCost: e.target.value })
                }
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-pixie-dusk-200 text-pixie-charcoal-300 dark:text-pixie-mist-100 text-sm focus:outline-none focus:ring-2 focus:ring-pixie-sage-500"
              />
            </div>

            {/* Recurring */}
            <div>
              <label className="block text-xs font-medium text-pixie-charcoal-200 dark:text-pixie-mist-200 mb-1">
                Recurring
              </label>
              <select
                value={formData.recurrenceType}
                onChange={(e) =>
                  setFormData({ ...formData, recurrenceType: e.target.value })
                }
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-pixie-dusk-200 text-pixie-charcoal-300 dark:text-pixie-mist-100 text-sm focus:outline-none focus:ring-2 focus:ring-pixie-sage-500"
              >
                {RECURRING_INTERVALS.map((interval) => (
                  <option key={interval.value} value={interval.value}>
                    {interval.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-pixie-charcoal-200 dark:text-pixie-mist-200 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                placeholder="Add any notes about this item..."
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-pixie-dusk-200 text-pixie-charcoal-300 dark:text-pixie-mist-100 text-sm focus:outline-none focus:ring-2 focus:ring-pixie-sage-500 resize-none"
              />
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-pixie-charcoal-300 dark:text-pixie-mist-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={updateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-pixie-sage-500 hover:bg-pixie-sage-600 text-white rounded-md transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
