import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Toast-style prompt that appears when PWA can be installed.
 * Shows platform-specific instructions (iOS vs Android).
 * Dismissible and respects user's previous dismissal.
 */
export function InstallPrompt() {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    promptInstall,
    dismissInstallPrompt,
    isDismissed,
  } = usePWAInstall();

  const [isVisible, setIsVisible] = useState(false);

  // Show prompt after 5 seconds delay if installable and not dismissed/installed
  useEffect(() => {
    if (isInstallable && !isInstalled && !isDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000); // 5 second delay to avoid annoying users immediately

      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, isDismissed]);

  const handleInstall = async () => {
    if (isIOS) {
      // iOS users need manual instructions (can't programmatically trigger)
      return;
    }

    await promptInstall();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    dismissInstallPrompt();
    setIsVisible(false);
  };

  // Don't render if already installed or dismissed
  if (isInstalled || isDismissed) {
    return null;
  }

  // iOS requires different UI (manual instructions)
  if (isIOS && isVisible) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 right-4 z-50 max-w-sm"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-sm">
                    Install Pantry Pixie
                  </h3>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Add to your home screen for the best experience:
                </p>

                <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-4 list-decimal">
                  <li>
                    Tap the <Share className="w-3 h-3 inline" /> Share button
                    below
                  </li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                  <li>Tap "Add" to confirm</li>
                </ol>
              </div>

              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Dismiss install prompt"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Android/Chrome - can trigger native install prompt
  if (isInstallable && isVisible) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 right-4 z-50 max-w-sm"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-sm">
                    Install Pantry Pixie
                  </h3>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Install the app for quick access and offline support.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={handleInstall}
                    className="flex-1 bg-primary text-white text-xs font-medium py-2 px-3 rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Install
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium py-2 px-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Not now
                  </button>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Dismiss install prompt"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
}
