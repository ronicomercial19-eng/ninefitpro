import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, MapPin, Play, Square, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { supabase } from "@/integrations/supabase/client";

type Point = { lat: number; lon: number; t: number };

function haversine(a: Point, b: Point) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function NineFitMove() {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [distance, setDistance] = useState(0); // metros
  const [seconds, setSeconds] = useState(0);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<{ distance_m: number; recorded_at: string } | null>(null);
  const [historyStatus, setHistoryStatus] = useState<"loading" | "ready" | "error">("loading");

  const watchId = useRef<number | null>(null);
  const lastPoint = useRef<Point | null>(null);
  const timer = useRef<number | null>(null);

  const loadLast = async () => {
    setHistoryStatus("loading");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user?.id) {
        setHistoryStatus("ready");
        return;
      }
      const { data, error } = await supabase
        .from("bio_activity_logs")
        .select("distance_m, recorded_at")
        .eq("user_id", auth.user.id)
        .eq("source", "gps_move")
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setLastSaved(data ? { distance_m: Number(data.distance_m ?? 0), recorded_at: data.recorded_at } : null);
      setHistoryStatus("ready");
    } catch (e) {
      console.error("[Move] histórico", e);
      setHistoryStatus("error");
    }
  };

  useEffect(() => {
    loadLast();
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, []);

  const start = () => {
    if (!("geolocation" in navigator)) {
      setGpsError("Seu aparelho não permite localização por GPS neste navegador.");
      return;
    }
    setGpsError(null);
    setDistance(0);
    setSeconds(0);
    lastPoint.current = null;
    setRunning(true);

    timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p: Point = { lat: pos.coords.latitude, lon: pos.coords.longitude, t: Date.now() };
        if (lastPoint.current) {
          const d = haversine(lastPoint.current, p);
          // ignora ruído de GPS parado
          if (d > 3 && d < 200) setDistance((prev) => prev + d);
        }
        lastPoint.current = p;
      },
      (err) => {
        console.error("[Move] gps", err);
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? "Permissão de localização negada. Libere o acesso ao GPS para registrar a corrida."
            : "Não foi possível ler sua localização agora.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
  };

  const stopAndSave = async () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
    setRunning(false);

    if (distance < 20) {
      toast.info("Distância muito curta para registrar.");
      return;
    }

    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error("Sessão expirada. Entre novamente.");

      const km = distance / 1000;
      const { error } = await supabase.from("bio_activity_logs").insert({
        user_id: userId,
        recorded_at: new Date().toISOString(),
        distance_m: Math.round(distance),
        steps: Math.round(distance / 0.75),
        calories: Math.round(km * 60),
        source: "gps_move",
      });
      if (error) throw error;

      toast.success(`Corrida registrada: ${km.toFixed(2)} km`);
      await loadLast();
      setDistance(0);
      setSeconds(0);
    } catch (e: any) {
      console.error("[Move] salvar", e);
      toast.error(e?.message || "Não foi possível salvar a corrida.");
    } finally {
      setSaving(false);
    }
  };

  const km = distance / 1000;
  const pace = km > 0 ? seconds / 60 / km : 0;

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      <div className="px-4 pt-6 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT PRO // MOVE</p>
          <h1 className="text-3xl font-display tracking-tight">Corrida GPS</h1>
        </div>
      </div>

      <div className="mx-4 mt-5 rounded-3xl border border-primary/25 bg-white/[0.03] p-6 text-center">
        <p className="text-[10px] tracking-[0.3em] text-muted-foreground mb-2">DISTÂNCIA</p>
        <p className="font-display text-5xl">
          {km.toFixed(2)} <span className="text-lg text-muted-foreground">km</span>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-elevated/60 py-3">
            <p className="text-[10px] tracking-widest text-muted-foreground">TEMPO</p>
            <p className="font-data text-lg">{fmtTime(seconds)}</p>
          </div>
          <div className="rounded-2xl bg-elevated/60 py-3">
            <p className="text-[10px] tracking-widest text-muted-foreground">RITMO</p>
            <p className="font-data text-lg">{pace > 0 ? `${pace.toFixed(1)} min/km` : "--"}</p>
          </div>
        </div>

        {gpsError && (
          <p className="mt-4 text-xs text-destructive-foreground bg-destructive/20 border border-destructive/40 rounded-xl p-3">
            {gpsError}
          </p>
        )}

        <div className="mt-5">
          {!running ? (
            <button
              onClick={start}
              disabled={saving}
              className="w-full rounded-full bg-primary text-primary-foreground font-bold py-3 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {saving ? "Salvando…" : "Iniciar corrida"}
            </button>
          ) : (
            <button
              onClick={stopAndSave}
              className="w-full rounded-full border border-primary/50 text-primary font-bold py-3 flex items-center justify-center gap-2"
            >
              <Square className="w-4 h-4" /> Encerrar e salvar
            </button>
          )}
        </div>
      </div>

      <div className="mx-4 mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-primary" />
          <p className="text-label">ÚLTIMA CORRIDA</p>
        </div>
        {historyStatus === "loading" && <p className="text-xs text-muted-foreground">Carregando…</p>}
        {historyStatus === "error" && (
          <div className="text-xs text-muted-foreground">
            Não foi possível carregar seu histórico.{" "}
            <button onClick={loadLast} className="text-primary underline">
              Tentar novamente
            </button>
          </div>
        )}
        {historyStatus === "ready" && !lastSaved && (
          <p className="text-xs text-muted-foreground">Nenhuma corrida registrada ainda. Inicie a primeira acima.</p>
        )}
        {historyStatus === "ready" && lastSaved && (
          <div className="flex items-center justify-between">
            <p className="font-data text-lg">{(lastSaved.distance_m / 1000).toFixed(2)} km</p>
            <p className="text-xs text-muted-foreground">
              {new Date(lastSaved.recorded_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
        )}
        <button
          onClick={() => navigate("/9fit/progresso")}
          className="mt-4 w-full rounded-full border border-white/15 py-2.5 text-sm flex items-center justify-center gap-2"
        >
          <TrendingUp className="w-4 h-4" /> Ver no Progresso
        </button>
      </div>

      <BottomNavigation />
    </div>
  );
}
