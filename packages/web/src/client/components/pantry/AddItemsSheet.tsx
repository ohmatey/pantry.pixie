import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Check } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

export interface ReviewItem {
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  price?: number;
}

interface AddItemsSheetProps {
  open: boolean;
  onClose: () => void;
  homeId: string;
  token: string;
  initialItems: ReviewItem[];
  initialStore?: string;
  receiptTotal?: number | null;
  onConfirmed: () => void;
}

const baht = (n: number) => `฿${n.toFixed(2)}`;

export function AddItemsSheet({
  open,
  onClose,
  homeId,
  token,
  initialItems,
  initialStore,
  receiptTotal,
  onConfirmed,
}: AddItemsSheetProps) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [store, setStore] = useState("");

  useEffect(() => {
    if (open) {
      setItems(initialItems.length ? initialItems : [{ name: "", quantity: 1 }]);
      setStore(initialStore ?? "");
    }
  }, [open, initialItems, initialStore]);

  const validItems = items.filter((i) => i.name.trim());
  const itemsTotal = useMemo(
    () => validItems.reduce((sum, i) => sum + (i.price ?? 0), 0),
    [validItems],
  );
  const mismatch =
    receiptTotal != null &&
    receiptTotal > 0 &&
    Math.abs(itemsTotal - receiptTotal) > 1;

  const confirm = useMutation({
    mutationFn: () =>
      apiPost(`/api/homes/${homeId}/receipts/confirm`, token, {
        store: store.trim() || undefined,
        items: validItems,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", homeId] });
      queryClient.invalidateQueries({ queryKey: ["budget"] });
      queryClient.invalidateQueries({ queryKey: ["predictions"] });
      toast.success(
        `Added ${validItems.length} item${validItems.length !== 1 ? "s" : ""} to the pantry`,
      );
      onConfirmed();
      onClose();
    },
    onError: () => toast.error("Couldn't add the items — please try again"),
  });

  const update = (idx: number, patch: Partial<ReviewItem>) =>
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  const remove = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-pixie-cream-50 dark:bg-pixie-dusk-50 rounded-t-3xl max-h-[90dvh] flex flex-col"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-pixie-cream-200 dark:border-pixie-dusk-300 shrink-0">
              <h2 className="text-lg font-semibold font-display text-pixie-charcoal-300 dark:text-pixie-mist-100">
                {receiptTotal != null ? "Review receipt" : "Add items"}
              </h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-pixie-cream-200 dark:hover:bg-pixie-dusk-300 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-pixie-charcoal-200 dark:text-pixie-mist-200" />
              </button>
            </div>

            {/* Store */}
            <div className="px-4 pt-3 shrink-0">
              <label className="text-xs font-medium text-pixie-charcoal-100 dark:text-pixie-mist-300 uppercase tracking-wider mb-1 block">
                Store (optional)
              </label>
              <Input
                value={store}
                onChange={(e) => setStore(e.target.value)}
                placeholder="e.g. Big C, wet market, Villa"
              />
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-pixie-cream-200 dark:border-pixie-dusk-300 bg-white dark:bg-pixie-dusk-100 p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={item.name}
                      onChange={(e) => update(idx, { name: e.target.value })}
                      placeholder="Item name"
                      className="flex-1"
                    />
                    <button
                      onClick={() => remove(idx)}
                      className="p-2 text-pixie-charcoal-100 dark:text-pixie-mist-300 hover:text-red-500 transition-colors"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        update(idx, { quantity: Number(e.target.value) || 1 })
                      }
                      className="w-16 h-9 px-2 rounded-lg border border-pixie-cream-200 dark:border-pixie-dusk-300 bg-pixie-cream-50 dark:bg-pixie-dusk-200 text-sm text-center"
                      aria-label="Quantity"
                    />
                    <select
                      value={item.category ?? "other"}
                      onChange={(e) => update(idx, { category: e.target.value })}
                      className="flex-1 h-9 px-2 rounded-lg border border-pixie-cream-200 dark:border-pixie-dusk-300 bg-pixie-cream-50 dark:bg-pixie-dusk-200 text-sm capitalize"
                      aria-label="Category"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-pixie-charcoal-100 dark:text-pixie-mist-300">
                        ฿
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.price ?? ""}
                        onChange={(e) =>
                          update(idx, {
                            price:
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                          })
                        }
                        placeholder="0.00"
                        className="w-20 h-9 px-2 rounded-lg border border-pixie-cream-200 dark:border-pixie-dusk-300 bg-pixie-cream-50 dark:bg-pixie-dusk-200 text-sm"
                        aria-label="Price"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() =>
                  setItems((prev) => [...prev, { name: "", quantity: 1 }])
                }
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-dashed border-pixie-sage-300 dark:border-pixie-dusk-300 text-sm font-medium text-pixie-sage-600 dark:text-pixie-glow-sage hover:bg-pixie-sage-50 dark:hover:bg-pixie-dusk-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add item
              </button>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-pixie-cream-200 dark:border-pixie-dusk-300 bg-white dark:bg-pixie-dusk-100 shrink-0 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-pixie-charcoal-100 dark:text-pixie-mist-300">
                  {validItems.length} item{validItems.length !== 1 ? "s" : ""} ·{" "}
                  {baht(itemsTotal)}
                </span>
                {receiptTotal != null && (
                  <span className="text-pixie-charcoal-100 dark:text-pixie-mist-300">
                    Receipt: {baht(receiptTotal)}
                  </span>
                )}
              </div>
              {mismatch && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Items total doesn't match the receipt — double-check prices or
                  a missed line.
                </p>
              )}
              <Button
                onClick={() => confirm.mutate()}
                disabled={validItems.length === 0 || confirm.isPending}
                className="w-full flex items-center justify-center gap-2"
              >
                {confirm.isPending ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Add to pantry
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
