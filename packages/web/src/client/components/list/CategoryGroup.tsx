import { useState, useMemo, memo } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ItemRow } from "./ItemRow";
import type { Item } from "@/hooks/useItems";

const CATEGORY_LABELS: Record<string, string> = {
  produce: "Produce",
  dairy: "Dairy",
  meat: "Meat & Seafood",
  pantry: "Pantry",
  frozen: "Frozen",
  beverages: "Beverages",
  condiments: "Condiments",
  snacks: "Snacks",
  bakery: "Bakery",
  household: "Household",
  other: "Other",
};

interface CategoryGroupProps {
  category: string;
  items: Item[];
  onToggle: (id: string) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onLongPress?: () => void;
  onDelete?: (id: string) => void;
}

export const CategoryGroup = memo(function CategoryGroup({
  category,
  items,
  onToggle,
  selectionMode = false,
  selectedIds = new Set(),
  onLongPress,
  onDelete,
}: CategoryGroupProps) {
  const allChecked = items.every((i) => i.isChecked);
  const [collapsed, setCollapsed] = useState(false);

  const label = CATEGORY_LABELS[category] || category;
  const checkedCount = items.filter((i) => i.isChecked).length;

  // Sort: unchecked first, then checked (memoized)
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.isChecked === b.isChecked) return 0;
      return a.isChecked ? 1 : -1;
    });
  }, [items]);

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "flex items-center justify-between w-full px-4 py-2 text-left",
          "sticky top-0 z-10 bg-pixie-cream-50/90 backdrop-blur-sm dark:bg-pixie-dusk-50/90",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-wider",
              allChecked
                ? "text-pixie-sage-300 dark:text-pixie-mist-300/50"
                : "text-pixie-sage-600 dark:text-pixie-glow-sage",
            )}
          >
            {label}
          </span>
          <span className="text-xs text-pixie-charcoal-100/60 dark:text-pixie-mist-300/60">
            {checkedCount}/{items.length}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-pixie-charcoal-100 dark:text-pixie-mist-300 transition-transform duration-200",
            collapsed && "-rotate-90",
          )}
        />
      </button>

      {!collapsed && (
        <div className="divide-y divide-pixie-cream-200 dark:divide-pixie-dusk-300">
          {sorted.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onToggle={onToggle}
              onDelete={onDelete}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(item.id)}
              onLongPress={onLongPress}
            />
          ))}
        </div>
      )}
    </div>
  );
});
