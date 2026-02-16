import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { formatTHB, formatTHBCompact } from "@/lib/currency";

interface CategorySpending {
  category: string;
  total: number;
  itemCount: number;
  averagePerItem: number;
}

interface BudgetData {
  week: {
    total: number;
    byCategory: CategorySpending[];
    itemCount: number;
  };
  month: {
    total: number;
    byCategory: CategorySpending[];
    itemCount: number;
  };
  insights: {
    topCategory: string | null;
    weeklyAverage: number;
    monthlyAverage: number;
    trend: "increasing" | "decreasing" | "stable";
  };
}

/**
 * Budget card component showing spending summary and category breakdown
 */
export function BudgetCard() {
  const { user, token } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: budgetData, isLoading } = useQuery({
    queryKey: ["budget", user?.homeId],
    queryFn: async () => {
      const res = await apiFetch<BudgetData>(
        `/api/homes/${user!.homeId}/budget`,
        token!,
      );
      return res.data;
    },
    enabled: !!token && !!user?.homeId,
  });

  if (isLoading || !budgetData) {
    return (
      <div className="bg-white dark:bg-pixie-dusk-100 rounded-lg border border-pixie-sage-200 dark:border-pixie-sage-800 p-4 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  const { month, insights } = budgetData;
  const hasData = month.total > 0;

  if (!hasData) {
    return null; // Don't show card if no budget data
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-pixie-sage-50 to-pixie-cream-100 dark:from-pixie-sage-900/20 dark:to-pixie-dusk-100 rounded-lg border border-pixie-sage-200 dark:border-pixie-sage-800 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-pixie-sage-200 dark:bg-pixie-sage-800 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-pixie-sage-700 dark:text-pixie-glow-sage" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-pixie-charcoal-300 dark:text-pixie-mist-100">
                This Month's Spending
              </h3>
              <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300">
                {month.itemCount} items tracked
              </p>
            </div>
          </div>

          {/* Trend Indicator */}
          {insights.trend !== "stable" && (
            <div
              className={`flex items-center gap-1 text-xs font-medium ${
                insights.trend === "increasing"
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {insights.trend === "increasing" ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {insights.trend === "increasing" ? "Up" : "Down"}
            </div>
          )}
        </div>

        {/* Total Amount */}
        <div className="mb-3">
          <div className="text-3xl font-bold text-pixie-charcoal-300 dark:text-pixie-mist-100">
            {formatTHBCompact(month.total)}
          </div>
          <div className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300 mt-1">
            Weekly average: {formatTHB(insights.weeklyAverage)}
          </div>
        </div>

        {/* Top Category */}
        {insights.topCategory && (
          <div className="inline-flex items-center gap-2 bg-pixie-sage-200/50 dark:bg-pixie-sage-800/30 rounded-full px-3 py-1 text-xs">
            <span className="text-pixie-charcoal-100 dark:text-pixie-mist-300">
              Top category:
            </span>
            <span className="font-medium text-pixie-charcoal-300 dark:text-pixie-mist-100 capitalize">
              {insights.topCategory}
            </span>
          </div>
        )}

        {/* Expand/Collapse Button */}
        {month.byCategory.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs font-medium text-pixie-sage-600 dark:text-pixie-glow-sage hover:text-pixie-sage-700 dark:hover:text-pixie-sage-400 transition-colors mt-3"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide details
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                View by category
              </>
            )}
          </button>
        )}
      </div>

      {/* Category Breakdown (Collapsible) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-pixie-sage-200 dark:border-pixie-sage-800 bg-white/50 dark:bg-pixie-dusk-200/30"
          >
            <div className="p-4 space-y-2">
              {month.byCategory.map((cat) => (
                <div
                  key={cat.category}
                  className="flex items-center justify-between py-2 border-b border-pixie-sage-100 dark:border-pixie-sage-900/30 last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-pixie-charcoal-300 dark:text-pixie-mist-100 capitalize">
                      {cat.category}
                    </p>
                    <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300">
                      {cat.itemCount} {cat.itemCount === 1 ? "item" : "items"} ·
                      avg {formatTHB(cat.averagePerItem)}
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-pixie-charcoal-300 dark:text-pixie-mist-100">
                    {formatTHB(cat.total)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
