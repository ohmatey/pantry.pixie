import { motion } from "framer-motion";
import {
  ShoppingCart,
  Package,
  CalendarClock,
  HelpCircle,
  Utensils,
  Sparkles,
} from "lucide-react";

interface StarterPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

interface Prompt {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  message: string;
}

const STARTER_PROMPTS: Prompt[] = [
  {
    icon: ShoppingCart,
    text: "Add to grocery list",
    message: "We need eggs, milk, and bread",
  },
  {
    icon: Package,
    text: "Check pantry",
    message: "What's in our pantry right now?",
  },
  {
    icon: CalendarClock,
    text: "Set up recurring",
    message: "We buy milk every week",
  },
  {
    icon: Utensils,
    text: "Meal planning help",
    message: "What can I make with what we have?",
  },
  {
    icon: Sparkles,
    text: "Get suggestions",
    message: "What should we stock up on?",
  },
  {
    icon: HelpCircle,
    text: "How much spent?",
    message: "How much have we spent on groceries this month?",
  },
];

/**
 * Starter prompts component for chat empty state.
 * Shows suggested messages to help users get started.
 */
export function StarterPrompts({ onSelectPrompt }: StarterPromptsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-4 animate-bounce">✨</div>
        <h2 className="text-xl font-semibold text-pixie-charcoal-300 mb-2 font-display dark:text-pixie-mist-100">
          Hey there!
        </h2>
        <p className="text-sm text-pixie-charcoal-100 max-w-xs dark:text-pixie-mist-300">
          I'm Pixie, your pantry companion. Try one of these to get started:
        </p>
      </div>

      {/* Prompt Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
        {STARTER_PROMPTS.map((prompt, index) => {
          const Icon = prompt.icon;
          return (
            <motion.button
              key={prompt.text}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectPrompt(prompt.message)}
              className="flex items-start gap-3 p-4 rounded-lg border border-pixie-sage-200 dark:border-pixie-sage-800 bg-white dark:bg-pixie-dusk-100 hover:bg-pixie-cream-100 dark:hover:bg-pixie-dusk-200 hover:border-pixie-sage-400 dark:hover:border-pixie-sage-600 transition-all text-left group"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-pixie-sage-100 dark:bg-pixie-sage-900/30 flex items-center justify-center group-hover:bg-pixie-sage-200 dark:group-hover:bg-pixie-sage-800/50 transition-colors">
                <Icon className="w-5 h-5 text-pixie-sage-600 dark:text-pixie-glow-sage" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-pixie-charcoal-300 dark:text-pixie-mist-100 mb-1">
                  {prompt.text}
                </p>
                <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300 line-clamp-2">
                  "{prompt.message}"
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer Hint */}
      <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300 mt-6 text-center">
        Or just type your own message below
      </p>
    </div>
  );
}
