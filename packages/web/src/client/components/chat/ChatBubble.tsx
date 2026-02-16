import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles } from "lucide-react";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  intent?: string;
  timestamp?: string;
  isTyping?: boolean;
}

export const ChatBubble = memo(function ChatBubble({
  role,
  content,
  intent,
  timestamp,
  isTyping,
}: ChatBubbleProps) {
  const isUser = role === "user";

  // Don't render empty bubbles (but allow empty assistant bubbles during typing)
  if (!content && !isTyping) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 20 : -20, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex gap-2 max-w-[85%]",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto",
      )}
    >
      {!isUser && (
        <motion.div
          animate={isTyping ? { scale: [1, 1.05, 1] } : {}}
          transition={
            isTyping ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}
          }
        >
          <Avatar className="h-8 w-8 shrink-0 mt-1">
            <AvatarFallback className="bg-gradient-to-br from-pixie-sage-500 to-pixie-sage-600 text-white text-xs dark:from-pixie-glow-sage dark:to-pixie-sage-500">
              <Sparkles className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
        </motion.div>
      )}

      <div>
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-pixie-soft",
            isUser
              ? "bg-gradient-to-br from-pixie-sage-500 to-pixie-sage-600 text-white rounded-br-md dark:from-pixie-glow-sage dark:to-pixie-sage-500"
              : "bg-pixie-cream-100 text-pixie-charcoal-300 rounded-bl-md dark:bg-pixie-dusk-200 dark:text-pixie-mist-100",
          )}
        >
          {content || (isTyping && "...")}
        </motion.div>

        {intent && intent !== "other" && !isUser && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[10px] text-pixie-charcoal-100 mt-1 ml-1 block dark:text-pixie-mist-300"
          >
            {intent.replace(/_/g, " ")}
          </motion.span>
        )}

        {timestamp && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[10px] text-pixie-charcoal-100 mt-1 ml-1 block dark:text-pixie-mist-300"
          >
            {timestamp}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
});
