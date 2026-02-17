import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { CategoryGroup } from "@/components/list/CategoryGroup";
import { Input } from "@/components/ui/input";
import { Search, Package, MessageSquarePlus, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Item } from "@/hooks/useItems";
import { toast } from "sonner";

export default function PantryPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["items", user?.homeId, search, categoryFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      const qs = params.toString() ? `?${params.toString()}` : "";
      return apiFetch<Item[]>(
        `/api/homes/${user!.homeId}/items${qs}`,
        token!,
      );
    },
    enabled: !!token && !!user?.homeId,
  });

  const toggleItem = useMutation({
    mutationFn: (itemId: string) =>
      apiFetch(
        `/api/homes/${user!.homeId}/items/${itemId}/toggle`,
        token!,
        { method: "PATCH" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", user?.homeId] });
    },
    onError: () => toast.error("Failed to update item"),
  });

  const deleteItem = useMutation({
    mutationFn: (itemId: string) =>
      apiFetch(
        `/api/homes/${user!.homeId}/items/${itemId}`,
        token!,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", user?.homeId] });
      toast.success("Item removed");
    },
    onError: () => toast.error("Failed to remove item"),
  });

  const items: Item[] = data?.data ?? [];

  // Group items by category
  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const cat = item.category || "other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return map;
  }, [items]);

  // Items expiring soon
  const expiringSoon = useMemo(() => {
    const now = Date.now();
    return items.filter((item) => {
      if (!item.expiresAt) return false;
      const expiresAt = new Date(item.expiresAt).getTime();
      const warningDays = 5;
      const warningMs = warningDays * 24 * 60 * 60 * 1000;
      return expiresAt - now <= warningMs && expiresAt > now;
    });
  }, [items]);

  const categories = [...new Set(items.map((i) => i.category || "other"))].sort();

  return (
    <div className="flex flex-col h-full bg-pixie-cream-50 dark:bg-pixie-dusk-50">
      {/* Header */}
      <div className="p-4 pb-2 space-y-3 border-b border-pixie-cream-200 dark:border-pixie-dusk-300 bg-white dark:bg-pixie-dusk-100 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold font-display text-pixie-charcoal-300 dark:text-pixie-mist-100">
            Pantry
          </h2>
          {items.length > 0 && (
            <span className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pixie-charcoal-100 dark:text-pixie-mist-300" />
          <Input
            placeholder="Search pantry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-pixie-cream-50 dark:bg-pixie-dusk-200 border-pixie-cream-200 dark:border-pixie-dusk-300"
          />
        </div>

        {/* Category filter pills */}
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                !categoryFilter
                  ? "bg-pixie-sage-500 text-white"
                  : "bg-pixie-cream-200 dark:bg-pixie-dusk-200 text-pixie-charcoal-200 dark:text-pixie-mist-200"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                  categoryFilter === cat
                    ? "bg-pixie-sage-500 text-white"
                    : "bg-pixie-cream-200 dark:bg-pixie-dusk-200 text-pixie-charcoal-200 dark:text-pixie-mist-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Expiry warnings */}
      {expiringSoon.length > 0 && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700 dark:text-amber-400">
            <span className="font-medium">Expiring soon: </span>
            {expiringSoon.map((i) => i.name).join(", ")}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-pixie-charcoal-100 dark:text-pixie-mist-300">
            <div className="animate-spin w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-pixie-sage-100 dark:bg-pixie-dusk-200 flex items-center justify-center">
              <Package className="w-8 h-8 text-pixie-sage-400 dark:text-pixie-glow-sage" />
            </div>
            <div>
              <p className="text-base font-medium text-pixie-charcoal-200 dark:text-pixie-mist-100 mb-1">
                Your pantry is empty
              </p>
              <p className="text-sm text-pixie-charcoal-100 dark:text-pixie-mist-300">
                Ask Pixie to add items to your pantry
              </p>
            </div>
            <button
              onClick={() => navigate("/chats")}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-pixie-sage-500 text-white text-sm font-medium"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Chat with Pixie
            </button>
          </div>
        ) : (
          <div className="pb-4">
            {[...grouped.entries()].map(([category, categoryItems]) => (
              <CategoryGroup
                key={category}
                category={category}
                items={categoryItems}
                onToggle={(id) => toggleItem.mutate(id)}
                onDelete={(id) => deleteItem.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
