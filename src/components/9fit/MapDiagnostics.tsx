/// <reference types="google.maps" />
import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

export function MapDiagnostics() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!key || key.trim().length < 10) {
      setError("Chave do Google Maps (VITE_GOOGLE_MAPS_API_KEY) não configurada ou inválida.");
      console.error("[MapDiagnostics] Erro: Chave de API ausente ou inválida.");
      return;
    }

    // Attempt to detect if Google Maps is loaded or if it errored
    const checkMaps = () => {
        if (typeof window === 'undefined' || !window.google) return;
        // Basic check, might need more robust error detection if maps library allows it
    };
    
    // Listen for global errors that might be related to Maps
    const errorHandler = (event: ErrorEvent) => {
        if (event.message.includes("Google Maps") || event.message.includes("api/js")) {
            setError("Erro ao carregar Google Maps. Verifique o console.");
        }
    };
    window.addEventListener('error', errorHandler);
    
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (!error) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] bg-destructive/10 border border-destructive/50 text-destructive p-4 rounded-xl flex items-center gap-3 shadow-lg">
      <AlertCircle className="w-6 h-6 shrink-0" />
      <p className="text-sm font-medium">{error}</p>
    </div>
  );
}
