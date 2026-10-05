/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  MapPin,
  Play,
  Square,
  Pause,
  Share2,
  Timer,
  Zap,
  Gauge,
  Compass,
  Navigation,
  Sparkles,
  Flame,
  Award,
  ChevronRight,
  Activity,
  Volume2,
  VolumeX,
} from "lucide-react";
import html2canvas from "html2canvas";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { emitNexus } from "@/services/nexus/nexusBus";
import {
  loadGoogleMaps,
  NINE_FIT_MAP_STYLES,
  getStreetNameFromCoords,
  SOLUTION_ATTRIBUTION_ID,
} from "@/services/googleMapsLoader";
import { useAuth } from "@/contexts/AuthContext";
import { MapDiagnostics } from "@/components/9fit/MapDiagnostics";
import { ProgressGraph } from "@/components/9fit/ProgressGraph";

type LatLng = { lat: number; lng: number };

const LOCAL_SIMULATION_WAYPOINTS: LatLng[] = [
  { lat: -23.56149, lng: -46.65588 }, 
  { lat: -23.56214, lng: -46.65492 },
  { lat: -23.56298, lng: -46.65365 },
  { lat: -23.56382, lng: -46.65237 },
  { lat: -23.56468, lng: -46.65108 },
  { lat: -23.56554, lng: -46.64979 },
  { lat: -23.56639, lng: -46.64851 },
  { lat: -23.56725, lng: -46.64722 },
  { lat: -23.56811, lng: -46.64593 },
  { lat: -23.56897, lng: -46.64464 },
  { lat: -23.56983, lng: -46.64335 },
  { lat: -23.57069, lng: -46.64206 },
  { lat: -23.57155, lng: -46.64077 },
];

export default function NineFitMove() {
  const showSimulationControls = import.meta.env.DEV;
  const { user } = useAuth();
  const [running, setRunning] = useState(false);

  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [maxSpeedKmh, setMaxSpeedKmh] = useState(0);
  const [currentStreet, setCurrentStreet] = useState("Aguardando sinal GPS...");
  const [currentNeighborhood, setCurrentNeighborhood] = useState("");
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [activitySaved, setActivitySaved] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [voiceAudio, setVoiceAudio] = useState(true);

  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const currentMarkerRef = useRef<google.maps.Marker | null>(null);
  const startMarkerRef = useRef<google.maps.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const simIntervalRef = useRef<number | null>(null);
  const simIndexRef = useRef(0);
  const pathCoordinatesRef = useRef<LatLng[]>([]);
  const lastCoordRef = useRef<LatLng | null>(null);
  const lastGeocodeTimeRef = useRef(0);
  const lastGeocodedCoordRef = useRef<LatLng | null>(null);
  const captureCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    async function initMap() {
      try {
        const g = await loadGoogleMaps();
        if (!mounted || !mapElementRef.current) return;

        const defaultCenter = { lat: -23.56149, lng: -46.65588 };

        const map = new g.maps.Map(mapElementRef.current, {
          center: defaultCenter,
          zoom: 17,
          styles: NINE_FIT_MAP_STYLES,
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling: "greedy",
          mapId: undefined,
          internalUsageAttributionIds: [SOLUTION_ATTRIBUTION_ID],
        } as any);
        console.log("[NineFitMove] Map instance created:", map);

        mapInstanceRef.current = map;

        polylineRef.current = new g.maps.Polyline({
          map,
          path: [],
          strokeColor: "#ff6b2c",
          strokeOpacity: 0.95,
          strokeWeight: 6,
        });

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (!mounted || !mapInstanceRef.current) return;
              const posLatLng = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              };
              mapInstanceRef.current.setCenter(posLatLng);
              updateStreetName(posLatLng.lat, posLatLng.lng, true);
            },
            () => {},
            { enableHighAccuracy: true, timeout: 5000 }
          );
        }
      } catch (err) {
        console.error("[NineFitMove] Erro ao carregar Google Maps:", err);
        toast.error("Não foi possível carregar o Google Maps. Verifique sua conexão.");
      }
    }

    initMap();

    return () => {
      mounted = false;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (simIntervalRef.current !== null) {
        window.clearInterval(simIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!running || isPaused) return;
    const interval = window.setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running, isPaused]);

  const updateStreetName = useCallback(
    async (lat: number, lng: number, force = false) => {
      const now = Date.now();
      if (!force && now - lastGeocodeTimeRef.current < 8000) return;

      if (lastGeocodedCoordRef.current && !force) {
        const dLat = Math.abs(lat - lastGeocodedCoordRef.current.lat);
        const dLng = Math.abs(lng - lastGeocodedCoordRef.current.lng);
        if (dLat < 0.00025 && dLng < 0.00025) return;
      }

      lastGeocodeTimeRef.current = now;
      lastGeocodedCoordRef.current = { lat, lng };

      const res = await getStreetNameFromCoords(lat, lng);
      setCurrentStreet(res.street);
      setCurrentNeighborhood(res.neighborhood);
    },
    []
  );

  const handleNewCoordinate = useCallback(
    (lat: number, lng: number, speedMps?: number | null, accuracy?: number | null) => {
      const g = window.google;
      if (!g?.maps || !mapInstanceRef.current) return;

      const currentLatLng = { lat, lng };
      const currentGoogleLatLng = new g.maps.LatLng(lat, lng);

      if (accuracy !== undefined && accuracy !== null) {
        setGpsAccuracy(Math.round(accuracy));
      }

      if (lastCoordRef.current) {
        const lastGoogleLatLng = new g.maps.LatLng(
          lastCoordRef.current.lat,
          lastCoordRef.current.lng
        );

        let deltaMeters = 0;
        if (g.maps.geometry?.spherical) {
          deltaMeters = g.maps.geometry.spherical.computeDistanceBetween(
            lastGoogleLatLng,
            currentGoogleLatLng
          );
        } else {
          const R = 6371000;
          const dLat = ((lat - lastCoordRef.current.lat) * Math.PI) / 180;
          const dLng = ((lng - lastCoordRef.current.lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lastCoordRef.current.lat * Math.PI) / 180) *
              Math.cos((lat * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          deltaMeters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        if (deltaMeters > 2.0) {
          setDistanceKm((prev) => {
            const nextDist = prev + deltaMeters / 1000;
            return nextDist;
          });
        }
      }

      let instantSpeedKmh = 0;
      if (speedMps !== null && speedMps !== undefined && speedMps >= 0) {
        instantSpeedKmh = Math.round(speedMps * 3.6 * 10) / 10;
      } else if (lastCoordRef.current) {
        instantSpeedKmh = 10.2; 
      }

      setCurrentSpeedKmh(instantSpeedKmh);
      setMaxSpeedKmh((prev) => Math.max(prev, instantSpeedKmh));

      pathCoordinatesRef.current.push(currentLatLng);
      lastCoordRef.current = currentLatLng;

      if (polylineRef.current) {
        polylineRef.current.getPath().push(currentGoogleLatLng);
      }

      if (!startMarkerRef.current) {
        startMarkerRef.current = new g.maps.Marker({
          position: currentLatLng,
          map: mapInstanceRef.current,
          title: "Largada 9FIT",
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            fillColor: "#22c55e",
            fillOpacity: 1,
            strokeWeight: 3,
            strokeColor: "#ffffff",
            scale: 7,
          },
        });
      }

      if (!currentMarkerRef.current) {
        currentMarkerRef.current = new g.maps.Marker({
          position: currentLatLng,
          map: mapInstanceRef.current,
          title: "Sua Posição Atual",
          zIndex: 999,
          icon: {
            path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            fillColor: "#ff6b2c",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#ffffff",
            scale: 6,
          },
        });
      } else {
        currentMarkerRef.current.setPosition(currentLatLng);
      }

      mapInstanceRef.current.panTo(currentLatLng);

      updateStreetName(lat, lng);
    },
    [updateStreetName]
  );

  const startRealGps = () => {
    if (!navigator.geolocation) {
      toast.error("GPS não disponível ou suportado neste navegador.");
      return;
    }

    setActivitySaved(false);
    setDistanceKm(0);
    setSeconds(0);
    setCurrentSpeedKmh(0);
    setMaxSpeedKmh(0);
    pathCoordinatesRef.current = [];
    lastCoordRef.current = null;

    if (polylineRef.current) {
      polylineRef.current.setPath([]);
    }
    if (startMarkerRef.current) {
      startMarkerRef.current.setMap(null);
      startMarkerRef.current = null;
    }
    if (currentMarkerRef.current) {
      currentMarkerRef.current.setMap(null);
      currentMarkerRef.current = null;
    }

    setRunning(true);
    setIsPaused(false);
    toast.success("GPS ligado! Rastreamento de corrida em tempo real ativado.");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        handleNewCoordinate(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.speed,
          pos.coords.accuracy
        );
      },
      (err) => {
        console.warn("[GPS Error]", err);
        toast.warning(
          "Sinal de GPS fraco ou não autorizado. Verifique a permissão de localização do navegador."
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 12000,
      }
    );
  };

  const startSimulation = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setActivitySaved(false);
    setDistanceKm(0);
    setSeconds(0);
    setCurrentSpeedKmh(11.2);
    setMaxSpeedKmh(12.5);
    setIsSimulationMode(true);
    setRunning(true);
    setIsPaused(false);
    pathCoordinatesRef.current = [];
    lastCoordRef.current = null;

    if (polylineRef.current) {
      polylineRef.current.setPath([]);
    }
    if (startMarkerRef.current) {
      startMarkerRef.current.setMap(null);
      startMarkerRef.current = null;
    }
    if (currentMarkerRef.current) {
      currentMarkerRef.current.setMap(null);
      currentMarkerRef.current = null;
    }

    toast.info("Simulação local ativada.");

    simIndexRef.current = 0;
    const firstPoint = LOCAL_SIMULATION_WAYPOINTS[0];
    handleNewCoordinate(firstPoint.lat, firstPoint.lng, 3.2, 5);

    simIntervalRef.current = window.setInterval(() => {
      simIndexRef.current += 1;
      if (simIndexRef.current >= LOCAL_SIMULATION_WAYPOINTS.length) {
        simIndexRef.current = 0;
      }
      const pt = LOCAL_SIMULATION_WAYPOINTS[simIndexRef.current];
      const simulatedSpeedMps = 2.9 + Math.sin(simIndexRef.current) * 0.4;
      handleNewCoordinate(pt.lat, pt.lng, simulatedSpeedMps, 4);
    }, 2500);
  };

  const togglePause = () => {
    setIsPaused((prev) => {
      const next = !prev;
      if (next) {
        toast.info("Corrida pausada.");
      } else {
        toast.success("Corrida retomada!");
      }
      return next;
    });
  };

  const stopAndSave = async () => {
    setRunning(false);
    setIsPaused(false);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIntervalRef.current !== null) {
      window.clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }

    const finalDistanceMeters = Math.round(distanceKm * 1000);
    const avgSpeed = distanceKm > 0 ? (distanceKm / (seconds / 3600)) : 0;
    const caloriesBurned = Math.round(distanceKm * 65);

    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        await supabase.from("bio_activity_logs").insert({
          user_id: currentUser.id,
          distance_m: finalDistanceMeters,
          calories: caloriesBurned,
          source: "move_gps",
          recorded_at: new Date().toISOString(),
        });
      }

      const localHistory = JSON.parse(
        localStorage.getItem("9fit_move_history") || "[]"
      );
      localHistory.unshift({
        id: `run_${Date.now()}`,
        date: new Date().toLocaleDateString("pt-BR"),
        time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        distanceKm,
        durationSeconds: seconds,
        avgSpeedKmh: avgSpeed,
        street: currentStreet,
        neighborhood: currentNeighborhood,
        calories: caloriesBurned,
      });
      localStorage.setItem("9fit_move_history", JSON.stringify(localHistory.slice(0, 20)));

      emitNexus("9fit:mission_completed", { missionId: "move_session", xp: 100 });
      emitNexus("9fit:run:finished", {
        distanceKm,
        durationMinutes: Math.round(seconds / 60),
      });

      setActivitySaved(true);
      toast.success(
        `🏆 Corrida Finalizada! ${distanceKm.toFixed(2)}km registrados e sincronizados com seu progresso.`
      );
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível salvar a corrida no servidor.");
    }
  };

  const recenterMap = () => {
    if (lastCoordRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(lastCoordRef.current);
      mapInstanceRef.current.setZoom(17);
      toast.info("Câmera centralizada na sua posição.");
    }
  };

  const formattedPace = useMemo(() => {
    if (distanceKm <= 0.05 || seconds < 10) return "—'—\"";
    const paceTotalSeconds = seconds / distanceKm;
    const paceMin = Math.floor(paceTotalSeconds / 60);
    const paceSec = Math.floor(paceTotalSeconds % 60);
    return `${paceMin}'${String(paceSec).padStart(2, "0")}"`;
  }, [distanceKm, seconds]);

  const formattedTime = useMemo(() => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [seconds]);

  const estimatedCalories = Math.round(distanceKm * 65);

  const share = async () => {
    const text = `🔥 Minha corrida no 9FIT MOVE:\n📍 ${currentStreet}\n📏 ${distanceKm.toFixed(2)} km em ${formattedTime}\n⚡ Ritmo médio: ${formattedPace} /km\n🔥 ${estimatedCalories} kcal gastas!`;
    try {
      const canvas = captureCardRef.current
        ? await html2canvas(captureCardRef.current, { backgroundColor: "#0c0d12" })
        : null;
      const blob = canvas
        ? await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
        : null;

      if (navigator.share && blob && typeof File !== "undefined") {
        await navigator.share({
          title: "9FIT MOVE · Corrida GPS",
          text,
          files: [new File([blob], "9fit-corrida.png", { type: "image/png" })],
        });
      } else if (navigator.share) {
        await navigator.share({ title: "9FIT MOVE · Corrida GPS", text });
      } else {
        await navigator.clipboard?.writeText(text);
        toast.success("Resumo da corrida copiado para a área de transferência!");
      }
    } catch {
      toast.info("Compartilhamento finalizado.");
    }
  };

  return (
    <div className="min-h-screen bg-[#07080b] pb-28 text-foreground selection:bg-primary/30">
      <MapDiagnostics />
      {/* Top Header */}
      <div className="px-5 pt-8 pb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary font-bold">
              9FIT // HIGH-PERFORMANCE OS
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              GOOGLE MAPS GPS
            </span>
          </div>
          <h1 className="text-display text-3xl font-extrabold tracking-tight mt-1 text-white flex items-center gap-2">
            MOVE <Activity className="w-6 h-6 text-primary animate-pulse" />
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rastreamento de corrida e caminhada em tempo real com Google Maps.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setVoiceAudio(!voiceAudio)}
          className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-muted-foreground hover:text-white transition-colors"
          title={voiceAudio ? "Áudio Ativo" : "Áudio Silenciado"}
        >
          {voiceAudio ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* RUA ATUAL DETECTADA EM TEMPO REAL PELO GOOGLE GEOCODER */}
      <div className="mx-5 mb-3 rounded-2xl bg-gradient-to-r from-primary/15 via-[#0e1017] to-black border border-primary/30 p-3.5 shadow-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shrink-0 shadow-inner">
            <MapPin className="w-5 h-5 animate-bounce" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-mono uppercase tracking-wider text-primary font-bold block">
              RUA EM TEMPO REAL (GEOCODER)
            </span>
            <p className="text-sm font-bold text-white truncate">{currentStreet}</p>
            {currentNeighborhood && (
              <p className="text-[11px] text-neutral-400 truncate">{currentNeighborhood}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span className="text-[9px] font-mono text-neutral-400 uppercase">PRECISÃO</span>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {gpsAccuracy ? `±${gpsAccuracy}m` : "ALTA (GPS)"}
          </span>
        </div>
      </div>

      {/* PAINEL CENTRAL DO GOOGLE MAPS EM TEMPO REAL */}
      <div ref={captureCardRef} className="mx-5 relative rounded-2xl overflow-hidden border border-white/15 bg-[#0b0d13] shadow-2xl h-[330px]">
        {/* Container do Mapa */}
        <div ref={mapElementRef} className="w-full h-full" />

        {/* Overlay Superior Esquerdo: Status do GPS */}
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/75 backdrop-blur-md px-3 py-1.5 border border-white/10 text-xs shadow-md">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              running ? "bg-emerald-400 animate-ping" : "bg-neutral-500"
            }`}
          />
          <span className="font-mono text-[11px] font-bold text-neutral-200">
            {running
              ? isPaused
                ? "PAUSADO"
                : isSimulationMode
                ? "SIMULAÇÃO GPS ATIVA"
                : "GPS REAL ATIVO"
              : "GPS EM ESPERA"}
          </span>
        </div>

        {/* Botão Flutuante de Recentralizar Mapa */}
        <button
          type="button"
          onClick={recenterMap}
          className="absolute right-3 top-3 w-9 h-9 rounded-full bg-black/75 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:text-primary transition-colors shadow-md"
          title="Recentralizar na minha localização"
        >
          <Navigation className="w-4 h-4 text-primary" />
        </button>

        {/* Overlay Inferior: Velocímetro HUD sobre o Mapa */}
        <div className="absolute inset-x-3 bottom-3 rounded-xl bg-black/85 backdrop-blur-md border border-white/10 p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            <div>
              <span className="text-[9px] font-mono text-muted-foreground uppercase block">VELOCIDADE</span>
              <span className="text-base font-bold font-mono text-white">
                {currentSpeedKmh.toFixed(1)} <span className="text-[10px] text-primary">km/h</span>
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <div>
            <span className="text-[9px] font-mono text-muted-foreground uppercase block">RITMO / PACE</span>
            <span className="text-base font-bold font-mono text-white">
              {formattedPace} <span className="text-[10px] text-neutral-400">/km</span>
            </span>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <div>
            <span className="text-[9px] font-mono text-muted-foreground uppercase block">CALORIAS</span>
            <span className="text-base font-bold font-mono text-primary flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-500" />
              {estimatedCalories}
            </span>
          </div>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPAIS (STAT CARDS) */}
      <div className="mx-5 mt-4 grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center shadow-md">
          <div className="flex justify-center text-primary mb-1">
            <Compass className="w-4 h-4" />
          </div>
          <p className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">DISTÂNCIA</p>
          <p className="mt-0.5 text-xl font-extrabold font-mono text-white">
            {distanceKm.toFixed(2)}
            <span className="text-xs text-primary ml-0.5">km</span>
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center shadow-md">
          <div className="flex justify-center text-primary mb-1">
            <Timer className="w-4 h-4" />
          </div>
          <p className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">TEMPO</p>
          <p className="mt-0.5 text-xl font-extrabold font-mono text-white">{formattedTime}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center shadow-md">
          <div className="flex justify-center text-primary mb-1">
            <Zap className="w-4 h-4" />
          </div>
          <p className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">VELOC. MÁX</p>
          <p className="mt-0.5 text-xl font-extrabold font-mono text-white">
            {maxSpeedKmh.toFixed(1)}
            <span className="text-[10px] text-neutral-400 ml-0.5">km/h</span>
          </p>
        </div>
      </div>

      {/* BOTÕES DE CONTROLE DA CORRIDA */}
      <div className="mx-5 mt-4 space-y-2.5">
        {!running ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={startRealGps}
              className="w-full py-4 rounded-xl font-bold bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 text-sm cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              LIGAR O GPS & INICIAR
            </button>
            {showSimulationControls && (
              <button
                type="button"
                onClick={startSimulation}
                className="w-full py-4 rounded-xl font-semibold border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Simulação local
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={togglePause}
              className="py-3.5 rounded-xl font-semibold border border-white/20 bg-white/10 text-white hover:bg-white/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
              {isPaused ? "Retomar" : "Pausar"}
            </button>
            <button
              type="button"
              onClick={stopAndSave}
              className="py-3.5 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-red-600/30 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              Finalizar Corrida
            </button>
          </div>
        )}

        {activitySaved && (
          <div className="pt-2 flex flex-col gap-2">
            <ProgressGraph />
            <button
              type="button"
              onClick={share}
              className="w-full py-3 rounded-xl border border-primary/40 text-primary hover:bg-primary/10 font-semibold flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Compartilhar Resumo da Rota
            </button>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("9fit:open-ron-concierge", {
                    detail: {
                      prompt: `Acabei de completar uma corrida no MOVE: ${distanceKm.toFixed(
                        2
                      )}km em ${formattedTime} na rua ${currentStreet}. Qual o melhor protocolo de descompressão e nutrição agora?`,
                    },
                  })
                );
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 text-white hover:border-primary font-bold flex items-center justify-between px-4 text-xs transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Pedir Análise Pós-Corrida ao RON IA
              </span>
              <ChevronRight className="w-4 h-4 text-primary" />
            </button>
          </div>
        )}
      </div>

      <div className="mx-5 mt-5 p-3.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-neutral-400">
        <div className="flex items-center gap-2 text-white font-semibold mb-1">
          <Award className="w-4 h-4 text-primary" />
          <span>Diretriz Biomecânica 9FIT</span>
        </div>
        <p className="leading-relaxed">
          Mantenha a cadência entre 165 e 175 passos por minuto para diminuir a força de impacto
          nas articulações dos joelhos e quadril. A respiração ritmada 3:3 otimiza a oxigenação.
        </p>
      </div>

      <BottomNavigation />
    </div>
  );
}
