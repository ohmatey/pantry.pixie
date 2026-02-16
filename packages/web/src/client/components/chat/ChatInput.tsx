import { useState, useRef, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setValue("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 p-4 border-t bg-white dark:bg-pixie-dusk-100 dark:border-pixie-dusk-300"
    >
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message Pixie..."
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-xl border border-pixie-cream-300 bg-pixie-cream-50 px-4 py-2.5 text-sm placeholder:text-pixie-charcoal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pixie-sage-400 min-h-[42px] max-h-[120px] dark:border-pixie-dusk-300 dark:bg-pixie-dusk-50 dark:placeholder:text-pixie-mist-300 dark:focus-visible:ring-pixie-glow-sage"
        style={{ fieldSizing: "content" } as any}
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || !value.trim()}
        className="shrink-0 rounded-xl"
        aria-label="Send message"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
