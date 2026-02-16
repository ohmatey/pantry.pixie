import { useState, useEffect } from "react";
import { RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Notification component that appears when a new service worker version is available.
 * Prompts user to refresh to get the latest version.
 */
export function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Only runs in production (service worker only active in prod)
    if (import.meta.env.DEV) {
      return;
    }

    // Listen for service worker updates
    const checkForUpdates = async () => {
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          setRegistration(reg);

          // Check for updates when page loads
          reg.update();

          // Listen for new service worker installation
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;

            if (!newWorker) return;

            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // New service worker installed but not yet active
                // Old service worker still controlling the page
                console.log("[PWA] New version available");
                setShowPrompt(true);
              }
            });
          });

          // Listen for messages from service worker
          navigator.serviceWorker.addEventListener("message", (event) => {
            if (event.data?.type === "UPDATE_AVAILABLE") {
              setShowPrompt(true);
            }
          });

          // Check for updates periodically (every 1 hour)
          const interval = setInterval(
            () => {
              reg.update();
            },
            60 * 60 * 1000,
          ); // 1 hour

          return () => clearInterval(interval);
        } catch (error) {
          console.error("[PWA] Service worker registration failed:", error);
        }
      }
    };

    checkForUpdates();
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      // Tell the waiting service worker to skip waiting and become active
      registration.waiting.postMessage({ type: "SKIP_WAITING" });

      // Listen for controlling service worker change
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        // Reload page to get new version
        window.location.reload();
      });
    } else {
      // Fallback: just reload the page
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);

    // Show again after 1 hour if user dismisses
    setTimeout(
      () => {
        if (registration?.waiting) {
          setShowPrompt(true);
        }
      },
      60 * 60 * 1000,
    ); // 1 hour
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 z-50 max-w-sm"
      >
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                  Update Available
                </h3>
              </div>

              <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                A new version of Pantry Pixie is ready. Refresh to get the
                latest features and bug fixes.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleUpdate}
                  className="flex-1 bg-blue-600 text-white text-xs font-medium py-2 px-3 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh Now
                </button>
                <button
                  onClick={handleDismiss}
                  className="flex-1 bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 text-xs font-medium py-2 px-3 rounded-md hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors border border-blue-200 dark:border-blue-700"
                >
                  Later
                </button>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
              aria-label="Dismiss update notification"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
