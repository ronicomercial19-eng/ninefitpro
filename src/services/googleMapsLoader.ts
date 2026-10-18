/// <reference types="google.maps" />
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

export const SOLUTION_ATTRIBUTION_ID = "gmp_git_agentskills_v1";

let librariesPromise: Promise<typeof google> | null = null;
let cachedApiKey: string | null = null;
let optionsSet = false;
let authFailed = false;

/** true quando o Google recusou a chave (billing, referrer, API desativada...). */
export function didMapsAuthFail(): boolean {
  return authFailed;
}

function installAuthHook() {
  // O Google chama window.gm_authFailure quando a chave é recusada e mostra o
  // diálogo "Esta página não carregou o Google Maps corretamente". Avisamos o app
  // para ele mostrar um estado próprio em vez de deixar a tela quebrada.
  (window as any).gm_authFailure = () => {
    authFailed = true;
    window.dispatchEvent(new CustomEvent("9fit:maps-auth-failure"));
  };
}

/**
 * Obtém a chave do Google Maps. Sem chave hardcoded: só ambiente ou API interna.
 */
export async function getGoogleMapsApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;

  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (envKey && typeof envKey === "string" && envKey.trim().length > 10) {
    cachedApiKey = envKey.trim();
    return cachedApiKey;
  }

  try {
    const res = await fetch("/api/config/maps");
    if (res.ok) {
      const data = await res.json();
      if (data?.apiKey) {
        cachedApiKey = data.apiKey;
        return cachedApiKey!;
      }
    }
  } catch (e) {
    console.warn("[GoogleMapsLoader] Falha ao buscar chave via API:", e);
  }

  throw new Error("maps_key_missing");
}

/**
 * Carrega a API do Google Maps como singleton.
 * - Carregamentos simultâneos (abrir a tela 2x) compartilham a mesma promessa.
 * - Se falhar, a promessa é descartada: a próxima abertura tenta de novo
 *   (antes a promessa rejeitada ficava presa e toda abertura seguinte falhava).
 * - As bibliotecas (geometry, marker, geocoding) são sempre garantidas.
 */
export async function loadGoogleMaps(): Promise<typeof google> {
  if (librariesPromise) return librariesPromise;

  librariesPromise = (async () => {
    const apiKey = await getGoogleMapsApiKey();
    installAuthHook();
    if (!optionsSet) {
      setOptions({ key: apiKey, v: "weekly" });
      optionsSet = true;
    }
    await Promise.all([
      importLibrary("maps"),
      importLibrary("geometry"),
      importLibrary("marker"),
      importLibrary("geocoding"),
    ]);
    return window.google;
  })().catch((error) => {
    librariesPromise = null;
    throw error;
  });

  return librariesPromise;
}

/**
 * Estilo esportivo escuro de alta performance (9FIT Dark Cyber)
 */
export const NINE_FIT_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0f1117" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0b10" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3f4f6" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b7280" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#13231b" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#10b981" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1f2937" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#111827" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d1d5db" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#374151" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2937" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f97316" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#1f2937" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca3af" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#061325" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#38bdf8" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#061325" }],
  },
];

let geocoderInstance: google.maps.Geocoder | null = null;

/**
 * Geocodificação reversa em tempo real com extração precisa de Rua e Bairro.
 * Nunca lança: sem Maps (ou chave recusada) devolve o texto padrão.
 */
export async function getStreetNameFromCoords(lat: number, lng: number): Promise<{
  street: string;
  neighborhood: string;
  formattedAddress: string;
}> {
  const fallback = {
    street: "Em percurso...",
    neighborhood: "GPS Ativo",
    formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
  };
  if (authFailed) return fallback;

  try {
    const g = await loadGoogleMaps();
    if (!geocoderInstance) {
      geocoderInstance = new g.maps.Geocoder();
    }

    const response = await geocoderInstance.geocode({
      location: { lat, lng },
    });

    if (response && response.results && response.results.length > 0) {
      const topResult = response.results[0];

      let street = "";
      let streetNumber = "";
      let neighborhood = "";

      for (const component of topResult.address_components) {
        if (component.types.includes("route")) {
          street = component.long_name;
        } else if (component.types.includes("street_number")) {
          streetNumber = component.long_name;
        } else if (
          component.types.includes("sublocality") ||
          component.types.includes("sublocality_level_1") ||
          component.types.includes("neighborhood")
        ) {
          neighborhood = component.long_name;
        }
      }

      const displayStreet = street
        ? `${street}${streetNumber ? `, ${streetNumber}` : ""}`
        : topResult.formatted_address.split(",")[0] || "Em percurso";

      return {
        street: displayStreet,
        neighborhood: neighborhood || "Área Urbana",
        formattedAddress: topResult.formatted_address,
      };
    }
  } catch (error) {
    console.warn("[GoogleMapsLoader] Erro na geocodificação reversa:", error);
  }

  return fallback;
}
