// Build verification fallback for Windows hosts where the SWC native binding
// cannot be loaded. Vite/esbuild still transforms TSX and emits the PWA.
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
    manifest: { name: '9FIT PRO - Plataforma de Treinos', short_name: '9FIT', theme_color: '#000000', background_color: '#000000', display: 'standalone', scope: '/', start_url: '/9fit/hub', icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ] },
    workbox: { cleanupOutdatedCaches: true, skipWaiting: true, clientsClaim: true, navigateFallbackDenylist: [/^\/~oauth/], globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}'], maximumFileSizeToCacheInBytes: 12 * 1024 * 1024, runtimeCaching: [] },
  })],
  build: { chunkSizeWarningLimit: 1000 },
});
