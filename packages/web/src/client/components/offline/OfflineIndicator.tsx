import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { Button } from "@/components/ui/button";

export function OfflineIndicator() {
  const isOnline = useNetworkStatus();
  const { pendingCount, isProcessing, syncNow } = useSyncStatus();

  // Don't show banner when online and no pending changes
  if (isOnline && pendingCount === 0) return null;

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="sticky top-0 z-50 bg-amber-500 text-white px-4 py-2 shadow-md dark:bg-amber-600"
          role="status"
          aria-live="polite"
          data-testid="offline-indicator"
        >
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <WifiOff className="w-5 h-5 shrink-0" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="font-medium text-sm">Offline Mode</span>
                {pendingCount > 0 && (
                  <span className="text-xs opacity-90">
                    {pendingCount} change{pendingCount !== 1 ? "s" : ""} waiting
                    to sync
                  </span>
                )}
              </div>
            </div>

            {pendingCount > 0 && (
              <Button
                onClick={syncNow}
                disabled={isProcessing}
                size="sm"
                variant="ghost"
                className="bg-white/20 hover:bg-white/30 text-white border-none"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  "Retry Now"
                )}
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
