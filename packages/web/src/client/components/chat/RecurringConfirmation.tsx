import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, Check, X } from "lucide-react";

interface RecurringConfirmationProps {
  itemName: string;
  suggestedInterval?: "daily" | "weekly" | "biweekly" | "monthly";
  onConfirm: (interval: "daily" | "weekly" | "biweekly" | "monthly") => void;
  onDismiss: () => void;
}

const INTERVAL_OPTIONS = [
  { value: "daily" as const, label: "Daily", description: "Every day" },
  { value: "weekly" as const, label: "Weekly", description: "Once a week" },
  {
    value: "biweekly" as const,
    label: "Biweekly",
    description: "Every 2 weeks",
  },
  { value: "monthly" as const, label: "Monthly", description: "Once a month" },
];

/**
 * Interactive card for confirming recurring item setup.
 * Shows when agent suggests making an item recurring.
 */
export function RecurringConfirmation({
  itemName,
  suggestedInterval = "weekly",
  onConfirm,
  onDismiss,
}: RecurringConfirmationProps) {
  const [selectedInterval, setSelectedInterval] = useState(suggestedInterval);

  const handleConfirm = () => {
    onConfirm(selectedInterval);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-pixie-sage-50 dark:bg-pixie-sage-900/20 border border-pixie-sage-200 dark:border-pixie-sage-800 rounded-lg p-4 my-2"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-pixie-sage-200 dark:bg-pixie-sage-800 flex items-center justify-center">
          <CalendarClock className="w-4 h-4 text-pixie-sage-700 dark:text-pixie-glow-sage" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-pixie-charcoal-300 dark:text-pixie-mist-100 mb-1">
            Set up recurring for {itemName}
          </h4>
          <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300">
            How often do you buy this?
          </p>
        </div>
      </div>

      {/* Interval Options */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {INTERVAL_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedInterval(option.value)}
            className={`
              p-2 rounded-md border-2 transition-all text-left
              ${
                selectedInterval === option.value
                  ? "border-pixie-sage-500 dark:border-pixie-glow-sage bg-pixie-sage-100 dark:bg-pixie-sage-800/50"
                  : "border-pixie-sage-200 dark:border-pixie-sage-700 bg-white dark:bg-pixie-dusk-100 hover:border-pixie-sage-300 dark:hover:border-pixie-sage-600"
              }
            `}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-pixie-charcoal-300 dark:text-pixie-mist-100">
                {option.label}
              </span>
              {selectedInterval === option.value && (
                <Check className="w-4 h-4 text-pixie-sage-600 dark:text-pixie-glow-sage" />
              )}
            </div>
            <span className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300">
              {option.description}
            </span>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          className="flex-1 bg-pixie-sage-500 hover:bg-pixie-sage-600 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          Confirm
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-pixie-charcoal-300 dark:text-pixie-mist-200 text-sm font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          Not now
        </button>
      </div>
    </motion.div>
  );
}
