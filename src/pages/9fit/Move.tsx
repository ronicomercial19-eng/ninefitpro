import { useEffect, useRef, useState } from "react";
import { MapPin, Play, Square, Share2 } from "lucide-react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function NineFitMove() {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [distance, setDistance] = useState(0);
  const [activitySaved, setActivitySaved] = useState(false);
  const watchRef = useRef<number | null>(null);
  const lastRef = useRef<GeolocationPosition | null>(null);

  useEffect(() => () => { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); }, []);

  const start = () => {
    if (!navigator.geolocation) { toast.error("GPS não disponível neste dispositivo"); return; }
    setActivitySaved(false);
    setRunning(true);
    watchRef.current = navigator.geolocation.watchPosition((pos) => {
      if (lastRef.current) {
        const toRad = (v: number) => v * Math.PI / 180;
        const dLat = toRad(pos.coords.latitude - lastRef.current.coords.latitude);
        const dLon = toRad(pos.coords.longitude - lastRef.current.coords.longitude);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lastRef.current.coords.latitude)) * Math.cos(toRad(pos.coords.latitude)) * Math.sin(dLon / 2) ** 2;
        setDistance((d) => d + 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      }
      lastRef.current = pos;
    }, () => toast.error("Não foi possível acessar sua localização"), { enableHighAccuracy: true });
  };

  const stop = async () => {
    setRunning(false);
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    lastRef.current = null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Entre na sua conta para salvar a corrida"); return; }
    const { error } = await supabase.from("bio_activity_logs").insert({
      user_id: user.id,
      distance_m: Math.round(distance * 1000),
      source: "move_gps",
    });
    if (error) { toast.error("Não foi possível salvar a corrida"); return; }
    setActivitySaved(true);
    toast.success("Corrida registrada. Revise antes de compartilhar.");
  };

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const share = async () => {
    const text = `Minha corrida 9FIT: ${distance.toFixed(2)} km em ${Math.floor(seconds / 60)} min.`;
    try {
      if (navigator.share) await navigator.share({ title: "Minha corrida 9FIT", text });
      else await navigator.clipboard?.writeText(text);
      toast.success("Resumo pronto para compartilhar");
    } catch {
      toast.error("Compartilhamento cancelado");
    }
  };

  return <div className="min-h-screen bg-background pb-28">
    <div className="px-5 pt-8"><p className="text-label">9FIT · MOVE</p><h1 className="text-display text-3xl mt-1">Corrida</h1><p className="text-sm text-muted-foreground mt-1">GPS, ritmo e evolução em um só lugar.</p></div>
    <div className="px-5 mt-6"><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center"><MapPin className="mx-auto text-primary mb-3" /><p className="text-5xl font-display">{distance.toFixed(2)} <span className="text-lg">km</span></p><p className="text-sm text-muted-foreground mt-2">{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</p></div></div>
    <div className="px-5 mt-4 grid grid-cols-2 gap-3"><button onClick={running ? stop : start} className="rounded-xl bg-primary text-primary-foreground py-3 font-semibold flex justify-center gap-2">{running ? <Square className="w-4" /> : <Play className="w-4" />} {running ? "Finalizar" : "Iniciar GPS"}</button><button onClick={share} disabled={running || distance === 0 || !activitySaved} className="rounded-xl border border-primary/40 text-primary py-3 font-semibold flex justify-center gap-2 disabled:opacity-40"><Share2 className="w-4" /> Compartilhar</button></div>
    <BottomNavigation />
  </div>;
}
