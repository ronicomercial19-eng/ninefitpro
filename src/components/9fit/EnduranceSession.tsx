import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Segment = { kind?: string; label?: string; distance_m?: number; duration_seconds?: number; heart_rate_zone?: string; rpe_target?: number; target_pace_seconds_per_km?: number; target_speed_kmh?: number; description?: string };

export function EnduranceSession({ workoutId, segments, onBack, onFinish }: {
  workoutId: string; segments: Segment[]; onBack: () => void; onFinish: () => void;
}) {
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [rpe, setRpe] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await (supabase as any).from("workout_executions")
        .select("id").eq("daily_workout_id", workoutId).in("status", ["started", "in_progress", "paused"])
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!cancelled && !error && data?.id) setExecutionId(data.id);
    })();
    return () => { cancelled = true; };
  }, [workoutId]);

  const start = async () => {
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("fn_start_endurance_execution", { p_daily_workout_id: workoutId });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setExecutionId(data as string);
  };

  const finish = async () => {
    const minutes = Number(duration.replace(",", "."));
    const meters = Number(distance.replace(",", "."));
    const effort = Number(rpe.replace(",", "."));
    if (!Number.isFinite(minutes) || minutes <= 0 || !Number.isFinite(meters) || meters < 0 || !Number.isFinite(effort) || effort < 1 || effort > 10) {
      toast.error("Informe tempo, distância e esforço (RPE de 1 a 10)."); return;
    }
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("fn_complete_endurance_execution", {
      p_execution_id: executionId, p_duration_seconds: Math.round(minutes * 60),
      p_distance_m: meters, p_rpe: effort, p_actual_segments: [],
    });
    setBusy(false);
    if (error || !data?.ok) { toast.error(error?.message || "Não foi possível confirmar a sessão."); return; }
    toast.success("Sessão registrada.");
    onFinish();
  };

  return <main className="min-h-screen bg-[#08090b] text-white p-5 pb-20">
    <button className="text-orange-400 mb-6" onClick={onBack}>← Voltar</button>
    <p className="text-xs uppercase tracking-widest text-orange-400">Sessão de resistência</p>
    <h1 className="text-3xl font-bold mb-5">Prescrição de hoje</h1>
    <div className="space-y-3 mb-8">{segments.map((segment, index) => <article key={index} className="rounded-xl border border-neutral-700 p-4">
      <p className="font-semibold">{index + 1}. {segment.label || segment.description || segment.kind || "Segmento"}</p>
      <p className="text-neutral-300">{[
        segment.distance_m ? `${segment.distance_m} m` : null,
        segment.duration_seconds ? `${Math.round(segment.duration_seconds / 60)} min` : null,
        segment.heart_rate_zone ? `Zona ${segment.heart_rate_zone}` : null,
        segment.rpe_target ? `RPE ${segment.rpe_target}` : null,
        segment.target_pace_seconds_per_km ? `Pace ${Math.floor(segment.target_pace_seconds_per_km / 60)}:${String(segment.target_pace_seconds_per_km % 60).padStart(2, '0')}/km` : null,
        segment.target_speed_kmh ? `${segment.target_speed_kmh} km/h` : null,
      ].filter(Boolean).join(" · ")}</p>
    </article>)}</div>
    {!executionId ? <button disabled={busy} onClick={start} className="w-full rounded-xl bg-orange-500 p-4 font-bold disabled:opacity-50">Iniciar sessão</button> : <section className="space-y-4">
      <p className="text-orange-400 font-medium">Sessão iniciada. Registre o que você realizou.</p>
      <label className="block">Tempo realizado (minutos)<input className="mt-1 w-full rounded-lg bg-neutral-900 border border-neutral-700 p-3" inputMode="decimal" value={duration} onChange={e => setDuration(e.target.value)} /></label>
      <label className="block">Distância realizada (metros; 0 se não se aplica)<input className="mt-1 w-full rounded-lg bg-neutral-900 border border-neutral-700 p-3" inputMode="decimal" value={distance} onChange={e => setDistance(e.target.value)} /></label>
      <label className="block">Esforço percebido (RPE 1–10)<input className="mt-1 w-full rounded-lg bg-neutral-900 border border-neutral-700 p-3" inputMode="decimal" value={rpe} onChange={e => setRpe(e.target.value)} /></label>
      <button disabled={busy} onClick={finish} className="w-full rounded-xl bg-orange-500 p-4 font-bold disabled:opacity-50">Concluir e registrar</button>
    </section>}
  </main>;
}
