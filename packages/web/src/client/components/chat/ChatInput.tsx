import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import { Send, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  onAttachReceipt?: (file: File) => void;
  disabled?: boolean;
  scanning?: boolean;
}

export function ChatInput({
  onSend,
  onAttachReceipt,
  disabled,
  scanning,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (file && onAttachReceipt) onAttachReceipt(file);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 p-4 border-t bg-white dark:bg-pixie-dusk-100 dark:border-pixie-dusk-300"
    >
      {onAttachReceipt && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled || scanning}
            onClick={() => fileRef.current?.click()}
            className="shrink-0 rounded-xl"
            aria-label="Scan a receipt"
          >
            {scanning ? (
              <div className="w-4 h-4 border-2 border-pixie-sage-400/40 border-t-pixie-sage-500 rounded-full animate-spin" />
            ) : (
              <ScanLine className="h-4 w-4" />
            )}
          </Button>
        </>
      )}
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message Pixie..."
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-xl border border-pixie-cream-300 bg-pixie-cream-50 px-4 py-2.5 text-sm placeholder:text-pixie-charcoal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pixie-sage-400 min-h-[42px] max-h-[120px] dark:border-pixie-dusk-300 dark:bg-pixie-dusk-50 dark:placeholder:text-pixie-mist-300 dark:focus-visible:ring-pixie-glow-sage"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
