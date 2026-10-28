import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: '9FIT PRO - Plataforma de Treinos',
        short_name: '9FIT',
        description: 'Plataforma completa de treinamento personalizado',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/9fit/hub',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        importScripts: ['/push-events.js'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallbackDenylist: [/^\/~oauth/],
        // Cache the application shell. Editorial photos load only when viewed.
        globPatterns: ['**/*.{css,html,ico}', 'assets/index-*.js', 'icons/*.png'],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        runtimeCaching: [{
          urlPattern: /\/assets\/[^/?]+\.js$/,
          handler: 'CacheFirst',
          options: {
            cacheName: '9fit-route-js-v1',
            cacheableResponse: { statuses: [200] },
            expiration: { maxEntries: 120, maxAgeSeconds: 7 * 24 * 60 * 60 }
          }
        }]
      }
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Sem manualChunks manuais: separar react/react-dom em um chunk fixo quebrava a
    // ordem de inicialização entre os chunks (tela branca / "Cannot read properties of undefined").
    // O Rollup faz o code-splitting automático com ordem correta.
    chunkSizeWarningLimit: 1000
  }
}));
