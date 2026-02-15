import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UsePWAInstallReturn {
  /**
   * Whether the app can be installed (beforeinstallprompt event fired)
   */
  isInstallable: boolean;

  /**
   * Whether the app is currently installed (display-mode: standalone)
   */
  isInstalled: boolean;

  /**
   * Whether the user is on iOS (requires manual install instructions)
   */
  isIOS: boolean;

  /**
   * Trigger the browser's native install prompt (Android/Chrome only)
   */
  promptInstall: () => Promise<void>;

  /**
   * Dismiss the install prompt permanently (stores in localStorage)
   */
  dismissInstallPrompt: () => void;

  /**
   * Whether the user has previously dismissed the install prompt
   */
  isDismissed: boolean;
}

const DISMISSED_KEY = 'pwa-install-dismissed';

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  // Check if already installed
  useEffect(() => {
    const checkInstalled = () => {
      // Check if running in standalone mode (PWA installed)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
    };

    checkInstalled();

    // Listen for display-mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkInstalled);

    return () => mediaQuery.removeEventListener('change', checkInstalled);
  }, []);

  // Check if user previously dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY) === 'true';
    setIsDismissed(dismissed);
  }, []);

  // Capture beforeinstallprompt event
  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the default mini-infobar from appearing on mobile
      e.preventDefault();

      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      console.log('[PWA] Install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Listen for successful app installation
  useEffect(() => {
    const handler = () => {
      console.log('[PWA] App installed successfully');
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handler);

    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      console.warn('[PWA] Install prompt not available');
      return;
    }

    try {
      // Show the browser's install prompt
      await deferredPrompt.prompt();

      // Wait for user response
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted install prompt');
      } else {
        console.log('[PWA] User dismissed install prompt');
      }

      // Clear the prompt (can only be used once)
      setDeferredPrompt(null);
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
    }
  }, [deferredPrompt]);

  const dismissInstallPrompt = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setIsDismissed(true);
    console.log('[PWA] Install prompt dismissed by user');
  }, []);

  return {
    isInstallable: deferredPrompt !== null,
    isInstalled,
    isIOS,
    promptInstall,
    dismissInstallPrompt,
    isDismissed,
  };
}
