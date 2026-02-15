/**
 * Network Status Hook
 *
 * Monitors online/offline state and provides real-time status.
 * Handles edge cases like slow connections and intermittent connectivity.
 */

import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean; // True if was offline at any point (for showing sync indicator)
  effectiveType: string | null; // '4g', '3g', '2g', 'slow-2g', etc.
}

export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true; // Assume online in SSR
  });

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function useDetailedNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    effectiveType: null,
  }));

  useEffect(() => {
    function updateNetworkInfo() {
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      setStatus((prev) => ({
        isOnline: navigator.onLine,
        wasOffline: prev.wasOffline || !navigator.onLine,
        effectiveType: connection?.effectiveType || null,
      }));
    }

    function handleOnline() {
      updateNetworkInfo();
    }

    function handleOffline() {
      setStatus((prev) => ({
        ...prev,
        isOnline: false,
        wasOffline: true,
      }));
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also listen to connection change events
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    // Initial update
    updateNetworkInfo();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, []);

  return status;
}
