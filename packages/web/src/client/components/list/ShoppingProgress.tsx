import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ShoppingProgressProps {
  checked: number;
  total: number;
}

export function ShoppingProgress({ checked, total }: ShoppingProgressProps) {
  if (total === 0) return null;

  const percentage = (checked / total) * 100;

  // Milestone messages based on progress
  const milestone =
    percentage === 100 ? "All done! 🎉" :
    percentage >= 75 ? "Almost there!" :
    percentage >= 50 ? "Halfway done!" :
    percentage >= 25 ? "Great start!" :
    "Let's do this!";

  // Color gradient based on progress
  const progressColor =
    percentage >= 75 ? "from-pixie-sage-600 to-pixie-glow-sage" :
    percentage >= 50 ? "from-pixie-sage-500 to-pixie-sage-600" :
    percentage >= 25 ? "from-pixie-sage-400 to-pixie-sage-500" :
    "from-pixie-sage-300 to-pixie-sage-400";

  return (
    <div className="px-4 py-3 border-b border-pixie-cream-200 dark:border-pixie-dusk-300">
      <div className="space-y-2">
        {/* Milestone and count */}
        <div className="flex justify-between items-center">
          <motion.span
            key={milestone} // Re-animate when milestone changes
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-medium text-pixie-charcoal-200 dark:text-pixie-mist-200"
          >
            {milestone}
          </motion.span>
          <span className="text-sm font-semibold text-pixie-sage-600 dark:text-pixie-glow-sage">
            {checked}/{total}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-pixie-cream-200 rounded-full overflow-hidden dark:bg-pixie-dusk-300">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full bg-gradient-to-r",
              progressColor,
              percentage === 100 && "shadow-lg shadow-pixie-sage-500/50"
            )}
          />
        </div>
      </div>
    </div>
  );
}
