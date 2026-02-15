import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { get, set, del } from "idb-keyval";
import { Toaster } from "sonner";
import { BrowserRouter, Routes } from "react-router-dom";
import { generateRoutes, renderRoutes } from "./lib/route-generator";
import { InstallPrompt } from "./components/pwa/InstallPrompt";
import { UpdatePrompt } from "./components/pwa/UpdatePrompt";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 1,
      networkMode: "offlineFirst", // CRITICAL for offline support
    },
  },
});

const persister = createSyncStoragePersister({
  storage: {
    getItem: async (key) => await get(key),
    setItem: async (key, value) => await set(key, value),
    removeItem: async (key) => await del(key),
  },
});

export function App() {
  // Generate routes from file structure
  const routes = generateRoutes();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <BrowserRouter>
        {/* Skip to main content link for screen readers */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>

        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#F4EFE6',
              color: '#2B2B2B',
              border: '1px solid #8FAF9D',
            },
            className: 'font-sans',
          }}
        />

        <main id="main-content" className="h-screen">
          <Routes>
            {renderRoutes(routes)}
          </Routes>
        </main>

        {/* PWA Install & Update Prompts */}
        <InstallPrompt />
        <UpdatePrompt />
      </BrowserRouter>
    </PersistQueryClientProvider>
  );
}
