import { Loader } from "@googlemaps/js-api-loader";

export const SOLUTION_ATTRIBUTION_ID = "gmp_git_agentskills_v1";

let loaderPromise: Promise<typeof google> | null = null;
let cachedApiKey: string | null = null;

/**
 * Obtém a chave do Google Maps de forma robusta
 */
export async function getGoogleMapsApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;

  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  console.log("[GoogleMapsLoader] Environment API Key:", envKey ? "Exists" : "Missing");
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
    console.warn("[GoogleMapsLoader] Fallback para chave embutida:", e);
  }

  cachedApiKey = "AIzaSyDdsMhbF8C6KTht4vbqPcBvxHNAdM3doh4";
  return cachedApiKey;
}

/**
 * Carrega a API do Google Maps com tratamento de singleton
 */
export async function loadGoogleMaps(): Promise<typeof google> {
  if (window.google?.maps) {
    return window.google;
  }

  if (loaderPromise) {
    return loaderPromise;
  }

  loaderPromise = (async () => {
    const apiKey = await getGoogleMapsApiKey();
    const loader = new Loader({
      apiKey,
      version: "weekly",
      libraries: ["maps", "geometry", "marker"],
    });

    await loader.importLibrary("maps");
    return window.google;
  })();

  return loaderPromise;
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
 * Geocodificação reversa em tempo real com extração precisa de Rua e Bairro
 */
export async function getStreetNameFromCoords(lat: number, lng: number): Promise<{
  street: string;
  neighborhood: string;
  formattedAddress: string;
}> {
  try {
    const g = await loadGoogleMaps();
    if (!geocoderInstance) {
      geocoderInstance = new g.maps.Geocoder();
    }

    const response = await geocoderInstance.geocode({
      location: { lat, lng },
      // Solução de atribuição
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

  return {
    street: "Em percurso...",
    neighborhood: "GPS Ativo",
    formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
  };
}
