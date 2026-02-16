import { motion } from "framer-motion";
import { CloudOff, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OfflineEmptyStateProps {
  entity: "items" | "messages" | "lists";
  onRetry?: () => void;
}

const ENTITY_CONFIG = {
  items: {
    title: "No Items Cached",
    description: "Connect to the internet to load your pantry items.",
    icon: "📦",
  },
  messages: {
    title: "No Messages Cached",
    description: "Connect to the internet to load your chat history.",
    icon: "💬",
  },
  lists: {
    title: "No Lists Cached",
    description: "Connect to the internet to load your shopping lists.",
    icon: "📝",
  },
};

export function OfflineEmptyState({ entity, onRetry }: OfflineEmptyStateProps) {
  const config = ENTITY_CONFIG[entity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      {/* Icon Stack */}
      <div className="relative mb-6">
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className="text-6xl mb-2"
        >
          {config.icon}
        </motion.div>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <CloudOff className="w-5 h-5 text-amber-600 dark:text-amber-500" />
        </div>
      </div>

      {/* Text Content */}
      <h3 className="text-xl font-display font-semibold text-pixie-charcoal-300 mb-2 dark:text-pixie-mist-100">
        {config.title}
      </h3>
      <p className="text-sm text-pixie-charcoal-200 dark:text-pixie-mist-200 mb-6 max-w-sm">
        {config.description}
      </p>

      {/* Retry Button */}
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <Wifi className="w-4 h-4" />
          Retry Connection
        </Button>
      )}

      {/* Helpful Tip */}
      <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300 mt-8">
        💡 Tip: Your changes will sync automatically when you're back online
      </p>
    </motion.div>
  );
}
