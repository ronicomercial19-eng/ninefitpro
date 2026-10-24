import React from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from 'next-themes'
import App from './App.tsx'
import './index.css'
import './styles/orange-palette.css'
import './styles/touch-feedback.css'
import { initializeCapacitor } from "./utils/capacitor";

// Initialize Capacitor plugins
initializeCapacitor();

// iOS Safari só aplica :active em toque se existir um listener de touchstart no documento
// (necessário pro feedback interno de toque em cards/botões).
document.addEventListener('touchstart', () => {}, { passive: true });

// Register the PWA service worker only in production-capable browsers.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void caches.delete('supabase-cache').catch(() => {});
    // Registration and updates are owned by vite-plugin-pwa.
  });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      {/* QA (15/09): SettingsPage > Aparência tinha botões de tema sem onClick,
          e next-themes já era dependência (usada só pelo Sonner) mas nunca
          teve um ThemeProvider real montado. index.css já define .light
          completo — só faltava isso pra funcionar de verdade. */}
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <App />
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>
);
