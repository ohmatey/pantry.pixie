import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Package,
  Calendar,
  DollarSign,
  AlertTriangle,
  Repeat,
  StickyNote,
  ShoppingCart,
  Home,
} from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useItemDetails } from "@/hooks/useItemDetails";
import { cn } from "@/lib/utils";
import type { ListItemWithItem } from "@/hooks/useGroceryLists";

interface ListItemDetailsModalProps {
  listItem: ListItemWithItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRemove: (listItemId: string) => void;
}

/**
 * Read-only modal showing full item details from shopping list
 * Displays list quantity separately from inventory quantity
 * Provides "Remove from List" action (not delete from inventory)
 */
export function ListItemDetailsModal({
  listItem,
  isOpen,
  onClose,
  onRemove,
}: ListItemDetailsModalProps) {
  const containerRef = useFocusTrap(isOpen);
  const {
    data: itemDetails,
    isLoading,
    error,
  } = useItemDetails(listItem?.item.id ?? null);

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

  const handleRemove = () => {
    if (listItem) {
      onRemove(listItem.id);
      onClose();
    }
  };

  if (!isOpen || !listItem) return null;

  // Check if expiring soon (within 7 days)
  const isExpiringSoon = itemDetails?.expiresAt
    ? new Date(itemDetails.expiresAt).getTime() - Date.now() <
      7 * 24 * 60 * 60 * 1000
    : false;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

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
            <div className="flex-1 pr-4">
              <h2
                id="modal-title"
                className="text-lg font-semibold text-pixie-charcoal-300 dark:text-pixie-mist-100"
              >
                {listItem.item.name}
              </h2>
              {listItem.item.category && (
                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-pixie-sage-100 dark:bg-pixie-sage-900 text-pixie-sage-700 dark:text-pixie-sage-300 rounded-full capitalize">
                  {listItem.item.category}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-pixie-sage-200 dark:border-pixie-sage-800 border-t-pixie-sage-500 rounded-full animate-spin" />
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Failed to load item details. The item may have been deleted
                  from inventory.
                </p>
              </div>
            )}

            {/* Content */}
            {!isLoading && !error && itemDetails && (
              <>
                {/* List Details Section - Highlighted */}
                <div className="bg-pixie-sage-50 dark:bg-pixie-sage-900/20 rounded-lg p-4 border-2 border-pixie-sage-200 dark:border-pixie-sage-800">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingCart className="w-4 h-4 text-pixie-sage-600 dark:text-pixie-sage-400" />
                    <h3 className="text-sm font-semibold text-pixie-charcoal-300 dark:text-pixie-mist-100">
                      List Details
                    </h3>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-pixie-sage-600 dark:text-pixie-sage-400">
                      {listItem.quantity}
                    </span>
                    {listItem.item.unit && (
                      <span className="text-sm text-pixie-charcoal-200 dark:text-pixie-mist-300">
                        {listItem.item.unit}
                      </span>
                    )}
                    <span className="text-sm text-pixie-charcoal-100 dark:text-pixie-mist-300">
                      on this list
                    </span>
                  </div>
                  {listItem.notes && (
                    <p className="mt-2 text-sm text-pixie-charcoal-200 dark:text-pixie-mist-300">
                      Note: {listItem.notes}
                    </p>
                  )}
                </div>

                {/* Item Information Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Home className="w-4 h-4 text-pixie-charcoal-200 dark:text-pixie-mist-300" />
                    <h3 className="text-sm font-semibold text-pixie-charcoal-300 dark:text-pixie-mist-100">
                      Item Information
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {/* Inventory Quantity */}
                    <div className="flex items-start gap-3">
                      <Package className="w-4 h-4 mt-0.5 text-pixie-charcoal-200 dark:text-pixie-mist-300 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300">
                          In pantry
                        </p>
                        <p className="text-sm font-medium text-pixie-charcoal-300 dark:text-pixie-mist-100">
                          {itemDetails.quantity}{" "}
                          {itemDetails.unit || "piece(s)"}
                        </p>
                      </div>
                    </div>

                    {/* Expiration Date */}
                    {itemDetails.expiresAt && (
                      <div className="flex items-start gap-3">
                        <Calendar className="w-4 h-4 mt-0.5 text-pixie-charcoal-200 dark:text-pixie-mist-300 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300">
                            Expires
                          </p>
                          <div className="flex items-center gap-2">
                            <p
                              className={cn(
                                "text-sm font-medium",
                                isExpiringSoon
                                  ? "text-orange-600 dark:text-orange-400"
                                  : "text-pixie-charcoal-300 dark:text-pixie-mist-100",
                              )}
                            >
                              {formatDate(itemDetails.expiresAt)}
                            </p>
                            {isExpiringSoon && (
                              <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                                <AlertTriangle className="w-3 h-3" />
                                Expiring soon
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Estimated Cost */}
                    {(listItem.estimatedPrice || itemDetails.price) && (
                      <div className="flex items-start gap-3">
                        <DollarSign className="w-4 h-4 mt-0.5 text-pixie-charcoal-200 dark:text-pixie-mist-300 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300">
                            Estimated cost
                          </p>
                          <p className="text-sm font-medium text-pixie-charcoal-300 dark:text-pixie-mist-100">
                            ฿{listItem.estimatedPrice || itemDetails.price}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Recurring */}
                    {itemDetails.isRecurring &&
                      itemDetails.recurringInterval && (
                        <div className="flex items-start gap-3">
                          <Repeat className="w-4 h-4 mt-0.5 text-pixie-charcoal-200 dark:text-pixie-mist-300 shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300">
                              Recurring
                            </p>
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full capitalize">
                              {itemDetails.recurringInterval}
                            </span>
                          </div>
                        </div>
                      )}

                    {/* Notes */}
                    {itemDetails.notes && (
                      <div className="flex items-start gap-3">
                        <StickyNote className="w-4 h-4 mt-0.5 text-pixie-charcoal-200 dark:text-pixie-mist-300 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300">
                            Notes
                          </p>
                          <p className="text-sm text-pixie-charcoal-300 dark:text-pixie-mist-100 whitespace-pre-wrap">
                            {itemDetails.notes}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {itemDetails.description && (
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300 mb-1">
                          Description
                        </p>
                        <p className="text-sm text-pixie-charcoal-300 dark:text-pixie-mist-100 whitespace-pre-wrap">
                          {itemDetails.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 gap-2">
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
              Remove from List
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-pixie-sage-500 hover:bg-pixie-sage-600 text-white rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
