import { useState } from "react";
import { useGroceryLists } from "@/hooks/useGroceryLists";
import { GroceryListCard } from "@/components/list/GroceryListCard";
import { CreateListSheet } from "@/components/list/CreateListSheet";
import { BudgetCard } from "@/components/list/BudgetCard";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function ListPage() {
  const {
    defaultList,
    namedLists,
    isLoading,
    createList,
    deleteList,
    addItemToList,
    removeListItem,
    toggleListItem,
    resetList,
    isCreating,
    isAddingItem,
  } = useGroceryLists();

  const [sheetOpen, setSheetOpen] = useState(false);

  const handleAddItem = async (listId: string, name: string) => {
    try {
      await addItemToList(listId, name);
    } catch {
      toast.error("Failed to add item");
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await deleteList(listId);
      toast.success("List deleted");
    } catch {
      toast.error("Failed to delete list");
    }
  };

  const handleResetList = async (listId: string) => {
    try {
      await resetList(listId);
      toast.success("Round reset — all items unchecked");
    } catch {
      toast.error("Failed to reset list");
    }
  };

  const handleCreateList = async (data: {
    name: string;
    recurringSchedule?: string | null;
    scheduleDayOfWeek?: number | null;
    scheduleDayOfMonth?: number | null;
  }) => {
    try {
      await createList(data);
      toast.success(`Created "${data.name}"`);
    } catch {
      toast.error("Failed to create list");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-pixie-sage-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-pixie-cream-50 dark:bg-pixie-dusk-50">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {/* Budget Summary */}
        <BudgetCard />

        {/* Default "Quick Items" list */}
        {defaultList && (
          <GroceryListCard
            list={defaultList}
            onToggleItem={toggleListItem}
            onRemoveItem={removeListItem}
            onAddItem={handleAddItem}
            isAddingItem={isAddingItem}
          />
        )}

        {/* Named lists */}
        {namedLists.map((list) => (
          <GroceryListCard
            key={list.id}
            list={list}
            onToggleItem={toggleListItem}
            onRemoveItem={removeListItem}
            onAddItem={handleAddItem}
            onReset={handleResetList}
            onDelete={handleDeleteList}
            isAddingItem={isAddingItem}
          />
        ))}

        {/* Create list button */}
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border-2 border-dashed border-pixie-sage-300 dark:border-pixie-sage-700 text-pixie-sage-500 dark:text-pixie-glow-sage hover:bg-pixie-sage-50 dark:hover:bg-pixie-sage-900/10 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New List
        </button>
      </div>

      {/* Create list bottom sheet */}
      <CreateListSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCreate={handleCreateList}
        isCreating={isCreating}
      />
    </div>
  );
}
