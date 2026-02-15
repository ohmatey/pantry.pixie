import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false, // use existing manifest.json

      workbox: {
        // Precache static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        // Runtime caching strategies
        runtimeCaching: [
          {
            // API endpoints - NetworkFirst (try network, fallback to cache)
            urlPattern: /^\/api\/homes\/.*\/(items|messages)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxAgeSeconds: 60 * 5, // 5 minutes
                maxEntries: 50,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Images - CacheFirst (use cache, update in background)
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Fonts - CacheFirst (static resources)
            urlPattern: /\.(?:woff|woff2|ttf|otf)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],

        navigationPreload: true,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },

      devOptions: {
        enabled: true, // Test service worker in dev mode
        type: 'module',
      },
    }),

    // Bundle visualizer for production builds
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  root: __dirname,
  publicDir: "public",
  resolve: {
    alias: {
      "@/": path.resolve(__dirname, "src/client") + "/",
      "@pantry-pixie/core": path.resolve(__dirname, "../core/src"),
      "@pantry-pixie/sdk": path.resolve(__dirname, "../sdk/src"),
    },
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    minify: 'terser',

    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },

    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks (stable, cacheable)
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': [
            '@tanstack/react-query',
            '@tanstack/react-query-persist-client',
          ],
          'ui-vendor': ['lucide-react', 'framer-motion', 'sonner'],
          'offline-vendor': ['dexie', 'idb-keyval'],

          // Feature chunks (code-split by route)
          'chat': [
            './src/client/pages/(app)/chat.tsx',
            './src/client/components/chat/ChatBubble.tsx',
            './src/client/components/chat/ChatInput.tsx',
          ],
          'list': [
            './src/client/pages/(app)/list.tsx',
            './src/client/components/list/CategoryGroup.tsx',
            './src/client/components/list/ItemRow.tsx',
          ],
        },
      },
    },

    assetsInlineLimit: 4096, // Inline assets < 4KB
    chunkSizeWarningLimit: 500, // Warn if chunk > 500KB
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
        configure: (proxy) => {
          proxy.on("error", (err) => {
            const code = (err as NodeJS.ErrnoException).code;
            if (code === "EPIPE" || code === "ECONNRESET") return;
            console.error("[vite] ws proxy error:", err.message);
          });
          proxy.on("proxyReqWs", (_proxyReq, _req, socket) => {
            socket.on("error", (err) => {
              const code = (err as NodeJS.ErrnoException).code;
              if (code === "ECONNRESET" || code === "EPIPE") return;
            });
          });
        },
      },
    },
  },
});
