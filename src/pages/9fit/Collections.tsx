import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAthleteId } from "@/hooks/useAthleteId";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { Loader2, Share2, Download, Sparkles, TrendingUp, Flame, Trophy, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";

type Template = {
  id: string;
  slug: string;
  name: string;
  content_type: string;
  accent_color: string | null;
};

type Benchmark = {
  tipo: string;
  dado: string;
  icon: any;
  template?: Template | null;
};

export default function NineFitCollections() {
  const { athleteId, athleteName } = useAthleteId();
  const [loading, setLoading] = useState(true);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!athleteId) return;
    (async () => {
      setLoading(true);
      try {
        // Templates ativos
        const { data: tps } = await supabase
          .from("social_share_templates")
          .select("id, slug, name, content_type, accent_color")
          .eq("active", true);
        const tpl = (tps as Template[]) || [];
        setTemplates(tpl);
        const tplByType = (t: string) => tpl.find((x) => x.content_type === t) || null;

        // Foto do atleta
        const { data: ath } = await supabase
          .from("athletes").select("photo_url, name").eq("id", athleteId).maybeSingle();
        setAvatarUrl((ath as any)?.photo_url || null);

        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        // Benchmarks reais
        const b: Benchmark[] = [];

        // 1) Ganho de carga (strength_records — último vs primeiro do mês)
        if (userId) {
          const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
          const { data: sr } = await supabase
            .from("strength_records")
            .select("exercise_name, weight_kg, recorded_at")
            .eq("user_id", userId)
            .gte("recorded_at", monthAgo)
            .order("recorded_at", { ascending: true })
            .limit(200);
          const rows = (sr as any[]) || [];
          const byEx = new Map<string, any[]>();
          rows.forEach((r) => {
            const arr = byEx.get(r.exercise_name) || [];
            arr.push(r); byEx.set(r.exercise_name, arr);
          });
          let best: { name: string; delta: number } | null = null;
          byEx.forEach((arr, name) => {
            if (arr.length < 2) return;
            const d = Number(arr[arr.length - 1].weight_kg) - Number(arr[0].weight_kg);
            if (!best || d > best.delta) best = { name, delta: d };
          });
          if (best && best.delta > 0) {
            b.push({ tipo: "aumento_carga", dado: `${best.name} +${best.delta}kg este mês`, icon: TrendingUp, template: tplByType("aumento_carga") });
          }
        }

        // 2) Streak / consistência
        const { data: act } = await supabase
          .from("athlete_activation" as any).select("consistency_days").eq("athlete_id", athleteId).maybeSingle();
        const streak = Number((act as any)?.consistency_days || 0);
        if (streak >= 3) {
          b.push({ tipo: "consistencia", dado: `${streak} dias consecutivos`, icon: Flame, template: tplByType("consistencia") });
          if (streak >= 7) b.push({ tipo: "streak_7", dado: `7 dias consecutivos · nível ELITE`, icon: Trophy, template: tplByType("streak_7") });
        }

        // 3) Último treino concluído
        const { data: we } = await supabase
          .from("workout_executions").select("phase_name, duration_minutes, completed_at")
          .eq("athlete_id", athleteId).eq("status", "completed")
          .order("completed_at", { ascending: false }).limit(1).maybeSingle();
        if (we) {
          b.push({
            tipo: "treino_concluido",
            dado: `${(we as any).phase_name || "Treino"} · ${(we as any).duration_minutes || 45} min · concluído`,
            icon: Dumbbell, template: tplByType("treino_concluido"),
          });
        }

        setBenchmarks(b);
      } finally { setLoading(false); }
    })();
  }, [athleteId]);

  const share = async (b: Benchmark) => {
    const node = refs.current[b.tipo];
    if (!node || !athleteId) return;
    setSharing(b.tipo);
    try {
      const canvas = await html2canvas(node, { backgroundColor: "#000000", scale: 2, logging: false });
      const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/png"));
      if (!blob) throw new Error("canvas");
      const file = new File([blob], `9fit-${b.tipo}.png`, { type: "image/png" });

      let channel: "native_share" | "download" = "download";
      const nav: any = navigator;
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: "9FIT PRO", text: b.dado });
          channel = "native_share";
        } catch {
          channel = "download";
          triggerDownload(blob, file.name);
        }
      } else {
        triggerDownload(blob, file.name);
      }

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("share_events" as any).insert({
        user_id: user?.id,
        athlete_id: athleteId,
        channel,
        content_type: b.tipo,
        content_id: b.template?.slug || b.tipo,
        reward_xp: 20,
        shared_at: new Date().toISOString(),
      } as any);

      await supabase.rpc("fn_award_xp" as any, {
        p_athlete_id: athleteId, p_amount: 20, p_source: "share_viral", p_metadata: { tipo: b.tipo } as any,
      });

      toast.success("Compartilhado · +20 XP");
    } catch (e: any) {
      console.error("[Collections] share", e);
      toast.error("Não foi possível compartilhar");
    } finally { setSharing(null); }
  };

  const triggerDownload = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      <div className="px-4 pt-6">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT COLLECTIONS</p>
        <h1 className="text-2xl font-display tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" /> Seus benchmarks
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Compartilhe suas conquistas · +20 XP por share</p>
      </div>

      {loading && (
        <div className="p-10 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      {!loading && benchmarks.length === 0 && (
        <div className="mx-4 mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-muted-foreground">
          Treine mais alguns dias para desbloquear seus primeiros benchmarks compartilháveis.
        </div>
      )}

      <div className="px-4 mt-6 space-y-4">
        {benchmarks.map((b) => {
          const Icon = b.icon;
          const accent = b.template?.accent_color || "#FF6A00";
          return (
            <div key={b.tipo} className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
              {/* Card renderizável (mockup) */}
              <div
                ref={(el) => { refs.current[b.tipo] = el; }}
                className="relative aspect-[9/12] w-full flex flex-col justify-between p-6 text-white"
                style={{ background: `linear-gradient(160deg, #000 0%, ${accent}22 55%, #000 100%)` }}
              >
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-white/20" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 grid place-items-center text-sm font-bold">
                      {(athleteName || "9F").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] tracking-[0.4em] uppercase opacity-70">{b.template?.name || "Achievement"}</p>
                    <p className="text-sm font-semibold">{athleteName || "Atleta"}</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 rounded-2xl grid place-items-center mb-4" style={{ background: `${accent}33`, border: `1px solid ${accent}` }}>
                    <Icon className="w-8 h-8" style={{ color: accent }} />
                  </div>
                  <p className="text-3xl font-display leading-tight">{b.dado}</p>
                </div>
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] opacity-80">
                  <span>{new Date().toLocaleDateString("pt-BR")}</span>
                  <span className="font-bold" style={{ color: accent }}>9FIT PRO</span>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{b.template?.name || "Compartilhar conquista"}</p>
                <button onClick={() => share(b)} disabled={sharing === b.tipo}
                  className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-bold flex items-center gap-2 disabled:opacity-40">
                  {sharing === b.tipo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                  Compartilhar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <BottomNavigation />
    </div>
  );
}
