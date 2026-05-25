import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Check, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiPost } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ReceiptReviewUI, ReceiptReviewItem } from "@/types/websocket";

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

const baht = (n: number) => `฿${n.toFixed(2)}`;

/**
 * Inline receipt review inside a chat bubble. Mirrors AddItemsSheet's editing,
 * store field and total-mismatch warning, but renders as a card and confirms
 * through the SAME /receipts/confirm funnel (which creates the receipt record).
 */
export function ReceiptReviewInChat({ data }: { data: ReceiptReviewUI }) {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<ReceiptReviewItem[]>(
    data.items.length ? data.items : [{ name: "", quantity: 1 }],
  );
  const [store, setStore] = useState(data.merchant ?? "");
  const [done, setDone] = useState(false);

  const validItems = items.filter((i) => i.name.trim());
  const itemsTotal = useMemo(
    () => validItems.reduce((sum, i) => sum + (i.price ?? 0), 0),
    [validItems],
  );
  const mismatch =
    data.total != null && data.total > 0 && Math.abs(itemsTotal - data.total) > 1;

  const confirm = useMutation({
    mutationFn: () =>
      apiPost(`/api/homes/${user!.homeId}/receipts/confirm`, token!, {
        store: store.trim() || undefined,
        total: data.total ?? undefined,
        purchasedAt: data.purchasedAt ?? undefined,
        currency: data.currency ?? undefined,
        items: validItems,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", user?.homeId] });
      queryClient.invalidateQueries({ queryKey: ["budget"] });
      queryClient.invalidateQueries({ queryKey: ["predictions"] });
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      setDone(true);
      toast.success(
        `Added ${validItems.length} item${validItems.length !== 1 ? "s" : ""} to the pantry`,
      );
    },
    onError: () => toast.error("Couldn't add the items — please try again"),
  });

  const update = (idx: number, patch: Partial<ReceiptReviewItem>) =>
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  const remove = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  if (done) {
    return (
      <div className="max-w-md rounded-2xl border border-pixie-sage-200 bg-pixie-sage-50 dark:border-pixie-dusk-300 dark:bg-pixie-dusk-100 p-4 flex items-center gap-2 text-sm text-pixie-sage-700 dark:text-pixie-glow-sage">
        <CheckCircle className="w-4 h-4 shrink-0" />
        Added {validItems.length} item{validItems.length !== 1 ? "s" : ""} to your
        pantry.
      </div>
    );
  }

  return (
    <div className="max-w-md rounded-2xl border border-pixie-cream-200 bg-white dark:border-pixie-dusk-300 dark:bg-pixie-dusk-100 overflow-hidden">
      {/* Store */}
      <div className="p-3 border-b border-pixie-cream-200 dark:border-pixie-dusk-300">
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
      <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-pixie-cream-200 dark:border-pixie-dusk-300 bg-pixie-cream-50 dark:bg-pixie-dusk-50 p-2.5 space-y-2"
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
                className="w-14 h-9 px-2 rounded-lg border border-pixie-cream-200 dark:border-pixie-dusk-300 bg-white dark:bg-pixie-dusk-200 text-sm text-center"
                aria-label="Quantity"
              />
              <select
                value={item.category ?? "other"}
                onChange={(e) => update(idx, { category: e.target.value })}
                className="flex-1 h-9 px-2 rounded-lg border border-pixie-cream-200 dark:border-pixie-dusk-300 bg-white dark:bg-pixie-dusk-200 text-sm capitalize"
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
                  className="w-20 h-9 px-2 rounded-lg border border-pixie-cream-200 dark:border-pixie-dusk-300 bg-white dark:bg-pixie-dusk-200 text-sm"
                  aria-label="Price"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={() => setItems((prev) => [...prev, { name: "", quantity: 1 }])}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-pixie-sage-300 dark:border-pixie-dusk-300 text-sm font-medium text-pixie-sage-600 dark:text-pixie-glow-sage hover:bg-pixie-sage-50 dark:hover:bg-pixie-dusk-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add item
        </button>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-pixie-cream-200 dark:border-pixie-dusk-300 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-pixie-charcoal-100 dark:text-pixie-mist-300">
            {validItems.length} item{validItems.length !== 1 ? "s" : ""} ·{" "}
            {baht(itemsTotal)}
          </span>
          {data.total != null && (
            <span className="text-pixie-charcoal-100 dark:text-pixie-mist-300">
              Receipt: {baht(data.total)}
            </span>
          )}
        </div>
        {mismatch && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Items total doesn't match the receipt — double-check prices or a
            missed line.
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
    </div>
  );
}
