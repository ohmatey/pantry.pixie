import { useState, useRef } from "react";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddItemInputProps {
  onAdd: (name: string) => Promise<void>;
  isAdding?: boolean;
}

export function AddItemInput({ onAdd, isAdding = false }: AddItemInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isAdding) return;

    await onAdd(trimmed);
    setValue("");
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-2">
      <div className="flex items-center justify-center w-6 h-6 shrink-0">
        {isAdding ? (
          <Loader2 className="w-4 h-4 animate-spin text-pixie-sage-400" />
        ) : (
          <Plus className="w-4 h-4 text-pixie-sage-400" />
        )}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add item..."
        disabled={isAdding}
        className={cn(
          "flex-1 text-sm bg-transparent border-none outline-none",
          "placeholder:text-pixie-charcoal-100/50 dark:placeholder:text-pixie-mist-300/50",
          "text-pixie-charcoal-300 dark:text-pixie-mist-100",
          "disabled:opacity-50",
        )}
      />
    </form>
  );
}
