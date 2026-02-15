import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateListSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    recurringSchedule?: string | null;
    scheduleDayOfWeek?: number | null;
    scheduleDayOfMonth?: number | null;
  }) => Promise<void>;
  isCreating?: boolean;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CreateListSheet({
  isOpen,
  onClose,
  onCreate,
  isCreating = false,
}: CreateListSheetProps) {
  const [name, setName] = useState("");
  const [hasSchedule, setHasSchedule] = useState(false);
  const [frequency, setFrequency] = useState<string>("weekly");
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [dayOfMonth, setDayOfMonth] = useState(1);

  const reset = () => {
    setName("");
    setHasSchedule(false);
    setFrequency("weekly");
    setDayOfWeek(0);
    setDayOfMonth(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isCreating) return;

    await onCreate({
      name: name.trim(),
      recurringSchedule: hasSchedule ? frequency : null,
      scheduleDayOfWeek:
        hasSchedule && (frequency === "weekly" || frequency === "biweekly")
          ? dayOfWeek
          : null,
      scheduleDayOfMonth:
        hasSchedule && frequency === "monthly" ? dayOfMonth : null,
    });

    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-pixie-dusk-100 rounded-t-2xl shadow-xl max-h-[85vh] overflow-y-auto"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2">
              <h2 className="text-lg font-semibold text-pixie-charcoal-300 dark:text-pixie-mist-100">
                New List
              </h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-pixie-dusk-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-pixie-charcoal-200 dark:text-pixie-mist-200" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-4 pb-8 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-pixie-charcoal-200 dark:text-pixie-mist-200 mb-1.5">
                  List Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Weekly Groceries"
                  autoFocus
                  className={cn(
                    "w-full px-3 py-2.5 rounded-lg border border-pixie-cream-200 dark:border-pixie-dusk-300",
                    "bg-white dark:bg-pixie-dusk-200 text-pixie-charcoal-300 dark:text-pixie-mist-100",
                    "placeholder:text-pixie-charcoal-100/50 dark:placeholder:text-pixie-mist-300/50",
                    "focus:outline-none focus:ring-2 focus:ring-pixie-sage-400 dark:focus:ring-pixie-glow-sage",
                    "text-sm"
                  )}
                />
              </div>

              {/* Schedule toggle */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className={cn(
                      "relative w-10 h-6 rounded-full transition-colors",
                      hasSchedule
                        ? "bg-pixie-sage-500 dark:bg-pixie-glow-sage"
                        : "bg-gray-300 dark:bg-gray-600"
                    )}
                    onClick={() => setHasSchedule(!hasSchedule)}
                  >
                    <motion.div
                      animate={{ x: hasSchedule ? 18 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                    />
                  </div>
                  <span className="text-sm font-medium text-pixie-charcoal-200 dark:text-pixie-mist-200">
                    Recurring schedule
                  </span>
                </label>
              </div>

              {/* Schedule options */}
              <AnimatePresence>
                {hasSchedule && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 overflow-hidden"
                  >
                    {/* Frequency */}
                    <div>
                      <label className="block text-xs font-medium text-pixie-charcoal-100 dark:text-pixie-mist-300 mb-2">
                        Frequency
                      </label>
                      <div className="flex gap-2">
                        {(["weekly", "biweekly", "monthly"] as const).map(
                          (f) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => setFrequency(f)}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                                frequency === f
                                  ? "bg-pixie-sage-500 dark:bg-pixie-glow-sage text-white"
                                  : "bg-pixie-cream-100 dark:bg-pixie-dusk-200 text-pixie-charcoal-200 dark:text-pixie-mist-200"
                              )}
                            >
                              {f === "biweekly"
                                ? "Biweekly"
                                : f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Day picker */}
                    {(frequency === "weekly" || frequency === "biweekly") && (
                      <div>
                        <label className="block text-xs font-medium text-pixie-charcoal-100 dark:text-pixie-mist-300 mb-2">
                          Reset day
                        </label>
                        <div className="flex gap-1.5">
                          {DAY_NAMES.map((day, i) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => setDayOfWeek(i)}
                              className={cn(
                                "w-9 h-9 rounded-full text-xs font-medium transition-colors",
                                dayOfWeek === i
                                  ? "bg-pixie-sage-500 dark:bg-pixie-glow-sage text-white"
                                  : "bg-pixie-cream-100 dark:bg-pixie-dusk-200 text-pixie-charcoal-200 dark:text-pixie-mist-200"
                              )}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {frequency === "monthly" && (
                      <div>
                        <label className="block text-xs font-medium text-pixie-charcoal-100 dark:text-pixie-mist-300 mb-2">
                          Reset day of month
                        </label>
                        <select
                          value={dayOfMonth}
                          onChange={(e) =>
                            setDayOfMonth(parseInt(e.target.value))
                          }
                          className={cn(
                            "px-3 py-2 rounded-lg border border-pixie-cream-200 dark:border-pixie-dusk-300",
                            "bg-white dark:bg-pixie-dusk-200 text-pixie-charcoal-300 dark:text-pixie-mist-100",
                            "text-sm focus:outline-none focus:ring-2 focus:ring-pixie-sage-400"
                          )}
                        >
                          {Array.from({ length: 28 }, (_, i) => i + 1).map(
                            (d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <button
                type="submit"
                disabled={!name.trim() || isCreating}
                className={cn(
                  "w-full py-3 rounded-lg text-sm font-semibold transition-colors",
                  "bg-pixie-sage-500 hover:bg-pixie-sage-600 dark:bg-pixie-glow-sage dark:hover:bg-pixie-sage-500 text-white",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isCreating ? "Creating..." : "Create List"}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
