import React from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from 'next-themes'
import App from './App.tsx'
import './index.css'
import { initializeCapacitor } from "./utils/capacitor";

// Initialize Capacitor plugins
initializeCapacitor();

// Register the PWA service worker only in production-capable browsers.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
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
