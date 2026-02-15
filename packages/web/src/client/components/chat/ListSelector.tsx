import { useMemo } from "react";
import { useGroceryLists } from "@/hooks/useGroceryLists";
import { ChevronDown, ShoppingCart } from "lucide-react";

interface ListSelectorProps {
  selectedListId: string | null;
  onSelectList: (listId: string | null) => void;
}

export function ListSelector({ selectedListId, onSelectList }: ListSelectorProps) {
  const { lists, isLoading } = useGroceryLists();

  const selectedList = useMemo(
    () => lists.find((l) => l.id === selectedListId),
    [lists, selectedListId]
  );

  if (isLoading) {
    return (
      <div className="px-4 py-2.5 bg-gradient-to-b from-white/80 to-transparent dark:from-pixie-charcoal-900/80 dark:to-transparent backdrop-blur-sm">
        <div className="h-5 bg-pixie-mint-100 dark:bg-pixie-charcoal-700 rounded animate-pulse w-48" />
      </div>
    );
  }

  return (
    <div className="px-4 py-2.5 bg-gradient-to-b from-white/80 to-transparent dark:from-pixie-charcoal-900/80 dark:to-transparent backdrop-blur-sm border-b border-pixie-mint-100 dark:border-pixie-charcoal-700">
      <div className="relative flex items-center gap-2">
        <ShoppingCart className="h-4 w-4 text-pixie-mint-600 dark:text-pixie-mint-400 flex-shrink-0" />
        <select
          value={selectedListId || ""}
          onChange={(e) => onSelectList(e.target.value || null)}
          className="appearance-none bg-transparent border-none text-sm font-medium text-pixie-charcoal-900 dark:text-pixie-mist-100 pr-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-pixie-mint-500 rounded px-2 py-1 flex-1"
        >
          <option value="">All Lists</option>
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
              {list.isDefault ? " (Default)" : ""}
              {list.totalItems > 0 ? ` (${list.completedItems}/${list.totalItems})` : ""}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-pixie-charcoal-600 dark:text-pixie-mist-400 pointer-events-none" />
      </div>
    </div>
  );
}
